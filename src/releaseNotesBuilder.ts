import * as core from '@actions/core'
import {Configuration} from './configuration'
import {checkExportedData, writeCacheData} from './utils'
import {buildChangelog, PullRequestData} from './transform'
import {PullRequestCollector} from './pr-collector/prCollector'
import {failOrError} from './pr-collector/utils'
import {TagInfo} from './pr-collector/tags'
import {DiffInfo} from './pr-collector/commits'
import {PullRequestInfo} from './pr-collector/pullRequests'
import {BaseRepository} from './repositories/BaseRepository'

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
  mode: 'PR' | 'COMMIT' | 'HYBRID' // defines the mode used. note: the commit or hybrid modes are not fully supported
  configuration: Configuration // the configuration as defined in `configuration.ts`
  repositoryUtils: BaseRepository // the repository implementation used to generate the changelog
}

export interface Data {
  diffInfo: DiffInfo
  mergedPullRequests: PullRequestInfo[]
  options: ReleaseNotesOptions
}

export class ReleaseNotesBuilder {
  constructor(
    private baseUrl: string | null,
    private repositoryUtils: BaseRepository,
    private repositoryPath: string,
    private owner: string | null,
    private repo: string | null,
    private fromTag: string | null,
    private toTag: string | null,
    private includeOpen = false,
    private failOnError: boolean,
    private ignorePreReleases: boolean,
    private fetchViaCommits = false,
    private fetchReviewers = false,
    private fetchReleaseInformation = false,
    private fetchReviews = false,
    private mode: 'PR' | 'COMMIT' | 'HYBRID' = 'PR',
    private exportCache = false,
    private exportOnly = false,
    private cache: string | null = null,
    private configuration: Configuration
  ) {}

  async build(): Promise<string | null> {
    let releaseNotesData: Data | null
    try {
      releaseNotesData = checkExportedData(this.exportCache, this.cache)
    } catch (error) {
      failOrError(`${error}`, this.failOnError)
      return null
    }
    if (releaseNotesData == null) {
      if (!this.owner) {
        failOrError(`💥 Missing or couldn't resolve 'owner'`, this.failOnError)
        return null
      } else {
        core.debug(`Resolved 'owner' as ${this.owner}`)
      }

      if (!this.repo) {
        failOrError(`💥 Missing or couldn't resolve 'owner'`, this.failOnError)
        return null
      } else {
        core.debug(`Resolved 'repo' as ${this.repo}`)
      }
      core.endGroup()

      const prData = await new PullRequestCollector(
        this.baseUrl,
        this.repositoryUtils,
        this.repositoryPath,
        this.owner,
        this.repo,
        this.fromTag,
        this.toTag,
        this.includeOpen,
        this.failOnError,
        this.ignorePreReleases,
        this.fetchViaCommits,
        this.fetchReviewers,
        this.fetchReleaseInformation,
        this.fetchReviews,
        this.mode,
        this.configuration
      ).build()

      if (prData == null) {
        return null
      }

      const options: ReleaseNotesOptions = {
        owner: this.owner,
        repo: this.repo,
        fromTag: prData.fromTag,
        toTag: prData.toTag,
        includeOpen: this.includeOpen,
        failOnError: this.failOnError,
        fetchReviewers: this.fetchReviewers,
        fetchReleaseInformation: this.fetchReleaseInformation,
        fetchReviews: this.fetchReviews,
        mode: this.mode,
        configuration: this.configuration,
        repositoryUtils: this.repositoryUtils
      }
      const mergedPullRequests = prData.mergedPullRequests
      const diffInfo = prData.diffInfo
      this.setOutputs(options, diffInfo, mergedPullRequests)

      if (this.exportCache) {
        const cacheData = {
          mergedPullRequests,
          diffInfo,
          options
        }

        writeCacheData(cacheData, this.cache)

        if (this.exportOnly) {
          core.info(`ℹ️ Enabled 'exportOnly' will not generate changelog`)
          core.endGroup()
          return null
        }
      }

      return buildChangelog(diffInfo, mergedPullRequests, options)
    } else {
      core.info(`ℹ️ Retrieved previously cache data`)

      // merge input with options (in case some data was updated)
      const diffInfo = releaseNotesData.diffInfo
      const mergedPullRequests = releaseNotesData.mergedPullRequests
      const orgOptions = releaseNotesData.options

      // merge fromTag info with provided info || otherwise use cached info
      const fromTag: TagInfo = orgOptions.fromTag
      if (this.fromTag) {
        fromTag.name = this.fromTag
      }
      const toTag: TagInfo = orgOptions.toTag
      if (this.toTag) {
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
        mode: this.mode || orgOptions.mode,
        configuration: this.configuration || orgOptions.configuration,
        repositoryUtils: this.repositoryUtils || orgOptions.repositoryUtils
      }

      this.setOutputs(options, diffInfo, mergedPullRequests)
      return buildChangelog(diffInfo, mergedPullRequests, options)
    }
  }

  setOutputs(options: ReleaseNotesOptions, diffInfo: DiffInfo, mergedPullRequests: PullRequestData[]): void {
    core.setOutput('owner', options.owner)
    core.setOutput('repo', options.repo)
    core.setOutput('toTag', options.toTag.name)
    core.setOutput('fromTag', options.fromTag.name)

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
  }
}
