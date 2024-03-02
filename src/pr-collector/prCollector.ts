import * as core from '@actions/core'
import {PullConfiguration} from './types'
import {TagInfo, Tags} from './tags'
import {failOrError} from './utils'
import {PullRequestInfo, PullRequests} from './pullRequests'
import {Commits, DefaultDiffInfo, DiffInfo, convertCommitsToPrs} from './commits'
import {BaseRepository} from '../repositories/BaseRepository'

export interface Options {
  owner: string // the owner of the repository
  repo: string // the repository
  fromTag: TagInfo // the tag/ref to start from
  toTag: TagInfo // the tag/ref up to
  includeOpen: boolean // defines if we should also fetch open pull requests
  failOnError: boolean // defines if we should fail the action in case of an error
  fetchViaCommits: boolean // defines if PRs are fetched via the commits identified. This will do 1 API request per commit -> Best for scenarios with squash merges | Or shorter from-to diffs (< 10 commits) | Also effective for shorters diffs for very old PRs
  fetchReviewers: boolean // defines if the action should fetch the reviewers for PRs - approved reviewers are not included in the default PR listing
  fetchReleaseInformation: boolean // defines if the action should fetch the release information for the from and to tag - e.g. the creation date for the associated release
  fetchReviews: boolean // defines if the action should fetch the reviews for the PR.
  mode: 'PR' | 'COMMIT' | 'HYBRID' // defines the mode used. note: the commit or hybrid modes are not fully supported
  configuration: PullConfiguration // the configuration as defined in `configuration.ts`
}

export interface Data {
  diffInfo: DiffInfo
  mergedPullRequests: PullRequestInfo[]
  fromTag: TagInfo
  toTag: TagInfo
}

export class PullRequestCollector {
  constructor(
    private baseUrl: string | null,
    private repositoryUtils: BaseRepository,
    private repositoryPath: string,
    private owner: string,
    private repo: string,
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
    private configuration: PullConfiguration
  ) {}

  async build(): Promise<Data | null> {
    // check proxy setup for GHES environments

    // ensure proper from <-> to tag range
    core.startGroup(`🔖 Resolve tags`)
    const tagsApi = new Tags(this.repositoryUtils)
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
      core.debug(`Resolved 'toTag' as ${thisTag.name}`)
    }

    let previousTag = tagRange.from
    if (previousTag == null) {
      failOrError(`💥 Unable to retrieve previous tag given ${this.toTag}`, this.failOnError)
      return null
    }
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

    return await pullData(this.repositoryUtils, {
      owner: this.owner,
      repo: this.repo,
      fromTag: previousTag,
      toTag: thisTag,
      includeOpen: this.includeOpen,
      failOnError: this.failOnError,
      fetchViaCommits: this.fetchViaCommits,
      fetchReviewers: this.fetchReviewers,
      fetchReleaseInformation: this.fetchReleaseInformation,
      fetchReviews: this.fetchReviews,
      mode: this.mode,
      configuration: this.configuration
    })
  }
}

export async function pullData(repositoryUtils: BaseRepository, options: Options): Promise<Data | null> {
  let mergedPullRequests: PullRequestInfo[] = []
  let diffInfo: DiffInfo = Object.assign({}, DefaultDiffInfo)

  const commitsApi = new Commits(repositoryUtils)

  core.startGroup(`🚀 Load data`)
  if (options.mode === 'COMMIT') {
    core.info(`🚀 Load commit history (⚠️ Executing experimental commit mode)`)
    const [info, prs] = await commitsApi.generateCommitPRs(options)
    mergedPullRequests = mergedPullRequests.concat(prs)
    diffInfo = info
  } else {
    // PR mode, HYBRID mode
    core.info(`🚀 Load pull requests`)
    const pullRequestsApi = new PullRequests(repositoryUtils, commitsApi)
    const [info, prs] = await pullRequestsApi.getMergedPullRequests(options)
    mergedPullRequests = prs
    diffInfo = info

    if (options.mode === 'HYBRID') {
      core.info(`🚀 Converting commits to pull requests`)
      const [, fakeCommitPrs] = convertCommitsToPrs(options, info)
      mergedPullRequests = mergedPullRequests.concat(fakeCommitPrs)
    }
  }
  core.endGroup()

  return {
    diffInfo,
    mergedPullRequests,
    fromTag: options.fromTag,
    toTag: options.toTag
  }
}
