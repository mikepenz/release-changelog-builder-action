import {Configuration, DefaultConfiguration} from './configuration'
import * as github from '@actions/github'
import * as core from '@actions/core'
import {createCommandManager} from './gitHelper'
import {failOrError} from './utils'
import {Octokit} from '@octokit/rest'
import {Tags} from './tags'
import {ReleaseNotes} from './releaseNotes'
import {fillAdditionalPlaceholders} from './transform'

export class ReleaseNotesBuilder {
  constructor(
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
    // ensure to resolve the toTag if it was not provided
    if (!this.toTag) {
      // if not specified try to retrieve tag from github.context.ref
      if (github.context.ref.startsWith('refs/tags/')) {
        this.toTag = github.context.ref.replace('refs/tags/', '')
        core.info(
          `🔖 Resolved current tag (${this.toTag}) from the 'github.context.ref'`
        )
      } else {
        // if not specified try to retrieve tag from git
        const gitHelper = await createCommandManager(this.repositoryPath)
        const latestTag = await gitHelper.latestTag()
        this.toTag = latestTag
        core.info(
          `🔖 Resolved current tag (${this.toTag}) from 'git rev-list --tags --skip=0 --max-count=1'`
        )
      }
    }

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

    if (!this.toTag) {
      failOrError(`💥 Missing or couldn't resolve 'toTag'`, this.failOnError)
      return null
    } else {
      core.setOutput('toTag', this.toTag)
      core.debug(`Resolved 'toTag' as ${this.toTag}`)
    }
    core.endGroup()

    // load octokit instance
    const octokit = new Octokit({
      auth: `token ${this.token || process.env.GITHUB_TOKEN}`
    })

    // ensure to resolve the fromTag if it was not provided specifically
    if (!this.fromTag) {
      core.startGroup(`🔖 Resolve previous tag`)
      core.debug(`fromTag undefined, trying to resolve via API`)
      const tagsApi = new Tags(octokit)

      const previousTag = await tagsApi.findPredecessorTag(
        this.owner,
        this.repo,
        this.toTag,
        this.ignorePreReleases,
        this.configuration.max_tags_to_fetch ||
          DefaultConfiguration.max_tags_to_fetch,
        this.configuration.tag_resolver || DefaultConfiguration.tag_resolver
      )
      if (previousTag == null) {
        failOrError(
          `💥 Unable to retrieve previous tag given ${this.toTag}`,
          this.failOnError
        )
        return null
      }
      this.fromTag = previousTag.name
      core.debug(`fromTag resolved via previousTag as: ${previousTag.name}`)
      core.endGroup()
    }

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
