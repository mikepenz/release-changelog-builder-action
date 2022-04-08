import * as core from '@actions/core'
import {Octokit, RestEndpointMethodTypes} from '@octokit/rest'
import {Unpacked} from './utils'
import moment from 'moment'

export interface PullRequestInfo {
  number: number
  title: string
  htmlURL: string
  baseBranch: string
  createdAt: moment.Moment
  mergedAt: moment.Moment | null
  mergeCommitSha: string
  author: string
  repoName: string
  labels: Set<string>
  milestone: string
  body: string
  assignees: string[]
  requestedReviewers: string[]
  status: 'open' | 'merged'
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
    } catch (e: any /* eslint-disable-line @typescript-eslint/no-explicit-any */) {
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
      sort: 'merged',
      per_page: '100',
      direction: 'desc'
    })

    for await (const response of this.octokit.paginate.iterator(options)) {
      const prs: PullsListData = response.data as PullsListData

      for (const pr of prs.filter(p => !!p.merged_at)) {
        mergedPRs.push(mapPullRequest(pr, 'merged'))
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

  async getOpen(
    owner: string,
    repo: string,
    maxPullRequests: number
  ): Promise<PullRequestInfo[]> {
    const mergedPRs: PullRequestInfo[] = []
    const options = this.octokit.pulls.list.endpoint.merge({
      owner,
      repo,
      state: 'open',
      sort: 'created',
      per_page: '100',
      direction: 'desc'
    })

    for await (const response of this.octokit.paginate.iterator(options)) {
      const prs: PullsListData = response.data as PullsListData

      for (const pr of prs) {
        mergedPRs.push(mapPullRequest(pr, 'open'))
      }

      const firstPR = prs[0]
      if (firstPR === undefined || mergedPRs.length >= maxPullRequests) {
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
      const aa = a.mergedAt || a.createdAt
      const bb = b.mergedAt || b.createdAt
      if (aa.isBefore(bb)) {
        return -1
      } else if (bb.isBefore(aa)) {
        return 1
      }
      return 0
    })
  } else {
    pullRequests.sort((b, a) => {
      const aa = a.mergedAt || a.createdAt
      const bb = b.mergedAt || b.createdAt
      if (aa.isBefore(bb)) {
        return -1
      } else if (bb.isBefore(aa)) {
        return 1
      }
      return 0
    })
  }
  return pullRequests
}

// helper function to add a special open label to prs not merged.
function addOpenLabel(labels: Set<string>): Set<string> {
  labels.add('##rcba-open')
  return labels
}

const mapPullRequest = (
  pr: PullData | Unpacked<PullsListData>,
  status: 'open' | 'merged' = 'open'
): PullRequestInfo => ({
  number: pr.number,
  title: pr.title,
  htmlURL: pr.html_url,
  baseBranch: pr.base.ref,
  createdAt: moment(pr.created_at),
  mergedAt: pr.merged_at ? moment(pr.merged_at) : null,
  mergeCommitSha: pr.merge_commit_sha || '',
  author: pr.user?.login || '',
  repoName: pr.base.repo.full_name,
  labels: addOpenLabel(
    new Set(
      pr.labels?.map(lbl => lbl.name?.toLocaleLowerCase('en') || '') || []
    )
  ),
  milestone: pr.milestone?.title || '',
  body: pr.body || '',
  assignees: pr.assignees?.map(asignee => asignee?.login || '') || [],
  requestedReviewers:
    pr.requested_reviewers?.map(reviewer => reviewer?.login || '') || [],
  status
})
