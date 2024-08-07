import * as core from '@actions/core'
import {RestEndpointMethodTypes} from '@octokit/rest'
import moment from 'moment'
import {Property, Sort} from './types'
import {Commits, DiffInfo, filterCommits} from './commits'
import {Options} from './prCollector'
import {BaseRepository} from '../repositories/BaseRepository'

export interface PullRequestInfo {
  number: number
  title: string
  htmlURL: string
  baseBranch: string
  branch?: string
  createdAt: moment.Moment
  mergedAt: moment.Moment | undefined
  mergeCommitSha: string
  author: string
  authorName: string
  repoName: string
  labels: string[]
  milestone: string
  body: string
  assignees: string[]
  requestedReviewers: string[]
  approvedReviewers: string[]
  reviews?: CommentInfo[]
  status: 'open' | 'merged'
}

export interface CommentInfo {
  id: number
  htmlURL: string
  submittedAt: moment.Moment | undefined
  author: string
  body: string
  state: string | undefined
}

export const EMPTY_PULL_REQUEST_INFO: PullRequestInfo = {
  number: 0,
  title: '',
  htmlURL: '',
  baseBranch: '',
  mergedAt: undefined,
  createdAt: moment(),
  mergeCommitSha: '',
  author: '',
  authorName: '',
  repoName: '',
  labels: [],
  milestone: '',
  body: '',
  assignees: [],
  requestedReviewers: [],
  approvedReviewers: [],
  status: 'open'
}

export const EMPTY_COMMENT_INFO: CommentInfo = {
  id: 0,
  htmlURL: '',
  submittedAt: undefined,
  author: '',
  body: '',
  state: undefined
}

export type PullData = RestEndpointMethodTypes['pulls']['get']['response']['data']

export type PullsListData = RestEndpointMethodTypes['pulls']['list']['response']['data']

export type PullReviewsData = RestEndpointMethodTypes['pulls']['listReviews']['response']['data']

export class PullRequests {
  constructor(
    private repositoryUtils: BaseRepository,
    private commits: Commits
  ) {}

  async getForCommitHash(owner: string, repo: string, commit_sha: string, maxPullRequests: number): Promise<PullRequestInfo[]> {
    return sortPrs(await this.repositoryUtils.getForCommitHash(owner, repo, commit_sha, maxPullRequests))
  }

  async getBetweenDates(
    owner: string,
    repo: string,
    fromDate: moment.Moment,
    toDate: moment.Moment,
    maxPullRequests: number
  ): Promise<PullRequestInfo[]> {
    return sortPrs(await this.repositoryUtils.getBetweenDates(owner, repo, fromDate, toDate, maxPullRequests))
  }

  async getOpen(owner: string, repo: string, maxPullRequests: number): Promise<PullRequestInfo[]> {
    return sortPrs(await this.repositoryUtils.getOpen(owner, repo, maxPullRequests))
  }

  async getReviews(owner: string, repo: string, pr: PullRequestInfo): Promise<void> {
    await this.repositoryUtils.getReviews(owner, repo, pr)
  }

