import {Octokit, RestEndpointMethodTypes} from '@octokit/rest'
import * as core from '@actions/core'
import * as semver from 'semver'
import {SemVer} from 'semver'
import {TagResolver} from './configuration'

export interface TagInfo {
  name: string
  commit: string
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
      type TagsListData = RestEndpointMethodTypes['repos']['listTags']['response']['data']
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
    owner: string,
    repo: string,
    tag: string,
    ignorePreReleases: boolean,
    maxTagsToFetch: number,
    tagResolver: TagResolver
  ): Promise<TagInfo | null> {
    const tags = sortTags(
      await this.getTags(owner, repo, maxTagsToFetch),
      tagResolver
    )

    try {
      const length = tags.length
      for (let i = 0; i < length; i++) {
        if (tags[i].name.toLowerCase() === tag.toLowerCase()) {
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
      return tags[0]
    } catch (error) {
      return null
    }
  }
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
