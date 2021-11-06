import * as core from '@actions/core'
import * as github from '@actions/github'
import * as semver from 'semver'
import {Octokit, RestEndpointMethodTypes} from '@octokit/rest'
import {SemVer} from 'semver'
import {TagResolver} from './configuration'
import {createCommandManager} from './gitHelper'
import {RegexTransformer, validateTransformer} from './transform'

export interface TagResult {
  from: TagInfo | null
  to: TagInfo | null
}

export interface TagInfo {
  name: string
  commit: string
}

export interface SortableTagInfo extends TagInfo {
  tmp: string
}

export class Tags {
  constructor(private octokit: Octokit) {}

  async getTags(
    owner: string,
    repo: string,
    maxTagsToFetch: number
  ): Promise<TagInfo[]> {
    const tagsInfo: TagInfo[] = []
    const options = this.octokit.repos.listTags.endpoint.merge({
      owner,
      repo,
      direction: 'desc',
      per_page: 100
    })

    for await (const response of this.octokit.paginate.iterator(options)) {
      type TagsListData =
        RestEndpointMethodTypes['repos']['listTags']['response']['data']
      const tags: TagsListData = response.data as TagsListData

      for (const tag of tags) {
        tagsInfo.push({
          name: tag.name,
          commit: tag.commit.sha
        })
      }

      // for performance only fetch newest maxTagsToFetch tags!!
      if (tagsInfo.length >= maxTagsToFetch) {
        break
      }
    }

    core.info(
      `ℹ️ Found ${tagsInfo.length} (fetching max: ${maxTagsToFetch}) tags from the GitHub API for ${owner}/${repo}`
    )
    return tagsInfo
  }

  async findPredecessorTag(
    sortedTags: TagInfo[],
    repositoryPath: string,
    tag: string,
    ignorePreReleases: boolean
  ): Promise<TagInfo | null> {
    const tags = sortedTags
    try {
      const length = tags.length
      if (tags.length > 1) {
        for (let i = 0; i < length; i++) {
          if (
            tags[i].name.toLocaleLowerCase('en') === tag.toLocaleLowerCase('en')
          ) {
            if (ignorePreReleases) {
              core.info(
                `ℹ️ Enabled 'ignorePreReleases', searching for the closest release`
              )
              for (let ii = i + 1; ii < length; ii++) {
                if (!tags[ii].name.includes('-')) {
                  return tags[ii]
                }
              }
            }
            return tags[i + 1]
          }
        }
      } else {
        core.info(
          `ℹ️ Only one tag found for the given repository. Usually this is the case for the initial release.`
        )
        // if not specified try to retrieve tag from git
        const gitHelper = await createCommandManager(repositoryPath)
        const initialCommit = await gitHelper.initialCommit()
        core.info(
          `🔖 Resolved initial commit (${initialCommit}) from 'git rev-list --max-parents=0 HEAD'`
        )
        return {name: initialCommit, commit: initialCommit}
      }
      return tags[0]
    } catch (error) {
      if (tags.length <= 0) {
        core.warning(`⚠️ No tag found for the given repository`)
      }
      return null
    }
  }

