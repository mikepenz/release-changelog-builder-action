import * as core from '@actions/core'
import {
  failOrError,
  retrieveRepositoryPath,
  resolveConfiguration
} from './utils'
import {ReleaseNotes} from './releaseNotes'
import {createCommandManager} from './gitHelper'
import * as github from '@actions/github'
import {DefaultConfiguration} from './configuration'

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
    const owner = core.getInput('owner') ?? github.context.repo.owner
    const repo = core.getInput('repo') ?? github.context.repo.repo
    // read in from, to tag inputs
    const fromTag = core.getInput('fromTag')
    let toTag = core.getInput('toTag')
    // read in flags
    const ignorePreReleases = core.getInput('ignorePreReleases') === 'true'
    const failOnError = core.getInput('failOnError') === 'true'

    // ensure to resolve the toTag if it was not provided
    if (!toTag) {
      // if not specified try to retrieve tag from github.context.ref
      if (github.context.ref.startsWith('refs/tags/')) {
        toTag = github.context.ref.replace('refs/tags/', '')
        core.info(
          `🔖 Resolved current tag (${toTag}) from the 'github.context.ref'`
        )
      } else {
        // if not specified try to retrieve tag from git
        const gitHelper = await createCommandManager(repositoryPath)
        const latestTag = await gitHelper.latestTag()
        toTag = latestTag
        core.info(
          `🔖 Resolved current tag (${toTag}) from 'git rev-list --tags --skip=0 --max-count=1'`
        )
      }
    }

    if (!owner) {
      failOrError(`💥 Missing or couldn't resolve 'owner'`, failOnError)
      return
    } else {
      core.setOutput('owner', owner)
      core.debug(`Resolved 'owner' as ${owner}`)
    }

    if (!repo) {
      failOrError(`💥 Missing or couldn't resolve 'owner'`, failOnError)
      return
    } else {
      core.setOutput('repo', repo)
      core.debug(`Resolved 'repo' as ${repo}`)
    }

    if (!toTag) {
      failOrError(`💥 Missing or couldn't resolve 'toTag'`, failOnError)
      return
    } else {
      core.setOutput('toTag', toTag)
      core.debug(`Resolved 'toTag' as ${toTag}`)
    }
    core.endGroup()

    const releaseNotes = new ReleaseNotes({
      owner,
      repo,
      fromTag,
      toTag,
      ignorePreReleases,
      failOnError,
      configuration
    })

    core.setOutput(
      'changelog',
      (await releaseNotes.pull(token)) ??
        configuration.empty_template ??
        DefaultConfiguration.empty_template
    )
  } catch (error) {
    core.setFailed(error.message)
  }
}

run()
