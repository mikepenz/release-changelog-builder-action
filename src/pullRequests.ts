import {Octokit, RestEndpointMethodTypes} from '@octokit/rest'
import moment from 'moment'

import {CommitInfo} from './commits'
import * as core from '@actions/core'

export interface PullRequestInfo {
  number: number
  title: string
  htmlURL: string
  mergedAt: moment.Moment
  mergeCommitSha: string
  author: string
  repoName: string
  labels: string[]
  milestone: string
  body: string
  assignees: string[]
  requestedReviewers: string[]
}

export class PullRequests {
  constructor(private octokit: Octokit) {}

  async getSingle(
    owner: string,
    repo: string,
    prNumber: number
  ): Promise<PullRequestInfo | null> {
    try {
      const pr = await this.octokit.pulls.get({
        owner,
        repo,
        pull_number: prNumber
      })

      return {
        number: pr.data.number,
        title: pr.data.title,
        htmlURL: pr.data.html_url,
        mergedAt: moment(pr.data.merged_at),
        mergeCommitSha: pr.data.merge_commit_sha || '',
        author: pr.data.user?.login || '',
        repoName: pr.data.base.repo.full_name,
        labels:
          pr.data.labels?.map(function (label) {
            return label.name || ''
          }) || [],
        milestone: pr.data.milestone?.title || '',
        body: pr.data.body || '',
        assignees:
          pr.data.assignees?.map(function (asignee) {
            return asignee?.login || ''
          }) || [],
        requestedReviewers:
          pr.data.requested_reviewers?.map(function (reviewer) {
            return reviewer?.login || ''
          }) || []
      }
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
      type PullsListData = RestEndpointMethodTypes['pulls']['list']['response']['data']
      const prs: PullsListData = response.data as PullsListData

      for (const pr of prs.filter(p => !!p.merged_at)) {
        mergedPRs.push({
          number: pr.number,
          title: pr.title,
          htmlURL: pr.html_url,
          mergedAt: moment(pr.merged_at),
          mergeCommitSha: pr.merge_commit_sha || '',
          author: pr.user?.login || '',
          repoName: pr.base.repo.full_name,
          labels:
            pr.labels?.map(function (label) {
              return label.name || ''
            }) || [],
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
      }

      const firstPR = prs[0]
      if (
        firstPR === undefined ||
        (firstPR.merged_at && fromDate.isAfter(moment(firstPR.merged_at))) ||
        mergedPRs.length >= maxPullRequests
      ) {
        if (mergedPRs.length >= maxPullRequests) {
          core.info(`⚠️ Reached 'maxPullRequests' count ${maxPullRequests}`)
        }

        // bail out early to not keep iterating on PRs super old
        return sortPullRequests(mergedPRs, true)
      }
    }

    return sortPullRequests(mergedPRs, true)
  }

  /**
   * Filters out all commits which match the exclude pattern
   */
  filterCommits(
    commits: CommitInfo[],
    excludeMergeBranches: string[]
  ): CommitInfo[] {
    const filteredCommits = []

    for (const commit of commits) {
      if (excludeMergeBranches) {
        let matched = false
        for (const excludeMergeBranch of excludeMergeBranches) {
          if (commit.summary.includes(excludeMergeBranch)) {
            matched = true
            break
          }
        }
        if (matched) {
          continue
        }
      }
      filteredCommits.push(commit)
    }

    return filteredCommits
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