  async retrieveRange(
    repositoryPath: string,
    owner: string,
    repo: string,
    fromTag: string | null,
    toTag: string | null,
    ignorePreReleases: boolean,
    maxTagsToFetch: number,
    tagResolver: TagResolver
  ): Promise<TagResult> {
    // filter out tags not matching the specified filter
    const filteredTags = filterTags(
      // retrieve the tags from the API
      await this.getTags(owner, repo, maxTagsToFetch),
      tagResolver
    )

    // check if a transformer was defined
    const tagTransformer = validateTransformer(tagResolver.transformer)

    let transformedTags: TagInfo[]
    if (tagTransformer != null) {
      core.debug(`ℹ️ Using configured tagTransformer`)
      transformedTags = transformTags(filteredTags, tagTransformer)
    } else {
      transformedTags = filteredTags
    }

    let tags = sortTags(transformedTags, tagResolver)

    if (tagTransformer != null) {
      // restore the original name, after sorting
      tags = filteredTags.map(function (tag) {
        if (tag.hasOwnProperty('tmp')) {
          return {name: (tag as SortableTagInfo).tmp, commit: tag.commit}
        } else {
          return tag
        }
      })
    }

    let resultToTag: TagInfo | null
    let resultFromTag: TagInfo | null

    // ensure to resolve the toTag if it was not provided
    if (!toTag) {
      // if not specified try to retrieve tag from github.context.ref
      if (github.context.ref?.startsWith('refs/tags/') === true) {
        toTag = github.context.ref.replace('refs/tags/', '')
        core.info(
          `🔖 Resolved current tag (${toTag}) from the 'github.context.ref'`
        )
        resultToTag = {
          name: toTag,
          commit: toTag
        }
      } else if (tags.length > 1) {
        resultToTag = tags[0]
        core.info(
          `🔖 Resolved current tag (${resultToTag.name}) from the tags git API`
        )
      } else {
        // if not specified try to retrieve tag from git
        const gitHelper = await createCommandManager(repositoryPath)
        const latestTag = await gitHelper.latestTag()
        core.info(
          `🔖 Resolved current tag (${latestTag}) from 'git rev-list --tags --skip=0 --max-count=1'`
        )
        resultToTag = {
          name: latestTag,
          commit: latestTag
        }
      }
    } else {
      resultToTag = {
        name: toTag,
        commit: toTag
      }
    }

    // ensure toTag is specified
    toTag = resultToTag.name

    // resolve the fromTag if not defined
    if (!fromTag) {
      core.debug(`fromTag undefined, trying to resolve via API`)

      resultFromTag = await this.findPredecessorTag(
        tags,
        repositoryPath,
        toTag,
        ignorePreReleases
      )

      if (resultFromTag != null) {
        core.info(
          `🔖 Resolved previous tag (${resultFromTag.name}) from the tags git API`
        )
      }
    } else {
      resultFromTag = {
        name: fromTag,
        commit: fromTag
      }
    }

    return {
      from: resultFromTag,
      to: resultToTag
    }
  }
}

/*
 * Uses the provided filter (if available) to filter out any tags not currently relevant.
 * https://github.com/mikepenz/release-changelog-builder-action/issues/566
 */
export function filterTags(
  tags: TagInfo[],
  tagResolver: TagResolver
): TagInfo[] {
  const filter = tagResolver.filter
  if (filter !== undefined) {
    const regex = new RegExp(
      filter.pattern.replace('\\\\', '\\'),
      filter.flags ?? 'gu'
    )
    const filteredTags = tags.filter(tag => tag.name.match(regex) !== null)
    core.debug(
      `ℹ️ Filtered tags count: ${filteredTags.length}, original count: ${tags.length}`
    )
    return filteredTags
  } else {
    return tags
  }
}

/**
 * Helper function to transform the tag name given the transformer
 */
function transformTags(
  tags: TagInfo[],
  transformer: RegexTransformer
): TagInfo[] {
  return tags.map(function (tag) {
    if (transformer.pattern) {
      const transformedName = tag.name.replace(
        transformer.pattern,
        transformer.target
      )
      core.debug(`ℹ️ Transformed ${tag.name} to ${transformedName}`)
      return {
        tmp: tag.name, // remember the original name
        name: transformedName,
        commit: tag.commit
      }
    } else {
      return tag
    }
  })
}

/*
  Sorts an array of tags as shown below:
  
  2020.4.0
  2020.4.0-rc02
  2020.3.2
  2020.3.1
  2020.3.1-rc03
  2020.3.1-rc02
  2020.3.1-rc01
  2020.3.1-b01
  2020.3.1-a01
  2020.3.0
  */
export function sortTags(tags: TagInfo[], tagResolver: TagResolver): TagInfo[] {
  if (tagResolver.method === 'sort') {
    return stringSorting(tags)
  } else {
    return semVerSorting(tags)
  }
}

function semVerSorting(tags: TagInfo[]): TagInfo[] {
  // filter out tags which do not follow semver
  const validatedTags = tags.filter(tag => {
    const isValid =
      semver.valid(tag.name, {
        includePrerelease: true,
        loose: true
      }) !== null
    if (!isValid) {
      core.debug(
        `⚠️ dropped tag ${tag.name} because it is not a valid semver tag`
      )
    }
    return isValid
  })

  // sort using semver
  validatedTags.sort((b, a) => {
    return new SemVer(a.name, {
      includePrerelease: true,
      loose: true
    }).compare(b.name)
  })
  return validatedTags
}

function stringSorting(tags: TagInfo[]): TagInfo[] {
  return tags.sort((b, a) => {
    const partsA = a.name.replace(/^v/, '').split('-')
    const partsB = b.name.replace(/^v/, '').split('-')
    const versionCompare = partsA[0].localeCompare(partsB[0])
    if (versionCompare !== 0) {
      return versionCompare
    } else {
      if (partsA.length === 1) {
        return 0
      } else if (partsB.length === 1) {
        return 1
      } else {
        return partsA[1].localeCompare(partsB[1])
      }
    }
  })
}
