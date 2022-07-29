import * as core from '@actions/core'
import * as github from '@actions/github'
import {
  parseConfiguration,
  resolveConfiguration,
  retrieveRepositoryPath,
  writeOutput
} from './utils'
import {ReleaseNotesBuilder} from './releaseNotesBuilder'
import {Configuration} from './configuration'

async function run(): Promise<void> {
  core.setOutput('failed', false) // mark the action not failed by default

  core.startGroup(`📘 Reading input values`)
  try {
    // read in path specification, resolve github workspace, and repo path
    const inputPath = core.getInput('path')
    const repositoryPath = retrieveRepositoryPath(inputPath)

    // read in configuration file if possible
    let configuration: Configuration | undefined = undefined
    const configurationJson: string = core.getInput('configurationJson', {
      trimWhitespace: true
    })
    if (configurationJson) {
      configuration = parseConfiguration(configurationJson)
    }
    if (!configuration) {
      const configurationFile: string = core.getInput('configuration')
      configuration = resolveConfiguration(repositoryPath, configurationFile)
    }

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
    const fetchReviewers = core.getInput('fetchReviewers') === 'true'
    const fetchReleaseInformation =
      core.getInput('fetchReleaseInformation') === 'true'
    const commitMode = core.getInput('commitMode') === 'true'

    const result = await new ReleaseNotesBuilder(
      baseUrl,
      token,
      repositoryPath,
      owner,
      repo,
      fromTag,
      toTag,
      includeOpen,
      failOnError,
      ignorePreReleases,
      fetchReviewers,
      fetchReleaseInformation,
      commitMode,
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
  }
}

run()