  async getMergedPullRequests(options: Options): Promise<[DiffInfo, PullRequestInfo[]]> {
    const {owner, repo, includeOpen, fetchReviewers, fetchReviews, configuration} = options

    const diffInfo = await this.commits.getCommitHistory(options)
    const commits = diffInfo.commitInfo
    if (commits.length === 0) {
      return [diffInfo, []]
    }

    const firstCommit = commits[0]
    const lastCommit = commits[commits.length - 1]
    let fromDate = moment.min(firstCommit.authorDate, firstCommit.commitDate) // get the lower date (e.g. if commits are modified)
    const toDate = moment.max(lastCommit.authorDate, lastCommit.commitDate) // ensure we get the higher date (e.g. in case of rebases)

    const maxDays = configuration.max_back_track_time_days
    const maxFromDate = toDate.clone().subtract(maxDays, 'days')
    if (maxFromDate.isAfter(fromDate)) {
      core.info(`⚠️ Adjusted 'fromDate' to go max ${maxDays} back`)
      fromDate = maxFromDate
    }

    core.info(`ℹ️ Fetching PRs between dates ${fromDate.toISOString()} to ${toDate.toISOString()} for ${owner}/${repo}`)

    const prCommits = filterCommits(commits, configuration.exclude_merge_branches)
    core.info(`ℹ️ Retrieved ${prCommits.length} release commits for ${owner}/${repo}`)

    // create array of commits for this release
    const releaseCommitHashes = prCommits.map(commit => {
      return commit.sha
    })

    let pullRequests: PullRequestInfo[]
    if (options.fetchViaCommits) {
      // fetch PRs based on commits instead (will get associated PRs per commit found)
      const prsForReleaseCommits: Map<number, PullRequestInfo> = new Map()
      for (const commit of prCommits) {
        const result = await this.getForCommitHash(owner, repo, commit.sha, configuration.max_pull_requests)
        for (const pr of result) {
          prsForReleaseCommits.set(pr.number, pr)
        }
      }
      const dedupedPrsForReleaseCommits = Array.from(prsForReleaseCommits.values())
      if (!includeOpen) {
        pullRequests = dedupedPrsForReleaseCommits.filter(pr => pr.status !== 'open')
        core.info(`ℹ️ Retrieved ${pullRequests.length} PRs for ${owner}/${repo} based on the release commit hashes`)
      } else {
        pullRequests = dedupedPrsForReleaseCommits
        core.info(`ℹ️ Retrieved ${pullRequests.length} PRs for ${owner}/${repo} based on the release commit hashes (including open)`)
      }
    } else {
      // fetch PRs based on the date range identified
      const pullRequestsBetweenDate = await this.getBetweenDates(owner, repo, fromDate, toDate, configuration.max_pull_requests)
      core.info(`ℹ️ Retrieved ${pullRequestsBetweenDate.length} PRs for ${owner}/${repo} in date range from API`)

      // filter out pull requests not associated with this release
      const mergedPullRequests = pullRequestsBetweenDate.filter(pr => {
        return releaseCommitHashes.includes(pr.mergeCommitSha)
      })

      core.info(`ℹ️ Retrieved ${mergedPullRequests.length} merged PRs for ${owner}/${repo}`)

      let allPullRequests = mergedPullRequests
      if (includeOpen) {
        // retrieve all open pull requests
        const openPullRequests = await this.getOpen(owner, repo, configuration.max_pull_requests)

        core.info(`ℹ️ Retrieved ${openPullRequests.length} open PRs for ${owner}/${repo}`)

        // all pull requests
        allPullRequests = allPullRequests.concat(openPullRequests)

        core.info(`ℹ️ Retrieved ${allPullRequests.length} total PRs for ${owner}/${repo}`)
      }
      pullRequests = allPullRequests
    }

    // retrieve base branches we allow
    const baseBranches = configuration.base_branches
    const baseBranchPatterns = baseBranches.map(baseBranch => {
      return new RegExp(baseBranch.replace('\\\\', '\\'), 'gu')
    })

    // return only prs if the baseBranch is matching the configuration
    const finalPrs = pullRequests.filter(pr => {
      if (baseBranches.length !== 0) {
        return baseBranchPatterns.some(pattern => {
          return pr.baseBranch.match(pattern) !== null
        })
      }
      return true
    })

    if (baseBranches.length !== 0) {
      core.info(`ℹ️ Retrieved ${finalPrs.length} PRs for ${owner}/${repo} filtered by the 'base_branches' configuration.`)
    }

    // fetch reviewers only if enabled (requires an additional API request per PR)
    if (fetchReviews || fetchReviewers) {
      core.info(`ℹ️ Fetching reviews (or reviewers) was enabled`)
      // update PR information with reviewers who approved
      for (const pr of finalPrs) {
        await this.getReviews(owner, repo, pr)

        const reviews = pr.reviews
        if (reviews && (reviews?.length || 0) > 0) {
          core.info(`ℹ️ Retrieved ${reviews.length || 0} review(s) for PR ${owner}/${repo}/#${pr.number}`)

          // backwards compatibility
          pr.approvedReviewers = reviews.filter(r => r.state === 'APPROVED').map(r => r.author)
        } else {
          core.debug(`No reviewer(s) for PR ${owner}/${repo}/#${pr.number}`)
        }
      }
    } else {
      core.debug(`ℹ️ Fetching reviews (or reviewers) was disabled`)
    }

    return [diffInfo, finalPrs]
  }
}

function sortPrs(pullRequests: PullRequestInfo[]): PullRequestInfo[] {
  return sortPullRequests(pullRequests, {
    order: 'ASC',
    on_property: 'mergedAt'
  })
}

export function sortPullRequests(pullRequests: PullRequestInfo[], sort: Sort | string): PullRequestInfo[] {
  let sortConfig: Sort

  // legacy handling to support string sort config
  if (typeof sort === 'string') {
    let order: 'ASC' | 'DESC' = 'ASC'
    if (sort.toUpperCase() === 'DESC') order = 'DESC'
    sortConfig = {order, on_property: 'mergedAt'}
  } else {
    sortConfig = sort
  }

  if (sortConfig.order === 'ASC') {
    pullRequests.sort((a, b) => {
      return compare(a, b, sortConfig)
    })
  } else {
    pullRequests.sort((b, a) => {
      return compare(a, b, sortConfig)
    })
  }
  return pullRequests
}

export function compare(a: PullRequestInfo, b: PullRequestInfo, sort: Sort): number {
  if (sort.on_property === 'mergedAt') {
    const aa = a.mergedAt || a.createdAt
    const bb = b.mergedAt || b.createdAt
    if (aa.isBefore(bb)) {
      return -1
    } else if (bb.isBefore(aa)) {
      return 1
    }
    return 0
  } else {
    // only else for now `label`
    return a.title.localeCompare(b.title)
  }
}

/**
 * Helper function to retrieve a property from the PullRequestInfo
 */
export function retrieveProperty(pr: PullRequestInfo, property: Property, useCase: string): string {
  let value: string | number | Set<string> | string[] | undefined = pr[property]
  if (value === undefined) {
    core.warning(`⚠️ the provided property '${property}' for \`${useCase}\` is not valid. Fallback to 'body'`)
    value = pr['body']
  } else if (value instanceof Set) {
    value = Array.from(value).join(',') // join into single string
  } else if (Array.isArray(value)) {
    value = value.join(',') // join into single string
  } else {
    value = value.toString()
  }
  return value
}
