import * as core from '@actions/core'
import moment from 'moment'
import {failOrError} from './utils'
import {PullRequestInfo} from './pullRequests'
import {Options} from './prCollector'
import {BaseRepository} from '../repositories/BaseRepository'

export interface DiffInfo {
  changedFiles: number
  additions: number
  deletions: number
  changes: number
  commits: number
  commitInfo: CommitInfo[]
}

export const DefaultDiffInfo: DiffInfo = {
  changedFiles: 0,
  additions: 0,
  deletions: 0,
  changes: 0,
  commits: 0,
  commitInfo: []
}

export interface CommitInfo {
  sha: string
  summary: string
  message: string
  author: string
  authorName: string
  authorDate: moment.Moment
  committer: string
  committerName: string
  commitDate: moment.Moment
}

export class Commits {
  constructor(private repositoryUtils: BaseRepository) {}

  async getDiff(owner: string, repo: string, base: string, head: string): Promise<DiffInfo> {
    const diff: DiffInfo = await this.getDiffRemote(owner, repo, base, head)
    diff.commitInfo = this.sortCommits(diff.commitInfo)
    return diff
  }

  private async getDiffRemote(owner: string, repo: string, base: string, head: string): Promise<DiffInfo> {
    return this.repositoryUtils.getDiffRemote(owner, repo, base, head)
  }

  private sortCommits(commits: CommitInfo[]): CommitInfo[] {
    const commitsResult = []
    const shas: {[key: string]: boolean} = {}

    for (const commit of commits) {
      if (shas[commit.sha]) {
        continue
      }
      shas[commit.sha] = true
      commitsResult.push(commit)
    }

    commitsResult.sort((a, b) => {
      if (a.commitDate.isBefore(b.commitDate)) {
        return -1
      } else if (b.commitDate.isBefore(a.commitDate)) {
        return 1
      }
      return 0
    })

    return commitsResult
  }

  async getCommitHistory(options: Options): Promise<DiffInfo> {
    const {owner, repo, fromTag, toTag, failOnError} = options
    core.info(`ℹ️ Comparing ${owner}/${repo} - '${fromTag.name}...${toTag.name}'`)

    const commitsApi = new Commits(this.repositoryUtils)
    let diffInfo: DiffInfo
    try {
      diffInfo = await commitsApi.getDiff(owner, repo, fromTag.name, toTag.name)
    } catch (error) {
      failOrError(`💥 Failed to retrieve - Invalid tag? - Because of: ${error}`, failOnError)
      return DefaultDiffInfo
    }
    if (diffInfo.commitInfo.length === 0) {
      core.warning(`⚠️ No commits found between - ${fromTag.name}...${toTag.name}`)
      return DefaultDiffInfo
    }

    return diffInfo
  }

  async generateCommitPRs(options: Options): Promise<[DiffInfo, PullRequestInfo[]]> {
    const diffInfo = await this.getCommitHistory(options)
    return convertCommitsToPrs(options, diffInfo)
  }
}

export function convertCommitsToPrs(options: Options, diffInfo: DiffInfo): [DiffInfo, PullRequestInfo[]] {
  const {owner, repo, configuration} = options
  const commits = diffInfo.commitInfo
  if (commits.length === 0) {
    return [diffInfo, []]
  }

  const prCommits = filterCommits(commits, configuration.exclude_merge_branches)

  core.info(`ℹ️ Retrieved ${prCommits.length} commits for ${owner}/${repo}`)

  const prs = prCommits.map(function (commit): PullRequestInfo {
    return {
      number: 0,
      title: commit.summary,
      htmlURL: '',
      baseBranch: '',
      createdAt: commit.commitDate,
      mergedAt: commit.commitDate,
      mergeCommitSha: commit.sha,
      author: commit.author || '',
      authorName: commit.authorName || '',
      repoName: '',
      labels: [],
      milestone: '',
      body: commit.message || '',
      assignees: [],
      requestedReviewers: [],
      approvedReviewers: [],
      status: 'merged'
    }
  })
  return [diffInfo, prs]
}

/**
 * Filters out all commits which match the exclude pattern
 */
export function filterCommits(commits: CommitInfo[], excludeMergeBranches: string[]): CommitInfo[] {
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
