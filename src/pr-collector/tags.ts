import * as core from '@actions/core'
import * as github from '@actions/github'
import * as semver from 'semver'
import {SemVer} from 'semver'
import {Regex, RegexTransformer, TagResolver} from './types'
import {createCommandManager} from './gitHelper'
import moment from 'moment'
import {transformStringToOptionalValue, transformStringToValue, validateRegex} from './regexUtils'
import {BaseRepository} from '../repositories/BaseRepository'

export interface TagResult {
  from: TagInfo | null
  to: TagInfo | null
}

export interface TagInfo {
  name: string
  commit?: string
  preRelease?: boolean
  date?: moment.Moment
}

export interface SortableTagInfo extends TagInfo {
  tmp: string
}

export class Tags {
  constructor(private repositoryUtils: BaseRepository) {}

  async getTags(owner: string, repo: string, maxTagsToFetch: number): Promise<TagInfo[]> {
    return this.repositoryUtils.getTags(owner, repo, maxTagsToFetch)
  }

  async fillTagInformation(repositoryPath: string, owner: string, repo: string, tagInfo: TagInfo): Promise<TagInfo> {
    return this.repositoryUtils.fillTagInformation(repositoryPath, owner, repo, tagInfo)
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
          if (tags[i].name.toLocaleLowerCase('en') === tag.toLocaleLowerCase('en')) {
            if (ignorePreReleases) {
              core.info(`ℹ️ Enabled 'ignorePreReleases', searching for the closest release`)
              for (let ii = i + 1; ii < length; ii++) {
                if (!tags[ii].preRelease) {
                  return tags[ii]
                }
              }
            }
            return tags[i + 1]
          }
        }
      } else {
        core.info(`ℹ️ Only one tag found for the given repository. Usually this is the case for the initial release.`)
        // if not specified try to retrieve tag from git
        const gitHelper = await createCommandManager(repositoryPath)
        const initialCommit = await gitHelper.initialCommit()
        core.info(`🔖 Resolved initial commit (${initialCommit}) from 'git rev-list --max-parents=0 HEAD'`)
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
    let tags: TagInfo[] = []

    if (!toTag || !fromTag) {
      const filterRegex = validateRegex(tagResolver.filter)

      // filter out tags not matching the specified filter
      const filteredTags = filterTags(
        // retrieve the tags from the API
        await this.getTags(owner, repo, maxTagsToFetch),
        filterRegex
      )

      // check if a transformer, legacy handling, transform single value input to array
      let tagTransfomers: Regex[] | undefined = undefined
      if (tagResolver.transformer !== undefined) {
        if (!Array.isArray(tagResolver.transformer)) {
          tagTransfomers = [tagResolver.transformer]
        } else {
          tagTransfomers = tagResolver.transformer
        }
      }

      let transformed = false
      let transformedTags: TagInfo[] = filteredTags
      if (tagTransfomers !== undefined && tagTransfomers.length > 0) {
        for (const transformer of tagTransfomers) {
          const tagTransformer = validateRegex(transformer)
          if (tagTransformer != null) {
            core.debug(`ℹ️ Using configured tagTransformer (${transformer.pattern})`)
            transformedTags = transformTags(transformedTags, tagTransformer)
            transformed = true
          }
        }
      }

      // sort tags, apply additional information (e.g. if tag is a pre release)
      tags = prepareAndSortTags(transformedTags, tagResolver)

      if (transformed) {
        // restore the original name, after sorting
        tags = filteredTags.map(function (tag) {
          if (tag.hasOwnProperty('tmp')) {
            return {name: (tag as SortableTagInfo).tmp, commit: tag.commit}
          } else {
            return tag
          }
        })
      }
    }

    let resultToTag: TagInfo | null
    let resultFromTag: TagInfo | null

    // ensure to resolve the toTag if it was not provided
    if (!toTag) {
      // if not specified try to retrieve tag from github.context.ref
      if (github.context.ref?.startsWith('refs/tags/') === true) {
        toTag = github.context.ref.replace('refs/tags/', '')
        core.info(`🔖 Resolved current tag (${toTag}) from the 'github.context.ref'`)
        resultToTag = {
          name: toTag,
          commit: toTag
        }
      } else if (tags.length > 1) {
        resultToTag = tags[0]
        core.info(`🔖 Resolved current tag (${resultToTag.name}) from the tags git API`)
      } else {
        // if not specified try to retrieve tag from git
        const gitHelper = await createCommandManager(repositoryPath)
        const latestTag = await gitHelper.latestTag()
        core.info(`🔖 Resolved current tag (${latestTag}) from 'git rev-list --tags --skip=0 --max-count=1'`)
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

      resultFromTag = await this.findPredecessorTag(tags, repositoryPath, toTag, ignorePreReleases)

      if (resultFromTag != null) {
        core.info(`🔖 Resolved previous tag (${resultFromTag.name}) from the tags git API`)
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
export function filterTags(tags: TagInfo[], filterRegex: RegexTransformer | null): TagInfo[] {
  if (filterRegex !== null) {
    const filteredTags = tags.filter(tag => transformStringToOptionalValue(tag.name, filterRegex) !== null)
    core.debug(`ℹ️ Filtered tags count: ${filteredTags.length}, original count: ${tags.length}`)
    return filteredTags
  } else {
    return tags
  }
}

/**
 * Helper function to transform the tag name given the transformer
 */
export function transformTags(tags: TagInfo[], transformer: RegexTransformer): TagInfo[] {
  return tags.map(function (tag) {
    if (transformer.pattern) {
      const transformedName = transformStringToValue(tag.name, transformer)
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
export function prepareAndSortTags(tags: TagInfo[], tagResolver: TagResolver): TagInfo[] {
  if (tagResolver.method === 'sort') {
    return stringTags(tags)
  } else {
    // semver is default
    return semVerTags(tags)
  }
}

function semVerTags(tags: TagInfo[]): TagInfo[] {
  // filter out tags which do not follow semver
  const validatedTags = tags.filter(tag => {
    const isValid =
      semver.valid(tag.name, {
        loose: true
      }) !== null
    if (!isValid) {
      core.debug(`⚠️ dropped tag ${tag.name} because it is not a valid semver tag`)
    } else {
      tag.preRelease =
        semver.prerelease(tag.name, {
          loose: true
        }) != null
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

function stringTags(tags: TagInfo[]): TagInfo[] {
  for (const tag of tags) {
    tag.preRelease = tag.name.includes('-')
  }

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
