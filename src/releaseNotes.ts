import * as core from '@actions/core'
import {Commits, filterCommits, DiffInfo, DefaultDiffInfo} from './commits'
import {Configuration, DefaultConfiguration} from './configuration'
import {PullRequestInfo, PullRequests} from './pullRequests'
import {Octokit} from '@octokit/rest'
import {buildChangelog, replaceEmptyTemplate} from './transform'
import {failOrError} from './utils'
import {TagInfo} from './tags'

export interface ReleaseNotesOptions {
  owner: string // the owner of the repository
  repo: string // the repository
  fromTag: TagInfo // the tag/ref to start from
  toTag: TagInfo // the tag/ref up to
  includeOpen: boolean // defines if we should also fetch open pull requests
  failOnError: boolean // defines if we should fail the action in case of an error
  fetchReviewers: boolean // defines if the action should fetch the reviewers for PRs - approved reviewers are not included in the default PR listing
  fetchReleaseInformation: boolean // defines if the action should fetch the release information for the from and to tag - e.g. the creation date for the associated release
  commitMode: boolean // defines if we use the alternative commit based mode. note: this is only partially supported
  configuration: Configuration // the configuration as defined in `configuration.ts`
}

export class ReleaseNotes {
  constructor(private octokit: Octokit, private options: ReleaseNotesOptions) {}

  async pull(): Promise<string> {
    let mergedPullRequests: PullRequestInfo[]
    let diffInfo: DiffInfo
    if (!this.options.commitMode) {
      core.startGroup(`🚀 Load pull requests`)

      const [info, prs] = await this.getMergedPullRequests(this.octokit)
      mergedPullRequests = prs
      diffInfo = info

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
      const [info, prs] = await this.generateCommitPRs(this.octokit)
      mergedPullRequests = prs
      diffInfo = info
      core.endGroup()
    }

    core.setOutput('changed_files', diffInfo.changedFiles)
    core.setOutput('additions', diffInfo.additions)
    core.setOutput('deletions', diffInfo.deletions)
    core.setOutput('changes', diffInfo.changes)
    core.setOutput('commits', diffInfo.commits)

    if (mergedPullRequests.length === 0) {
      core.warning(`⚠️ No pull requests found`)
      return replaceEmptyTemplate(
        this.options.configuration.empty_template || DefaultConfiguration.empty_template,
        this.options
      )
    }

    core.startGroup('📦 Build changelog')
    const resultChangelog = buildChangelog(diffInfo, mergedPullRequests, this.options)
    core.endGroup()
    return resultChangelog
  }

