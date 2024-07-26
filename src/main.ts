import * as core from '@actions/core'
import * as github from '@actions/github'
import {mergeConfiguration, parseConfiguration, resolveConfiguration, resolveMode, retrieveRepositoryPath, writeOutput} from './utils'
import {ReleaseNotesBuilder} from './releaseNotesBuilder'
import {Configuration} from './configuration'
import {GithubRepository} from './repositories/GithubRepository'
import {GiteaRepository} from './repositories/GiteaRepository'

async function run(): Promise<void> {
  const supportedPlatform = {
    github: GithubRepository,
    gitea: GiteaRepository
  }
  function isSupportedPlatform(type: string): type is keyof typeof supportedPlatform {
    return type in supportedPlatform
  }

  core.setOutput('failed', false) // mark the action not failed by default
  core.startGroup(`📘 Reading input values`)

  try {
    // read in path specification, resolve github workspace, and repo path
    const platform = core.getInput('platform') || 'github'
    if (!isSupportedPlatform(platform)) {
      core.setFailed(`The ${platform} platform is not supported. `)
      return
    }

    const inputPath = core.getInput('path')
    const repositoryPath = retrieveRepositoryPath(inputPath)

    // read in configuration from json if possible
    let configJson: Configuration | undefined = undefined
    const configurationJson: string = core.getInput('configurationJson', {
      trimWhitespace: true
    })
    if (configurationJson) {
      configJson = parseConfiguration(configurationJson)
      if (configJson) {
        core.info(`ℹ️ Retrieved configuration via 'configurationJson'.`)
      }
    }
    // read in the configuration from the file if possible
    const configurationFile: string = core.getInput('configuration')
    const configFile = resolveConfiguration(repositoryPath, configurationFile)
    if (configFile) {
      core.info(`ℹ️ Retrieved configuration via 'configuration' (via file).`)
    }

    if (!configJson && !configFile) {
      core.info(`ℹ️ No configuration provided. Using Defaults.`)
    }

    // mode of the action (PR, COMMIT, HYBRID)
    const mode = resolveMode(core.getInput('mode'), core.getInput('commitMode') === 'true')
    core.info(`ℹ️ Running in ${mode} mode.`)

    // merge configs, use default values from DefaultConfig on missing definition
    const configuration = mergeConfiguration(configJson, configFile, mode)

    // read in repository inputs
    const baseUrl = core.getInput('baseUrl')
    const token = core.getInput('token') || process.env.GITHUB_TOKEN || ''
    const owner = core.getInput('owner') || github.context.repo.owner
    const repo = core.getInput('repo') || github.context.repo.repo
    // read in from, to tag inputs
    const fromTag = core.getInput('fromTag')
    const toTag = core.getInput('toTag')
    // read in flags
    const includeOpen = core.getInput('includeOpen') === 'true'
    const ignorePreReleases = core.getInput('ignorePreReleases') === 'true'
    const failOnError = core.getInput('failOnError') === 'true'
    const fetchViaCommits = core.getInput('fetchViaCommits') === 'true'
    const fetchReviewers = core.getInput('fetchReviewers') === 'true'
    const fetchReleaseInformation = core.getInput('fetchReleaseInformation') === 'true'
    const fetchReviews = core.getInput('fetchReviews') === 'true'
    const exportCache = core.getInput('exportCache') === 'true'
    const exportOnly = core.getInput('exportOnly') === 'true'
    const cache = core.getInput('cache')

    const repositoryUtils = new supportedPlatform[platform](token, baseUrl, repositoryPath)
    const result = await new ReleaseNotesBuilder(
      baseUrl,
      repositoryUtils,
      repositoryPath,
      owner,
      repo,
      fromTag,
      toTag,
      includeOpen,
      failOnError,
      ignorePreReleases,
      fetchViaCommits,
      fetchReviewers,
      fetchReleaseInformation,
      fetchReviews,
      mode,
      exportCache,
      exportOnly,
      cache,
      configuration
    ).build()

    core.setOutput('changelog', result)

    // write the result in changelog to file if possible
    const outputFile: string = core.getInput('outputFile')
    if (outputFile !== '') {
      core.debug(`Enabled writing the changelog to disk`)
      writeOutput(repositoryPath, outputFile, result)
    }
  } catch (error: any /* eslint-disable-line @typescript-eslint/no-explicit-any */) {
    core.setFailed(error.message)
    core.error(`🔥 Failed to generate changelog due to ${JSON.stringify(error)}`)
  }
}

run()
