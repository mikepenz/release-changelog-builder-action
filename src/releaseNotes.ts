import {Octokit} from '@octokit/rest'
import {Commits, CommitInfo} from './commits'
import {PullRequestInfo, PullRequests} from './pullRequests'
import {buildChangelog} from './transform'
import * as core from '@actions/core'
import {Configuration, DefaultConfiguration} from './configuration'
import {failOrError} from './utils'

export interface ReleaseNotesOptions {
  owner: string // the owner of the repository
  repo: string // the repository
  fromTag: string // the tag/ref to start from
  toTag: string // the tag/ref up to
  failOnError: boolean // defines if we should fail the action in case of an error
  configuration: Configuration // the configuration as defined in `configuration.ts`
}

export class ReleaseNotes {
  constructor(private octokit: Octokit, private options: ReleaseNotesOptions) {}

  async pull(): Promise<string | null> {
    const {configuration} = this.options

    core.startGroup(`🚀 Load pull requests`)
    const mergedPullRequests = await this.getMergedPullRequests(this.octokit)
    core.endGroup()

    if (mergedPullRequests.length === 0) {
      core.warning(`⚠️ No pull requests found`)
      return null
    }

    core.startGroup('📦 Build changelog')
    const resultChangelog = buildChangelog(
      mergedPullRequests,
      configuration,
      this.options
    )
    core.endGroup()
    return resultChangelog
  }

  private async getMergedPullRequests(
    octokit: Octokit
  ): Promise<PullRequestInfo[]> {
    const {
      owner,
      repo,
      fromTag,
      toTag,
      failOnError,
      configuration
    } = this.options
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

    const prCommits = pullRequestsApi.filterCommits(
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

    // return only the pull requests associated with this release
    return pullRequests.filter(pr => {
      return releaseCommitHashes.includes(pr.mergeCommitSha)
    })
  }
}
