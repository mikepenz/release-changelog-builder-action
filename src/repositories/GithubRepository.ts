import {BaseRepository} from './BaseRepository'
import {Octokit, RestEndpointMethodTypes} from '@octokit/rest'
import {HttpsProxyAgent} from 'https-proxy-agent'
import * as core from '@actions/core'
import {TagInfo} from '../pr-collector/tags'
import moment from 'moment/moment'
import {DiffInfo} from '../pr-collector/commits'
import {CommentInfo, PullData, PullRequestInfo, PullReviewsData, PullsListData} from '../pr-collector/pullRequests'
import {Unpacked} from '../pr-collector/utils'

export class GithubRepository extends BaseRepository {
  async getDiffRemote(owner: string, repo: string, base: string, head: string): Promise<DiffInfo> {
    let changedFilesCount = 0
    let additionCount = 0
    let deletionCount = 0
    let changeCount = 0
    let commitCount = 0

    // Fetch comparisons recursively until we don't find any commits
    // This is because the GitHub API limits the number of commits returned in a single response.
    let commits: RestEndpointMethodTypes['repos']['compareCommits']['response']['data']['commits'] = []
    let compareHead = head
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const compareResult = await this.octokit.repos.compareCommits({
        owner,
        repo,
        base,
        head: compareHead
      })
      if (compareResult.data.total_commits === 0) {
        break
      }
      changedFilesCount += compareResult.data.files?.length ?? 0
      const files = compareResult.data.files
      if (files !== undefined) {
        for (const file of files) {
          additionCount += file.additions
          deletionCount += file.deletions
          changeCount += file.changes
        }
      }
      commitCount += compareResult.data.commits.length
      commits = compareResult.data.commits.concat(commits)
      compareHead = `${commits[0].sha}^`
    }

    core.info(`ℹ️ Found ${commits.length} commits from the GitHub API for ${owner}/${repo}`)

