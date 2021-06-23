import {Octokit, RestEndpointMethodTypes} from '@octokit/rest'
import moment from 'moment'

import * as core from '@actions/core'
import {Unpacked} from './utils'

export interface PullRequestInfo {
  number: number
  title: string
  htmlURL: string
  baseBranch: string
  mergedAt: moment.Moment
  mergeCommitSha: string
  author: string
  repoName: string
  labels: Set<string>
  milestone: string
  body: string
  assignees: string[]
  requestedReviewers: string[]
}

type PullData = RestEndpointMethodTypes['pulls']['get']['response']['data']

type PullsListData =
  RestEndpointMethodTypes['pulls']['list']['response']['data']

export class PullRequests {
  constructor(private octokit: Octokit) {}

  async getSingle(
    owner: string,
    repo: string,
    prNumber: number
  ): Promise<PullRequestInfo | null> {
    try {
      const {data} = await this.octokit.pulls.get({
        owner,
        repo,
        pull_number: prNumber
      })

      return mapPullRequest(data)
    } catch (e) {
      core.warning(
        `⚠️ Cannot find PR ${owner}/${repo}#${prNumber} - ${e.message}`
      )
      return null
    }
  }

  async getBetweenDates(
    owner: string,
    repo: string,
    fromDate: moment.Moment,
    toDate: moment.Moment,
    maxPullRequests: number
  ): Promise<PullRequestInfo[]> {
    const mergedPRs: PullRequestInfo[] = []
    const options = this.octokit.pulls.list.endpoint.merge({
      owner,
      repo,
      state: 'closed',
      sort: 'updated',
      per_page: '100',
      direction: 'desc'
    })

    for await (const response of this.octokit.paginate.iterator(options)) {
      const prs: PullsListData = response.data as PullsListData

      for (const pr of prs.filter(p => !!p.merged_at)) {
        mergedPRs.push(mapPullRequest(pr))
      }

      const firstPR = prs[0]
      if (
        firstPR === undefined ||
        (firstPR.merged_at && fromDate.isAfter(moment(firstPR.merged_at))) ||
        mergedPRs.length >= maxPullRequests
      ) {
        if (mergedPRs.length >= maxPullRequests) {
          core.warning(`⚠️ Reached 'maxPullRequests' count ${maxPullRequests}`)
        }

        // bail out early to not keep iterating on PRs super old
        return sortPullRequests(mergedPRs, true)
      }
    }

    return sortPullRequests(mergedPRs, true)
  }
}

export function sortPullRequests(
  pullRequests: PullRequestInfo[],
  ascending: Boolean
): PullRequestInfo[] {
  if (ascending) {
    pullRequests.sort((a, b) => {
      if (a.mergedAt.isBefore(b.mergedAt)) {
        return -1
      } else if (b.mergedAt.isBefore(a.mergedAt)) {
        return 1
      }
      return 0
    })
  } else {
    pullRequests.sort((b, a) => {
      if (a.mergedAt.isBefore(b.mergedAt)) {
        return -1
      } else if (b.mergedAt.isBefore(a.mergedAt)) {
        return 1
      }
      return 0
    })
  }
  return pullRequests
}

const mapPullRequest = (
  pr: PullData | Unpacked<PullsListData>
): PullRequestInfo => ({
  number: pr.number,
  title: pr.title,
  htmlURL: pr.html_url,
  baseBranch: pr.base.ref,
  mergedAt: moment(pr.merged_at),
  mergeCommitSha: pr.merge_commit_sha || '',
  author: pr.user?.login || '',
  repoName: pr.base.repo.full_name,
  labels: new Set(
    pr.labels?.map(function (label) {
      return label.name?.toLowerCase() || ''
    }) || []
  ),
  milestone: pr.milestone?.title || '',
  body: pr.body || '',
  assignees:
    pr.assignees?.map(function (asignee) {
      return asignee?.login || ''
    }) || [],
  requestedReviewers:
    pr.requested_reviewers?.map(function (reviewer) {
      return reviewer?.login || ''
    }) || []
})
