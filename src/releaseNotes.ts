import {Octokit} from '@octokit/rest'
import {Commits} from './commits'
import {PullRequestInfo, PullRequests} from './pullRequests'
import {buildChangelog} from './transform'
import * as core from '@actions/core'
import {Tags} from './tags'
import {Configuration, DefaultConfiguration} from './configuration'

export interface ReleaseNotesOptions {
  owner: string
  repo: string
  fromTag: string | null
  toTag: string
  configuration: Configuration
}

export class ReleaseNotes {
  constructor(private options: ReleaseNotesOptions) {}

  async pull(token?: string): Promise<string> {
    const octokit = new Octokit({
      auth: `token ${token || process.env.GITHUB_TOKEN}`
    })

    const {owner, repo, toTag, configuration} = this.options

    if (!this.options.fromTag) {
      core.debug(`fromTag undefined, trying to resolve via API`)
      const tagsApi = new Tags(octokit)

      const previousTag = await tagsApi.findPredecessorTag(owner, repo, toTag, configuration.max_tags_to_fetch ? configuration.max_tags_to_fetch : DefaultConfiguration.max_tags_to_fetch)
      if (previousTag == null) {
        core.error(`Unable to retrieve previous tag given ${toTag}`)
        return configuration.empty_template
          ? configuration.empty_template
          : DefaultConfiguration.empty_template
      }

      this.options.fromTag = previousTag.name
      core.debug(`fromTag resolved via previousTag as: ${previousTag.name}`)
    }

    const mergedPullRequests = await this.getMergedPullRequests(octokit)

    if (mergedPullRequests.length === 0) {
      core.warning(
        `No pull requests found for between ${this.options.fromTag}...${toTag}`
      )
      return configuration.empty_template
        ? configuration.empty_template
        : DefaultConfiguration.empty_template
    }

    return buildChangelog(mergedPullRequests, configuration)
  }

  private async getMergedPullRequests(
    octokit: Octokit
  ): Promise<PullRequestInfo[]> {
    const {owner, repo, fromTag, toTag, configuration} = this.options
    core.info(`Comparing ${owner}/${repo} - ${fromTag}...${toTag}`)

    const commitsApi = new Commits(octokit)
    const commits = await commitsApi.getDiff(owner, repo, fromTag!!, toTag)

    if (commits.length === 0) {
      return []
    }

    const firstCommit = commits[0]
    const lastCommit = commits[commits.length - 1]
    let fromDate = firstCommit.date
    const toDate = lastCommit.date

    const maxDays = configuration.max_back_track_time_days ? configuration.max_back_track_time_days : DefaultConfiguration.max_back_track_time_days
    const maxFromDate = toDate.clone().subtract(maxDays, "days")
    if(maxFromDate.isAfter(fromDate)) {
      core.info(`Adjusted 'fromDate' to go max ${maxDays} back`)
      fromDate = maxFromDate
    }

    core.info(
      `Fetching PRs between dates ${fromDate.toISOString()} to ${toDate.toISOString()} for ${owner}/${repo}`
    )

    const pullRequestsApi = new PullRequests(octokit)
    const pullRequests = await pullRequestsApi.getBetweenDates(
      owner,
      repo,
      fromDate,
      toDate,
      configuration.max_pull_requests ? configuration.max_pull_requests : DefaultConfiguration.max_pull_requests
    )

    core.info(`Retrieved ${pullRequests.length} merged PRs for ${owner}/${repo}`)

    const prCommits = pullRequestsApi.filterCommits(commits, configuration.exclude_merge_branches ? configuration.exclude_merge_branches : DefaultConfiguration.exclude_merge_branches)

    core.info(`Retrieved ${prCommits.length} PR merge commits for ${owner}/${repo}`)

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
          core.warning(`${prRef} not found! Commit text: ${commit.summary}`)
        }
      } else {
        core.info(
          `${prRef} not in date range, excluding from changelog`
        )
      }
    }

    return filteredPullRequests
  }
}
