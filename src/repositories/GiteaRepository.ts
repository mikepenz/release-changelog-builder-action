import {BaseRepository} from './BaseRepository.js'
import {TagInfo} from '../pr-collector/tags.js'
import {CommentInfo, PullRequestInfo} from '../pr-collector/pullRequests.js'
import {DiffInfo} from '../pr-collector/commits.js'
import {Api, PullRequest, PullReview, giteaApi} from 'gitea-js'
import moment from 'moment'
import * as core from '@actions/core'
import {createCommandManager} from '../pr-collector/gitHelper.js'

interface Pulls {
  closed: PullRequest[]
  open: PullRequest[]
}

export class GiteaRepository extends BaseRepository {
  private api: Api<unknown>

  get defaultUrl(): string {
    return 'https://gitea.com'
  }

  get homeUrl(): string {
    return 'https://gitea.com'
  }

  constructor(token: string, url: string | undefined, repositoryPath: string) {
    super(token, url, repositoryPath)
    this.url = url || this.defaultUrl
    this.api = giteaApi(this.url, {
      token
    })
  }

  async fillTagInformation(repositoryPath: string, owner: string, repo: string, tagInfo: TagInfo): Promise<TagInfo> {
    const response = await this.api.repos.repoGetTag(owner, repo, tagInfo.name)

    if (response.error === null) {
      if (response.data.commit) {
        tagInfo.date = moment(response.data.commit.created)
        core.info(`ℹ️ Retrieved information about the release associated with ${tagInfo.name} from the Gitea API`)
        return tagInfo
      }
    }
    return await this.getTagByCreateTime(repositoryPath, tagInfo)
  }

  async getBetweenDates(
    owner: string,
    repo: string,
    fromDate: moment.Moment,
    toDate: moment.Moment,
    maxPullRequests: number
  ): Promise<PullRequestInfo[]> {
    const mergedPRs: PullRequestInfo[] = []
    await this.getAllPullRequest(owner, repo, 'closed', maxPullRequests)

    for (const pr of GiteaRepository.pulls.closed.filter(p => !!p.merged_at)) {
      if (moment(pr.closed_at) > fromDate && moment(pr.closed_at) < toDate) {
        mergedPRs.push(this.mapPullRequest(pr, 'merged'))
      }
    }

    return mergedPRs
  }

  private mapPullRequest(pr: PullRequest, status: 'open' | 'merged' = 'open'): PullRequestInfo {
    return {
      number: pr.number || 0,
      title: pr.title || '',
      htmlURL: pr.html_url || '',
      baseBranch: pr.base?.repo?.default_branch || '',
      branch: pr.merge_base || '',
      mergedAt: pr.merged_at ? moment(pr.merged_at) : undefined,
      mergeCommitSha: pr.merge_commit_sha || '',
      author: pr.user?.login || '',
      authorName: pr.user?.full_name || '',
      repoName: pr.base?.repo?.full_name || '',
      labels: pr.labels?.map(label => label.name?.toLowerCase()) as string[],
      milestone: pr.milestone?.title || '',
      body: pr.body || '',
      assignees: pr.assignees?.map(user => user.full_name) as string[],
      requestedReviewers: pr.requested_reviewers?.map(user => user.full_name) as string[],
      approvedReviewers: [],
      createdAt: moment(pr.created_at),
      status,
      reviews: undefined
    }
  }

  /**
   * WARNING: This does not actually get the diff from the remote, as Gitea does not offer a compareable API.
   * This uses the local repository to get the diff. NOTE: As such, gitea integration requires the repo available.
   */
  async getDiffRemote(owner: string, repo: string, base: string, head: string, includeOnlyPaths?: string[] | null): Promise<DiffInfo> {
    const gitHelper = await createCommandManager(this.repositoryPath)

    // Add path filtering if specified
    if (includeOnlyPaths) {
      core.info(`ℹ️ Path filtering enabled with patterns: ${includeOnlyPaths.join(', ')}`)
    }

    // Get diff stats
    const diffStats = await gitHelper.getDiffStats(base, head, includeOnlyPaths);

    // Get commits
    const commitInfo = await gitHelper.getCommitsBetween(base, head, includeOnlyPaths);

    return {
      changedFiles: diffStats.changedFiles,
      additions: diffStats.additions,
      deletions: diffStats.deletions,
      changes: diffStats.changes,
      commits: commitInfo.count,
      commitInfo: commitInfo.commits.map(commit => ({
        sha: commit.sha,
        summary: commit.subject.split('\n')[0],
        message: commit.message,
        author: commit.author,
        authorName: commit.authorName,
        authorDate: moment(commit.authorDate),
        committer: "",
        committerName: "",
        commitDate: moment(commit.authorDate),
        prNumber: undefined
      }))
    }
  }