  private async getCommitHistory(octokit: Octokit): Promise<DiffInfo> {
    const {owner, repo, fromTag, toTag, failOnError} = this.options
    core.info(`ℹ️ Comparing ${owner}/${repo} - '${fromTag.name}...${toTag.name}'`)

    const commitsApi = new Commits(octokit)
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

  private async getMergedPullRequests(octokit: Octokit): Promise<[DiffInfo, PullRequestInfo[]]> {
    const {owner, repo, includeOpen, fetchReviewers, configuration} = this.options
    const fetchReviews = true // TEMPORARY!!

    const diffInfo = await this.getCommitHistory(octokit)
    const commits = diffInfo.commitInfo
    if (commits.length === 0) {
      return [diffInfo, []]
    }

    const firstCommit = commits[0]
    const lastCommit = commits[commits.length - 1]
    let fromDate = firstCommit.date
    const toDate = lastCommit.date

    const maxDays = configuration.max_back_track_time_days || DefaultConfiguration.max_back_track_time_days
    const maxFromDate = toDate.clone().subtract(maxDays, 'days')
    if (maxFromDate.isAfter(fromDate)) {
      core.info(`⚠️ Adjusted 'fromDate' to go max ${maxDays} back`)
      fromDate = maxFromDate
    }

    core.info(`ℹ️ Fetching PRs between dates ${fromDate.toISOString()} to ${toDate.toISOString()} for ${owner}/${repo}`)

    const pullRequestsApi = new PullRequests(octokit)
    const pullRequests = await pullRequestsApi.getBetweenDates(
      owner,
      repo,
      fromDate,
      toDate,
      configuration.max_pull_requests || DefaultConfiguration.max_pull_requests
    )

    core.info(`ℹ️ Retrieved ${pullRequests.length} PRs for ${owner}/${repo} in date range from API`)

    const prCommits = filterCommits(
      commits,
      configuration.exclude_merge_branches || DefaultConfiguration.exclude_merge_branches
    )

    core.info(`ℹ️ Retrieved ${prCommits.length} release commits for ${owner}/${repo}`)

    // create array of commits for this release
    const releaseCommitHashes = prCommits.map(commmit => {
      return commmit.sha
    })

    // filter out pull requests not associated with this release
    const mergedPullRequests = pullRequests.filter(pr => {
      return releaseCommitHashes.includes(pr.mergeCommitSha)
    })

    core.info(`ℹ️ Retrieved ${mergedPullRequests.length} merged PRs for ${owner}/${repo}`)

    let allPullRequests = mergedPullRequests
    if (includeOpen) {
      // retrieve all open pull requests
      const openPullRequests = await pullRequestsApi.getOpen(
        owner,
        repo,
        configuration.max_pull_requests || DefaultConfiguration.max_pull_requests
      )

      core.info(`ℹ️ Retrieved ${openPullRequests.length} open PRs for ${owner}/${repo}`)

      // all pull requests
      allPullRequests = allPullRequests.concat(openPullRequests)

      core.info(`ℹ️ Retrieved ${allPullRequests.length} total PRs for ${owner}/${repo}`)
    }

    // retrieve base branches we allow
    const baseBranches = configuration.base_branches || DefaultConfiguration.base_branches
    const baseBranchPatterns = baseBranches.map(baseBranch => {
      return new RegExp(baseBranch.replace('\\\\', '\\'), 'gu')
    })

    // return only prs if the baseBranch is matching the configuration
    const finalPrs = allPullRequests.filter(pr => {
      if (baseBranches.length !== 0) {
        return baseBranchPatterns.some(pattern => {
          return pr.baseBranch.match(pattern) !== null
        })
      }
      return true
    })

    if (baseBranches.length !== 0) {
      core.info(
        `ℹ️ Retrieved ${mergedPullRequests.length} PRs for ${owner}/${repo} filtered by the 'base_branches' configuration.`
      )
    }

    if (fetchReviewers) {
      core.info(`ℹ️ Fetching reviewers was enabled`)
      // update PR information with reviewers who approved
      for (const pr of finalPrs) {
        await pullRequestsApi.getReviewers(owner, repo, pr)
        if (pr.approvedReviewers.length > 0) {
          core.info(`ℹ️ Retrieved ${pr.approvedReviewers.length} reviewer(s) for PR ${owner}/${repo}/#${pr.number}`)
        }
      }
    } else {
      core.debug(`ℹ️ Fetching reviewers was disabled`)
    }

    if (fetchReviews) {
      core.info(`ℹ️ Fetching reviews was enabled`)
      // update PR information with reviewers who approved
      for (const pr of finalPrs) {
        await pullRequestsApi.getReviews(owner, repo, pr)
        if ((pr.reviews?.length || 0) > 0) {
          core.info(`ℹ️ Retrieved ${pr.reviews?.length || 0} review(s) for PR ${owner}/${repo}/#${pr.number}`)
        }
      }
    } else {
      core.debug(`ℹ️ Fetching reviews was disabled`)
    }

    return [diffInfo, finalPrs]
  }

  private async generateCommitPRs(octokit: Octokit): Promise<[DiffInfo, PullRequestInfo[]]> {
    const {owner, repo, configuration} = this.options

    const diffInfo = await this.getCommitHistory(octokit)
    const commits = diffInfo.commitInfo
    if (commits.length === 0) {
      return [diffInfo, []]
    }

    const prCommits = filterCommits(
      commits,
      configuration.exclude_merge_branches || DefaultConfiguration.exclude_merge_branches
    )

    core.info(`ℹ️ Retrieved ${prCommits.length} commits for ${owner}/${repo}`)

    const prs = prCommits.map(function (commit): PullRequestInfo {
      return {
        number: 0,
        title: commit.summary,
        htmlURL: '',
        baseBranch: '',
        createdAt: commit.date,
        mergedAt: commit.date,
        mergeCommitSha: commit.sha,
        author: commit.author || '',
        repoName: '',
        labels: new Set(),
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
}
