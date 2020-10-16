import {Octokit, RestEndpointMethodTypes} from '@octokit/rest'
import * as core from '@actions/core'

export interface TagInfo {
  name: string
  commit: string
}

export class Tags {
  constructor(private octokit: Octokit) {}

  async getTags(owner: string, repo: string, maxTagsToFetch: number): Promise<TagInfo[]> {
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
      `Found ${tagsInfo.length} (fetching max: ${maxTagsToFetch}) tags from the GitHub API for ${owner}/${repo}`
    )
    return tagsInfo
  }

  async findPredecessorTag(
    owner: string,
    repo: string,
    tag: string, 
    maxTagsToFetch: number
  ): Promise<TagInfo | null> {
    const tags = this.sortTags(await this.getTags(owner, repo, maxTagsToFetch))

    const length = tags.length
    for (let i = 0; i < length; i++) {
      if (tags[i].name.toLowerCase() === tag.toLowerCase()) {
        return tags[i + 1]
      }
    }

    // not found, throw exception?
    return tags[0]
  }

  private sortTags(commits: TagInfo[]): TagInfo[] {
    commits.sort((b, a) => {
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
    return commits
  }
}

/*

2020.3.2 ( should resolve 2020.3.1 )

2020.4.0
2020.4.0-rc02

2020.3.1
2020.3.1-rc03
2020.3.1-rc02
2020.3.1-rc01
2020.3.1-b01
2020.3.1-a01

2020.3.0
*/