  static pulls: Pulls = {
    closed: [],
    open: []
  }

  private async getAllPullRequest(owner: string, repo: string, state: 'closed' | 'open', maxPullRequests: number): Promise<void> {
    if (GiteaRepository.pulls[state].length === 0) {
      let page = 1
      let count = 0
      while (count < maxPullRequests) {
        const limit = Math.min(50, maxPullRequests)
        const response = await this.api.repos.repoListPullRequests(owner, repo, {
          sort: 'recentupdate',
          state,
          limit,
          page
        })
        if (response.error === null) {
          GiteaRepository.pulls[state].push(...response.data)
        } else {
          core.error(`ℹ️ Some errors. ${response.error.message}`)
        }
        page++
        count += response.data.length
        if (response.data.length === 0) break
      }
    }
  }

  async getForCommitHash(owner: string, repo: string, commit_sha: string, maxPullRequests: number): Promise<PullRequestInfo[]> {
    const mergedPRs: PullRequestInfo[] = []
    await this.getAllPullRequest(owner, repo, 'closed', maxPullRequests)

    for (const pr of GiteaRepository.pulls.closed) {
      if (pr.merge_commit_sha === commit_sha) {
        mergedPRs.push(this.mapPullRequest(pr, pr.merged_at ? 'merged' : 'open'))
      }
    }

    core.debug(`Completed fetching PRs from API. Fetched: ${mergedPRs.length}`)

    return mergedPRs
  }

  async getOpen(owner: string, repo: string, maxPullRequests: number): Promise<PullRequestInfo[]> {
    await this.getAllPullRequest(owner, repo, 'open', maxPullRequests)

    const openPrs: PullRequestInfo[] = []
    for (const pr of GiteaRepository.pulls.open) {
      openPrs.push(this.mapPullRequest(pr, 'open'))
    }
    return openPrs
  }

  async getReviews(owner: string, repo: string, pr: PullRequestInfo): Promise<void> {
    const prReviews: CommentInfo[] = []
    const response = await this.api.repos.repoListPullReviews(owner, repo, pr.number, {})
    if (response.error === null) {
      for (const comment of response.data) {
        prReviews.push(this.mapComment(comment))
      }
    } else {
      core.error(`ℹ️ Some errors. ${response.error.message}`)
    }
    pr.reviews = prReviews
  }

  private mapComment = (comment: PullReview): CommentInfo => ({
    id: comment.id || 0,
    htmlURL: comment.html_url || '',
    submittedAt: comment.submitted_at ? moment(comment.submitted_at) : undefined,
    author: comment.user?.login || '',
    body: comment.body || '',
    state: comment.state
  })

  async getTags(owner: string, repo: string, maxTagsToFetch: number): Promise<TagInfo[]> {
    core.debug(`Start to get tag from gitea`)
    const response = await this.api.repos.repoListTags(owner, repo, {
      limit: maxTagsToFetch
    })
    const tagsInfo: TagInfo[] = []
    if (response.error === null) {
      for (const tag of response.data) {
        tagsInfo.push({
          name: tag.name || '',
          commit: tag.commit?.sha
        })
      }
    } else {
      core.error(`ℹ️ Some errors. ${response.error.message}`)
    }
    core.info(`ℹ️ Found ${tagsInfo.length} (fetching max: ${maxTagsToFetch}) tags from the GitHub API for ${owner}/${repo}`)
    return tagsInfo
  }
}