    return {
      changedFiles: changedFilesCount,
      additions: additionCount,
      deletions: deletionCount,
      changes: changeCount,
      commits: commitCount,
      commitInfo: commits
        .filter(commit => commit.sha)
        .map(commit => ({
          sha: commit.sha || '',
          summary: commit.commit.message.split('\n')[0],
          message: commit.commit.message,
          author: commit.author?.login || commit.commit.author?.name || '',
          authorName: commit.commit.author?.name || '',
          authorDate: moment(commit.commit.author?.date),
          committer: commit.committer?.login || '',
          committerName: commit.committer?.name || '',
          commitDate: moment(commit.commit.committer?.date),
          prNumber: undefined
        }))
    }
  }

  async getForCommitHash(owner: string, repo: string, commit_sha: string, maxPullRequests: number): Promise<PullRequestInfo[]> {
    const mergedPRs: PullRequestInfo[] = []
    const options = this.octokit.repos.listPullRequestsAssociatedWithCommit.endpoint.merge({
      owner,
      repo,
      commit_sha,
      per_page: `${Math.min(10, maxPullRequests)}`,
      direction: 'desc'
    })

    for await (const response of this.octokit.paginate.iterator(options)) {
      const prs: PullsListData = response.data as PullsListData

      for (const pr of prs) {
        mergedPRs.push(this.mapPullRequest(pr, pr.merged_at ? 'merged' : 'open'))
      }
    }
    return mergedPRs
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
      per_page: `${Math.min(100, maxPullRequests)}`,
      direction: 'desc'
    })
    for await (const response of this.octokit.paginate.iterator(options)) {
      const prs: PullsListData = response.data as PullsListData

      for (const pr of prs.filter(p => !!p.merged_at)) {
        mergedPRs.push(this.mapPullRequest(pr, 'merged'))
      }
      if (mergedPRs.length >= maxPullRequests) {
        core.warning(`⚠️ Reached 'maxPullRequests' count ${maxPullRequests} (1)`)
        break // bail out early to not keep iterating forever
      } else if (prs.length > 0) {
        if (this.fetchedEnough(prs, fromDate)) {
          return mergedPRs // bail out early to not keep iterating on PRs super old
        }
      } else {
        core.debug(`⚠️ No more PRs retrieved from API. Fetched so far: ${mergedPRs.length}`)
        break
      }
    }
    return mergedPRs
  }

  async getOpen(owner: string, repo: string, maxPullRequests: number): Promise<PullRequestInfo[]> {
    const openPrs: PullRequestInfo[] = []
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
        openPrs.push(this.mapPullRequest(pr, 'open'))
      }

      const firstPR = prs[0]
      if (firstPR === undefined || openPrs.length >= maxPullRequests) {
        if (openPrs.length >= maxPullRequests) {
          core.warning(`⚠️ Reached 'maxPullRequests' count ${maxPullRequests} (2)`)
        }
        break // bail out early to not keep iterating forever
      }
    }
    return openPrs
  }

  async getReviews(owner: string, repo: string, pr: PullRequestInfo): Promise<void> {
    const options = this.octokit.pulls.listReviews.endpoint.merge({
      owner,
      repo,
      pull_number: pr.number,
      sort: 'created',
      direction: 'desc'
    })
    const prReviews: CommentInfo[] = []
    for await (const response of this.octokit.paginate.iterator(options)) {
      const comments: PullReviewsData = response.data as PullReviewsData

      for (const comment of comments) {
        prReviews.push(this.mapComment(comment))
      }
    }
    pr.reviews = prReviews
  }

  get defaultUrl(): string {
    return 'https://api.github.com'
  }

  get homeUrl(): string {
    return this.url?.replace('api.', '') || 'https://github.com'
  }

  private octokit: Octokit

  constructor(token: string, url: string | undefined, repositoryPath: string) {
    super(token, url, repositoryPath)
    this.url = url || this.defaultUrl

    // load octokit instance
    this.octokit = new Octokit({
      auth: `token ${this.token}`,
      baseUrl: this.url
    })
    if (this.proxy) {
      const agent = new HttpsProxyAgent(this.proxy)
      this.octokit.hook.before('request', options => {
        if (this.noProxyArray.includes(options.request.hostname)) {
          return
        }
        options.request.agent = agent
      })
    }
  }

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

    core.info(`ℹ️ Found ${tagsInfo.length} (fetching max: ${maxTagsToFetch}) tags from the GitHub API for ${owner}/${repo}`)
    return tagsInfo
  }

  async fillTagInformation(repositoryPath: string, owner: string, repo: string, tagInfo: TagInfo): Promise<TagInfo> {
    const options = this.octokit.repos.getReleaseByTag.endpoint.merge({
      owner,
      repo,
      tag: tagInfo.name
    })

    try {
      const response = await this.octokit.request(options)
      type ReleaseInformation = RestEndpointMethodTypes['repos']['getReleaseByTag']['response']['data']

      const release: ReleaseInformation = response.data as ReleaseInformation
      tagInfo.date = moment(release.created_at)
      core.info(`ℹ️ Retrieved information about the release associated with ${tagInfo.name} from the GitHub API`)
    } catch (error) {
      tagInfo = await this.getTagByCreateTime(repositoryPath, tagInfo)
    }
    return tagInfo
  }

  // helper function to add a special open label to prs not merged.
  private attachSpecialLabels(status: 'open' | 'merged', labels: string[]): string[] {
    labels.push(`--rcba-${status}`)
    return labels
  }

  private mapPullRequest = (pr: PullData | Unpacked<PullsListData>, status: 'open' | 'merged' = 'open'): PullRequestInfo => ({
    number: pr.number,
    title: pr.title,
    htmlURL: pr.html_url,
    baseBranch: pr.base.ref,
    branch: pr.head.ref,
    createdAt: moment(pr.created_at),
    mergedAt: pr.merged_at ? moment(pr.merged_at) : undefined,
    mergeCommitSha: pr.merge_commit_sha || '',
    author: pr.user?.login || '',
    authorName: pr.user?.name || '',
    repoName: pr.base.repo.full_name,
    labels: this.attachSpecialLabels(status, pr.labels?.map(lbl => lbl.name?.toLocaleLowerCase('en') || '') || []),
    milestone: pr.milestone?.title || '',
    body: pr.body || '',
    assignees: pr.assignees?.map(assignee => assignee?.login || '') || [],
    requestedReviewers: pr.requested_reviewers?.map(reviewer => reviewer?.login || '') || [],
    approvedReviewers: [],
    reviews: undefined,
    status
  })

  private mapComment = (comment: Unpacked<PullReviewsData>): CommentInfo => ({
    id: comment.id,
    htmlURL: comment.html_url,
    submittedAt: comment.submitted_at ? moment(comment.submitted_at) : undefined,
    author: comment.user?.login || '',
    body: comment.body,
    state: comment.state
  })

  private fetchedEnough(pullRequests: PullsListData, fromDate: moment.Moment): boolean {
    for (let i = 0; i < Math.min(pullRequests.length, 3); i++) {
      // we get PRs paged by updated timestamp, there is a chance that PRs come out of merged order as a result of this
      // ensure we get enough PRs to cover the expected spectrum.
      const firstPR = pullRequests[i]
      if (!firstPR.updated_at) {
        // no updated_at timestamp -> look for the next
      } else if (fromDate.isAfter(moment(firstPR.updated_at))) {
        return true
      } else {
        break // not enough PRs yet, go further
      }
    }
    return false
  }
}
