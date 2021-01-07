import * as core from '@actions/core'
import {
  retrieveRepositoryPath,
  resolveConfiguration,
  writeOutput
} from './utils'
import * as github from '@actions/github'
import {ReleaseNotesBuilder} from './releaseNotesBuilder'

async function run(): Promise<void> {
  core.setOutput('failed', false) // mark the action not failed by default

  core.startGroup(`📘 Reading input values`)
  try {
    // read in path specification, resolve github workspace, and repo path
    const inputPath = core.getInput('path')
    const repositoryPath = retrieveRepositoryPath(inputPath)

    // read in configuration file if possible
    const configurationFile: string = core.getInput('configuration')
    const configuration = resolveConfiguration(
      repositoryPath,
      configurationFile
    )

    // read in repository inputs
    const token = core.getInput('token')
    const owner = core.getInput('owner') || github.context.repo.owner
    const repo = core.getInput('repo') || github.context.repo.repo
    // read in from, to tag inputs
    const fromTag = core.getInput('fromTag')
    const toTag = core.getInput('toTag')
    // read in flags
    const ignorePreReleases = core.getInput('ignorePreReleases') === 'true'
    const failOnError = core.getInput('failOnError') === 'true'
    const commitMode = core.getInput('commitMode') === 'true'

    const result = await new ReleaseNotesBuilder(
      token,
      repositoryPath,
      owner,
      repo,
      fromTag,
      toTag,
      failOnError,
      ignorePreReleases,
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
  } catch (error) {
    core.setFailed(error.message)
  }
}

run()
