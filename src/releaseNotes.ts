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

    const {owner, repo, fromTag, toTag, configuration} = this.options

    if (!fromTag) {
      const tagsApi = new Tags(octokit)

      const previousTag = await tagsApi.findPredecessorTag(owner, repo, toTag)
      if (previousTag == null) {
        core.error(`Unable to retrieve previous tag given ${toTag}`)
        return configuration.empty_template
          ? configuration.empty_template
          : DefaultConfiguration.empty_template
      }

      this.options.fromTag = previousTag.name
    }

    const mergedPullRequests = await this.getMergedPullRequests(octokit)

    if (mergedPullRequests.length === 0) {
      core.warning(`No pull requests found for between ${fromTag}...${toTag}`)
      return configuration.empty_template
        ? configuration.empty_template
        : DefaultConfiguration.empty_template
    }

    return buildChangelog(mergedPullRequests, configuration)
  }

  private async getMergedPullRequests(
    octokit: Octokit
  ): Promise<PullRequestInfo[]> {
    const {owner, repo, fromTag, toTag} = this.options
    core.info(`Comparing ${owner}/${repo} ${fromTag}...${toTag}`)

    const commitsApi = new Commits(octokit)
    const commits = await commitsApi.getDiff(owner, repo, fromTag!!, toTag)

    if (commits.length === 0) {
      return []
    }

    const firstCommit = commits[0]
    const lastCommit = commits[commits.length - 1]
    const fromDate = firstCommit.date
    const toDate = lastCommit.date

    core.info(
      `Fetching PRs between dates ${fromDate.toISOString()} ${toDate.toISOString()} for ${owner}/${repo}`
    )

    const pullRequestsApi = new PullRequests(octokit)
    const pullRequests = await pullRequestsApi.getBetweenDates(
      owner,
      repo,
      fromDate,
      toDate
    )

    core.info(`Found ${pullRequests.length} merged PRs for ${owner}/${repo}`)

    const prCommits = pullRequestsApi.filterCommits(commits)
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
        core.info(`${prRef} not in date range, fetching explicitly`)
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
          `${prRef} not in date range, likely a merge commit from a fork-to-fork PR`
        )
      }
    }

    return filteredPullRequests
  }
}
