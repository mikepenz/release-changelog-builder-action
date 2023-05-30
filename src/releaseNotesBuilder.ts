import * as core from '@actions/core'
import {Configuration} from './configuration'
import {Octokit} from '@octokit/rest'
import {TagInfo, Tags} from './tags'
import {checkExportedData, failOrError} from './utils'
import {HttpsProxyAgent} from 'https-proxy-agent'
import {PullRequestInfo, PullRequests} from './pullRequests'
import {Commits, DiffInfo} from './commits'
import {buildChangelog} from './transform'

export interface ReleaseNotesOptions {
  owner: string // the owner of the repository
  repo: string // the repository
  fromTag: TagInfo // the tag/ref to start from
  toTag: TagInfo // the tag/ref up to
  includeOpen: boolean // defines if we should also fetch open pull requests
  failOnError: boolean // defines if we should fail the action in case of an error
  fetchReviewers: boolean // defines if the action should fetch the reviewers for PRs - approved reviewers are not included in the default PR listing
  fetchReleaseInformation: boolean // defines if the action should fetch the release information for the from and to tag - e.g. the creation date for the associated release
  fetchReviews: boolean // defines if the action should fetch the reviews for the PR.
  commitMode: boolean // defines if we use the alternative commit based mode. note: this is only partially supported
  configuration: Configuration // the configuration as defined in `configuration.ts`
}

export interface ReleaseNotesData {
  diffInfo: DiffInfo
  mergedPullRequests: PullRequestInfo[]
  options: ReleaseNotesOptions
}

export class ReleaseNotesBuilder {
  constructor(
    private baseUrl: string | null,
    private token: string | null,
    private repositoryPath: string,
    private owner: string | null,
    private repo: string | null,
    private fromTag: string | null,
    private toTag: string | null,
    private includeOpen: boolean = false,
    private failOnError: boolean,
    private ignorePreReleases: boolean,
    private fetchReviewers: boolean = false,
    private fetchReleaseInformation: boolean = false,
    private fetchReviews: boolean = false,
    private commitMode: boolean = false,
    private exportCollected: boolean = false,
    private exportOnly: boolean = false,
    private configuration: Configuration
  ) {}

  async build(): Promise<string | null> {
    let releaseNotesData = checkExportedData()
    if (releaseNotesData == null) {
      if (!this.owner) {
        failOrError(`💥 Missing or couldn't resolve 'owner'`, this.failOnError)
        return null
      } else {
        core.setOutput('owner', this.owner)
        core.debug(`Resolved 'owner' as ${this.owner}`)
      }

      if (!this.repo) {
        failOrError(`💥 Missing or couldn't resolve 'owner'`, this.failOnError)
        return null
      } else {
        core.setOutput('repo', this.repo)
        core.debug(`Resolved 'repo' as ${this.repo}`)
      }
      core.endGroup()

      // check proxy setup for GHES environments
      const proxy = process.env.https_proxy || process.env.HTTPS_PROXY
      const noProxy = process.env.no_proxy || process.env.NO_PROXY
      let noProxyArray: string[] = []
      if (noProxy) {
        noProxyArray = noProxy.split(',')
      }

      // load octokit instance
      const octokit = new Octokit({
        auth: `token ${this.token || process.env.GITHUB_TOKEN}`,
        baseUrl: `${this.baseUrl || 'https://api.github.com'}`
      })

      if (proxy) {
        const agent = new HttpsProxyAgent(proxy)
        octokit.hook.before('request', options => {
          if (noProxyArray.includes(options.request.hostname)) {
            return
          }
          options.request.agent = agent
        })
      }

      // ensure proper from <-> to tag range
      core.startGroup(`🔖 Resolve tags`)
      const tagsApi = new Tags(octokit)
      const tagRange = await tagsApi.retrieveRange(
        this.repositoryPath,
        this.owner,
        this.repo,
        this.fromTag,
        this.toTag,
        this.ignorePreReleases,
        this.configuration.max_tags_to_fetch,
        this.configuration.tag_resolver
      )

      let thisTag = tagRange.to
      if (!thisTag) {
        failOrError(`💥 Missing or couldn't resolve 'toTag'`, this.failOnError)
        return null
      } else {
        core.setOutput('toTag', thisTag.name)
        core.debug(`Resolved 'toTag' as ${thisTag.name}`)
      }

      let previousTag = tagRange.from
      if (previousTag == null) {
        failOrError(`💥 Unable to retrieve previous tag given ${this.toTag}`, this.failOnError)
        return null
      }
      core.setOutput('fromTag', previousTag.name)
      core.debug(`fromTag resolved via previousTag as: ${previousTag.name}`)

      if (this.fetchReleaseInformation) {
        // load release information from the GitHub API
        core.info(`ℹ️ Fetching release information was enabled`)
        thisTag = await tagsApi.fillTagInformation(this.repositoryPath, this.owner, this.repo, thisTag)
        previousTag = await tagsApi.fillTagInformation(this.repositoryPath, this.owner, this.repo, previousTag)
      } else {
        core.debug(`ℹ️ Fetching release information was disabled`)
      }

      core.endGroup()

      const options = {
        owner: this.owner,
        repo: this.repo,
        fromTag: previousTag,
        toTag: thisTag,
        includeOpen: this.includeOpen,
        failOnError: this.failOnError,
        fetchReviewers: this.fetchReviewers,
        fetchReleaseInformation: this.fetchReleaseInformation,
        fetchReviews: this.fetchReviews,
        commitMode: this.commitMode,
        configuration: this.configuration
      }

      releaseNotesData = await pullData(octokit, options, this.exportCollected, this.exportOnly)
    } else {
      core.info(`ℹ️ Retrieved previously exported collected data`)

      // merge input with options (in case some data was updated)
      const diffInfo = releaseNotesData.diffInfo
      const mergedPullRequests = releaseNotesData.mergedPullRequests
      const orgOptions = releaseNotesData.options

      // merge fromTag info with provided info || otherwise use cached info
      const fromTag: TagInfo = orgOptions.fromTag
      if (this.fromTag != null) {
        fromTag.name = this.fromTag
      }
      const toTag: TagInfo = orgOptions.toTag
      if (this.toTag != null) {
        toTag.name = this.toTag
      }

      // merge provided values with previous options (prefer provided)
      const options: ReleaseNotesOptions = {
        owner: this.owner || orgOptions.owner,
        repo: this.repo || orgOptions.repo,
        fromTag,
        toTag,
        includeOpen: this.includeOpen || orgOptions.includeOpen,
        failOnError: this.failOnError || orgOptions.failOnError,
        fetchReviewers: this.fetchReviewers || orgOptions.fetchReviewers,
        fetchReleaseInformation: this.fetchReleaseInformation || orgOptions.fetchReleaseInformation,
        fetchReviews: this.fetchReviews || orgOptions.fetchReviews,
        commitMode: this.commitMode || orgOptions.commitMode,
        configuration: this.configuration || orgOptions.configuration
      }

      releaseNotesData = {
        diffInfo,
        mergedPullRequests,
        options
      }
    }
    if (releaseNotesData != null) {
      return buildChangelog(releaseNotesData.diffInfo, releaseNotesData.mergedPullRequests, releaseNotesData.options)
    } else {
      return null
    }
  }
}

