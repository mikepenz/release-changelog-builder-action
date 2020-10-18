import {Octokit} from '@octokit/rest'
import {Commits, CommitInfo} from './commits'
import {PullRequestInfo, PullRequests} from './pullRequests'
import {buildChangelog} from './transform'
import * as core from '@actions/core'
import {Tags} from './tags'
import {Configuration, DefaultConfiguration} from './configuration'
import {failOrError} from './utils'

export interface ReleaseNotesOptions {
  owner: string // the owner of the repository
  repo: string // the repository
  fromTag: string | null // the tag/ref to start from
  toTag: string // the tag/ref up to
  ignorePreReleases: boolean // defines if we should ignore any pre-releases for matching, only relevant if fromTag is null
  failOnError: boolean // defines if we should fail the action in case of an error
  configuration: Configuration // the configuration as defined in `configuration.ts`
}

export class ReleaseNotes {
  constructor(private options: ReleaseNotesOptions) {}

  async pull(token?: string): Promise<string | null> {
    const octokit = new Octokit({
      auth: `token ${token || process.env.GITHUB_TOKEN}`
    })

    const {
      owner,
      repo,
      toTag,
      ignorePreReleases,
      failOnError,
      configuration
    } = this.options

    if (!this.options.fromTag) {
      core.startGroup(`🔖 Resolve previous tag`)
      core.debug(`fromTag undefined, trying to resolve via API`)
      const tagsApi = new Tags(octokit)

      const previousTag = await tagsApi.findPredecessorTag(
        owner,
        repo,
        toTag,
        ignorePreReleases,
        configuration.max_tags_to_fetch ??
          DefaultConfiguration.max_tags_to_fetch
      )
      if (previousTag == null) {
        failOrError(
          `💥 Unable to retrieve previous tag given ${toTag}`,
          failOnError
        )
        return null
      }
      this.options.fromTag = previousTag.name
      core.debug(`fromTag resolved via previousTag as: ${previousTag.name}`)
      core.endGroup()
    }

    if (!this.options.fromTag) {
      failOrError(`💥 Missing or couldn't resolve 'fromTag'`, failOnError)
      return null
    } else {
      core.setOutput('fromTag', this.options.fromTag)
    }

    core.startGroup(`🚀 Load pull requests`)
    const mergedPullRequests = await this.getMergedPullRequests(octokit)
    core.endGroup()

    if (mergedPullRequests.length === 0) {
      core.warning(`⚠️ No pull requests found`)
      return null
    }

    core.startGroup('📦 Build changelog')
    const resultChangelog = buildChangelog(mergedPullRequests, configuration)
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
      commits = await commitsApi.getDiff(owner, repo, fromTag!!, toTag)
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
      configuration.max_back_track_time_days ??
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
      configuration.max_pull_requests ?? DefaultConfiguration.max_pull_requests
    )

    core.info(
      `ℹ️ Retrieved ${pullRequests.length} merged PRs for ${owner}/${repo}`
    )

    const prCommits = pullRequestsApi.filterCommits(
      commits,
      configuration.exclude_merge_branches ??
        DefaultConfiguration.exclude_merge_branches
    )

    core.info(
      `ℹ️ Retrieved ${prCommits.length} PR merge commits for ${owner}/${repo}`
    )

    const filteredPullRequests = []
    const pullRequestsByNumber: {[key: number]: PullRequestInfo} = {}

    for (const pr of pullRequests) {
      pullRequestsByNumber[pr.number] = pr
    }

    for (const commit of prCommits) {
      if (!commit.prNumber) {
        continue
      }

      const prRef = `${owner}/${repo}#${commit.prNumber}`

      if (pullRequestsByNumber[commit.prNumber]) {
        filteredPullRequests.push(pullRequestsByNumber[commit.prNumber])
      } else if (fromDate.toISOString() === toDate.toISOString()) {
        const pullRequest = await pullRequestsApi.getSingle(
          owner,
          repo,
          commit.prNumber
        )

        if (pullRequest) {
          filteredPullRequests.push(pullRequest)
        } else {
          core.warning(`⚠️ ${prRef} not found! Commit text: ${commit.summary}`)
        }
      } else {
        core.info(`ℹ️ ${prRef} not in date range, excluding from changelog`)
      }
    }

    return filteredPullRequests
  }
}
