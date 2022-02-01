import * as core from '@actions/core'
import {Configuration, DefaultConfiguration} from './configuration'
import {Octokit} from '@octokit/rest'
import {ReleaseNotes} from './releaseNotes'
import {Tags} from './tags'
import {failOrError} from './utils'
import {fillAdditionalPlaceholders} from './transform'

export class ReleaseNotesBuilder {
  constructor(
    private baseUrl: string | null,
    private token: string | null,
    private repositoryPath: string,
    private owner: string | null,
    private repo: string | null,
    private fromTag: string | null,
    private toTag: string | null,
    private failOnError: boolean,
    private ignorePreReleases: boolean,
    private commitMode: boolean,
    private configuration: Configuration
  ) {}

  async build(): Promise<string | null> {
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

    // load octokit instance
    const octokit = new Octokit({
      auth: `token ${this.token || process.env.GITHUB_TOKEN}`,
      baseUrl: `${this.baseUrl || 'https://api.github.com'}`
    })

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
      this.configuration.max_tags_to_fetch ||
        DefaultConfiguration.max_tags_to_fetch,
      this.configuration.tag_resolver || DefaultConfiguration.tag_resolver
    )

    const thisTag = tagRange.to?.name
    if (!thisTag) {
      failOrError(`💥 Missing or couldn't resolve 'toTag'`, this.failOnError)
      return null
    } else {
      this.toTag = thisTag
      core.setOutput('toTag', thisTag)
      core.debug(`Resolved 'toTag' as ${thisTag}`)
    }

    const previousTag = tagRange.from?.name
    if (previousTag == null) {
      failOrError(
        `💥 Unable to retrieve previous tag given ${this.toTag}`,
        this.failOnError
      )
      return null
    }
    this.fromTag = previousTag
    core.setOutput('fromTag', previousTag)
    core.debug(`fromTag resolved via previousTag as: ${previousTag}`)
    core.endGroup()

    const options = {
      owner: this.owner,
      repo: this.repo,
      fromTag: this.fromTag,
      toTag: this.toTag,
      failOnError: this.failOnError,
      commitMode: this.commitMode,
      configuration: this.configuration
    }
    const releaseNotes = new ReleaseNotes(octokit, options)

    return (
      (await releaseNotes.pull()) ||
      fillAdditionalPlaceholders(
        this.configuration.empty_template ||
          DefaultConfiguration.empty_template,
        options
      )
    )
  }
}
