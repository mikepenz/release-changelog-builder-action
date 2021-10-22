import * as core from '@actions/core'
import {CommitInfo, Commits, filterCommits} from './commits'
import {Configuration, DefaultConfiguration} from './configuration'
import {PullRequestInfo, PullRequests} from './pullRequests'
import {Octokit} from '@octokit/rest'
import {buildChangelog} from './transform'
import {failOrError} from './utils'

export interface ReleaseNotesOptions {
  owner: string // the owner of the repository
  repo: string // the repository
  fromTag: string // the tag/ref to start from
  toTag: string // the tag/ref up to
  failOnError: boolean // defines if we should fail the action in case of an error
  commitMode: boolean // defines if we use the alternative commit based mode. note: this is only partially supported
  configuration: Configuration // the configuration as defined in `configuration.ts`
}

export class ReleaseNotes {
  constructor(private octokit: Octokit, private options: ReleaseNotesOptions) {}

  async pull(): Promise<string | null> {
    let mergedPullRequests: PullRequestInfo[]
    if (!this.options.commitMode) {
      core.startGroup(`🚀 Load pull requests`)
      mergedPullRequests = await this.getMergedPullRequests(this.octokit)

      // define the included PRs within this release as output
      core.setOutput(
        'pull_requests',
        mergedPullRequests
          .map(pr => {
            return pr.number
          })
          .join(',')
      )

      core.endGroup()
    } else {
      core.startGroup(`🚀 Load commit history`)
      core.info(`⚠️ Executing experimental commit mode`)
      mergedPullRequests = await this.generateCommitPRs(this.octokit)
      core.endGroup()
    }

    if (mergedPullRequests.length === 0) {
      core.warning(`⚠️ No pull requests found`)
      return null
    }

    core.startGroup('📦 Build changelog')
    const resultChangelog = buildChangelog(mergedPullRequests, this.options)
    core.endGroup()
    return resultChangelog
  }

  private async getCommitHistory(octokit: Octokit): Promise<CommitInfo[]> {
    const {owner, repo, fromTag, toTag, failOnError} = this.options
    core.info(`ℹ️ Comparing ${owner}/${repo} - '${fromTag}...${toTag}'`)

    const commitsApi = new Commits(octokit)
    let commits: CommitInfo[]
    try {
      commits = await commitsApi.getDiff(owner, repo, fromTag, toTag)
    } catch (error) {
      failOrError(
        `💥 Failed to retrieve - Invalid tag? - Because of: ${error}`,
        failOnError
      )
      return []
    }
    if (commits.length === 0) {
      core.warning(`⚠️ No commits found between - ${fromTag}...${toTag}`)
      return []
    }

    return commits
  }

  private async getMergedPullRequests(
    octokit: Octokit
  ): Promise<PullRequestInfo[]> {
    const {owner, repo, configuration} = this.options

    const commits = await this.getCommitHistory(octokit)
    if (commits.length === 0) {
      return []
    }

    const firstCommit = commits[0]
    const lastCommit = commits[commits.length - 1]
    let fromDate = firstCommit.date
    const toDate = lastCommit.date

    const maxDays =
      configuration.max_back_track_time_days ||
      DefaultConfiguration.max_back_track_time_days
    const maxFromDate = toDate.clone().subtract(maxDays, 'days')
    if (maxFromDate.isAfter(fromDate)) {
      core.info(`⚠️ Adjusted 'fromDate' to go max ${maxDays} back`)
      fromDate = maxFromDate
    }

    core.info(
      `ℹ️ Fetching PRs between dates ${fromDate.toISOString()} to ${toDate.toISOString()} for ${owner}/${repo}`
    )

    const pullRequestsApi = new PullRequests(octokit)
    const pullRequests = await pullRequestsApi.getBetweenDates(
      owner,
      repo,
      fromDate,
      toDate,
      configuration.max_pull_requests || DefaultConfiguration.max_pull_requests
    )

    core.info(
      `ℹ️ Retrieved ${pullRequests.length} merged PRs for ${owner}/${repo}`
    )

    const prCommits = filterCommits(
      commits,
      configuration.exclude_merge_branches ||
        DefaultConfiguration.exclude_merge_branches
    )

    core.info(
      `ℹ️ Retrieved ${prCommits.length} release commits for ${owner}/${repo}`
    )

    // create array of commits for this release
    const releaseCommitHashes = prCommits.map(commmit => {
      return commmit.sha
    })

    // retrieve base branches we allow
    const baseBranches =
      configuration.base_branches || DefaultConfiguration.base_branches
    const baseBranchPatterns = baseBranches.map(baseBranch => {
      return new RegExp(baseBranch.replace('\\\\', '\\'), 'gu')
    })

    // return only the pull requests associated with this release
    // and if the baseBranch is matching the configuration
    return pullRequests.filter(pr => {
      let keep = releaseCommitHashes.includes(pr.mergeCommitSha)
      if (keep && baseBranches.length !== 0) {
        keep = baseBranchPatterns.some(pattern => {
          return pr.baseBranch.match(pattern) !== null
        })
      }
      return keep
    })
  }

  private async generateCommitPRs(
    octokit: Octokit
  ): Promise<PullRequestInfo[]> {
    const {owner, repo, configuration} = this.options

    const commits = await this.getCommitHistory(octokit)
    if (commits.length === 0) {
      return []
    }

    const prCommits = filterCommits(
      commits,
      configuration.exclude_merge_branches ||
        DefaultConfiguration.exclude_merge_branches
    )

    core.info(`ℹ️ Retrieved ${prCommits.length} commits for ${owner}/${repo}`)

    return prCommits.map(function (commit) {
      return {
        number: 0,
        title: commit.summary,
        htmlURL: '',
        baseBranch: '',
        mergedAt: commit.date,
        mergeCommitSha: commit.sha,
        author: commit.author || '',
        repoName: '',
        labels: new Set(),
        milestone: '',
        body: commit.message || '',
        assignees: [],
        requestedReviewers: []
      }
    })
  }
}
