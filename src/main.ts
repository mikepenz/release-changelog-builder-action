import * as core from '@actions/core'
import * as github from '@actions/github'
import {mergeConfiguration, parseConfiguration, resolveConfiguration, retrieveRepositoryPath, writeOutput} from './utils'
import {ReleaseNotesBuilder} from './releaseNotesBuilder'
import {Configuration} from './configuration'
import {Octokit} from '@octokit/rest'
import {Submodules} from './submodules'

async function run(): Promise<void> {
  core.setOutput('failed', false) // mark the action not failed by default

  core.startGroup(`📘 Reading input values`)
  try {
    // read in path specification, resolve github workspace, and repo path
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
        core.info(`ℹ️ Retreived configuration via 'configurationJson'.`)
      }
    }
    // read in the configuration from the file if possible
    const configurationFile: string = core.getInput('configuration')
    const configFile = resolveConfiguration(repositoryPath, configurationFile)
    if (configFile) {
      core.info(`ℹ️ Retreived configuration via 'configuration' (via file).`)
    }

    if (!configJson && !configFile) {
      core.info(`ℹ️ No configuration provided. Using Defaults.`)
    }

    // merge configs, use default values from DefaultConfig on missing definition
    const configuration = mergeConfiguration(configJson, configFile)

    // read in repository inputs
    const baseUrl = core.getInput('baseUrl')
    const token = core.getInput('token')
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
    const commitMode = core.getInput('commitMode') === 'true'
    const exportCache = core.getInput('exportCache') === 'true'
    const exportOnly = core.getInput('exportOnly') === 'true'

    // read in the optional text
    const text = core.getInput('text') || ''

    // load octokit instance
    const octokit = new Octokit({
      auth: `token ${token || process.env.GITHUB_TOKEN}`,
      baseUrl: `${baseUrl || 'https://api.github.com'}`
    })

    const mainBuilder = new ReleaseNotesBuilder(
      octokit,
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
      commitMode,
      exportCache,
      exportOnly,
      configuration,
      text
    )

    let result = await mainBuilder.build()
    let appendix = ''

    if (configuration.submodule_paths && configuration.submodule_paths.length > 0) {
      configuration.template = configuration.submodule_template
      configuration.empty_template = configuration.submodule_empty_template

      const submodules = await new Submodules(octokit, failOnError).getSubmodules(
        owner,
        repo,
        mainBuilder.getFromTag(),
        mainBuilder.getToTag(),
        configuration.submodule_paths
      )

      for (const submodule of submodules) {
        core.info(`⚙️ Indexing submodule '${submodule.repo}'...`)
        const notes = await new ReleaseNotesBuilder(
          octokit,
          submodule.path,
          submodule.owner,
          submodule.repo,
          submodule.baseRef,
          submodule.headRef,
          includeOpen,
          failOnError,
          ignorePreReleases,
          fetchViaCommits,
          fetchReviewers,
          fetchReleaseInformation,
          fetchReviews,
          commitMode,
          exportCache,
          exportOnly,
          configuration,
          text
        ).build()
        appendix += notes
      }

      result = `${result}${appendix}`
    }

    core.setOutput('changelog', result)

    // Debugging...
    core.info(`${result}`)

    // write the result in changelog to file if possible
    const outputFile: string = core.getInput('outputFile')
    if (outputFile !== '') {
      core.debug(`Enabled writing the changelog to disk`)
      writeOutput(repositoryPath, outputFile, result)
    }
  } catch (error: any /* eslint-disable-line @typescript-eslint/no-explicit-any */) {
    core.setFailed(error.message)
  }
}

run()