export async function pullData(
  octokit: Octokit,
  options: ReleaseNotesOptions,
  exportCollected: boolean,
  exportOnly: boolean
): Promise<ReleaseNotesData | null> {
  let mergedPullRequests: PullRequestInfo[]
  let diffInfo: DiffInfo

  const commitsApi = new Commits(octokit)
  if (!options.commitMode) {
    core.startGroup(`🚀 Load pull requests`)
    const pullRequestsApi = new PullRequests(octokit, commitsApi)
    const [info, prs] = await pullRequestsApi.getMergedPullRequests(options)
    mergedPullRequests = prs
    diffInfo = info
  } else {
    core.startGroup(`🚀 Load commit history`)
    core.info(`⚠️ Executing experimental commit mode`)
    const [info, prs] = await commitsApi.generateCommitPRs(options)
    mergedPullRequests = prs
    diffInfo = info
  }

  // define the included PRs within this release as output
  core.setOutput(
    'pull_requests',
    mergedPullRequests
      .map(pr => {
        return pr.number
      })
      .join(',')
  )
  core.setOutput('changed_files', diffInfo.changedFiles)
  core.setOutput('additions', diffInfo.additions)
  core.setOutput('deletions', diffInfo.deletions)
  core.setOutput('changes', diffInfo.changes)
  core.setOutput('commits', diffInfo.commits)

  if (exportCollected) {
    core.info('📦 Exporting collected data')
    core.exportVariable(`RCBA_EXPORT_diffInfo`, JSON.stringify(diffInfo))
    //fs.writeFileSync(path.resolve('diffInfo.json'), JSON.stringify(diffInfo))
    core.exportVariable(`RCBA_EXPORT_mergedPullRequests`, JSON.stringify(mergedPullRequests))
    //fs.writeFileSync(path.resolve('mergedPullRequests.json'), JSON.stringify(mergedPullRequests))
    core.exportVariable(`RCBA_EXPORT_options`, JSON.stringify(options))
    //fs.writeFileSync(path.resolve('options.json'), JSON.stringify(options))

    if (exportOnly) {
      core.endGroup()
      return null
    }
  }

  core.endGroup()

  return {
    diffInfo,
    mergedPullRequests,
    options
  }
}
