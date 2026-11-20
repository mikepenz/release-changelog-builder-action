import {TagInfo} from '../pr-collector/tags.js'
import {DiffInfo} from '../pr-collector/commits.js'
import {PullRequestInfo} from '../pr-collector/pullRequests.js'
import * as core from '@actions/core'
import {createCommandManager} from '../pr-collector/gitHelper.js'
import moment from 'moment'

export abstract class BaseRepository {
  proxy?: string
  noProxyArray: string[]

  // Define an abstract getter for the default URL
  abstract get defaultUrl(): string

  // Define the abstract getter for the home URL (also used for some replace patterns)
  abstract get homeUrl(): string

  // Optional explicit web url of the instance, takes precedence over the url derived from `url`
  protected homeUrlOverride?: string

  protected constructor(
    protected token: string,
    protected url: string | undefined,
    protected repositoryPath: string,
    homeUrl?: string
  ) {
    this.homeUrlOverride = homeUrl?.trim().replace(/\/+$/, '') || undefined
    this.proxy = process.env.https_proxy || process.env.HTTPS_PROXY
    const noProxy = process.env.no_proxy || process.env.NO_PROXY
    this.noProxyArray = []
    if (noProxy) {
      this.noProxyArray = noProxy.split(',')
    }
  }

  abstract getTags(owner: string, repo: string, maxTagsToFetch: number): Promise<TagInfo[]>

  abstract fillTagInformation(repositoryPath: string, owner: string, repo: string, tagInfo: TagInfo): Promise<TagInfo>

  abstract getDiffRemote(owner: string, repo: string, base: string, head: string, includeOnlyPaths?: string[] | null): Promise<DiffInfo>

  abstract getForCommitHash(owner: string, repo: string, commit_sha: string, maxPullRequests: number): Promise<PullRequestInfo[]>

  abstract getBetweenDates(
    owner: string,
    repo: string,
    fromDate: moment.Moment,
    toDate: moment.Moment,
    maxPullRequests: number
  ): Promise<PullRequestInfo[]>

  abstract getOpen(owner: string, repo: string, maxPullRequests: number): Promise<PullRequestInfo[]>

  abstract getReviews(owner: string, repo: string, pr: PullRequestInfo): Promise<void>

  /**
   * Identifies the authors who did not have a pull request merged into the repository before the given date.
   *
   * @param firstMerges maps each author to the merge date of their earliest pull request in this release
   * @returns the authors without any pull request merged before that date
   */
  abstract getNewContributors(owner: string, repo: string, firstMerges: Map<string, moment.Moment>): Promise<Set<string>>

  protected async getTagByCreateTime(repositoryPath: string, tagInfo: TagInfo): Promise<TagInfo> {
    core.info(`⚠️ No release information found for ${tagInfo.name}, trying to retrieve tag creation time as fallback.`)
    const gitHelper = await createCommandManager(repositoryPath)
    const creationTimeString = await gitHelper.tagCreation(tagInfo.name)
    const creationTime = moment(creationTimeString)
    if (creationTimeString !== null && creationTime.isValid()) {
      tagInfo.date = creationTime
      core.info(
        `ℹ️ Resolved tag creation time (${creationTimeString}) from 'git for-each-ref --format="%(creatordate:rfc)" "refs/tags/${tagInfo.name}`
      )
    } else {
      core.info(
        `⚠️ Could not retrieve tag creation time via git cli 'git for-each-ref --format="%(creatordate:rfc)" "refs/tags/${tagInfo.name}'`
      )
    }
    return tagInfo
  }
}
