import * as core from '@actions/core'
import {readConfiguration} from './utils'
import {ReleaseNotes} from './releaseNotes'
import {createCommandManager} from './gitHelper'
import * as github from '@actions/github'
import * as path from 'path'
import {DefaultConfiguration} from './configuration'

async function run(): Promise<void> {
  core.startGroup(`📘 Reading input values`)
  try {
    let githubWorkspacePath = process.env['GITHUB_WORKSPACE']
    if (!githubWorkspacePath) {
      throw new Error('GITHUB_WORKSPACE not defined')
    }
    githubWorkspacePath = path.resolve(githubWorkspacePath)
    core.debug(`GITHUB_WORKSPACE = '${githubWorkspacePath}'`)

    let repositoryPath = core.getInput('path') || '.'
    repositoryPath = path.resolve(githubWorkspacePath, repositoryPath)
    core.debug(`repositoryPath = '${repositoryPath}'`)

    const configurationFile: string = core.getInput('configuration')
    let configuration = DefaultConfiguration
    if (configurationFile) {
      const configurationPath = path.resolve(
        githubWorkspacePath,
        configurationFile
      )
      core.debug(`configurationPath = '${configurationPath}'`)
      const providedConfiguration = readConfiguration(configurationPath)
      if (!providedConfiguration) {
        core.info(
          `⚠️ Configuration provided, but it couldn't be found, or failed to parse. Fallback to Defaults`
        )
      } else {
        configuration = providedConfiguration
      }
    }

    const token = core.getInput('token')
    let owner = core.getInput('owner')
    let repo = core.getInput('repo')

    const fromTag = core.getInput('fromTag')
    let toTag = core.getInput('toTag')

    const ignorePreReleases = core.getInput('ignorePreReleases')

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

    if (!owner || !repo) {
      // Qualified repository
      const qualifiedRepository =
        core.getInput('repository') ||
        `${github.context.repo.owner}/${github.context.repo.repo}`
      core.debug(`qualified repository = '${qualifiedRepository}'`)
      const splitRepository = qualifiedRepository.split('/')
      if (
        splitRepository.length !== 2 ||
        !splitRepository[0] ||
        !splitRepository[1]
      ) {
        throw new Error(
          `Invalid repository '${qualifiedRepository}'. Expected format {owner}/{repo}.`
        )
      }
      owner = splitRepository[0]
      repo = splitRepository[1]
    }

    if (!owner) {
      core.error(`💥 Missing or couldn't resolve 'owner'`)
      return
    } else {
      core.setOutput('owner', owner)
      core.debug(`Resolved 'owner' as ${owner}`)
    }

    if (!repo) {
      core.error(`💥 Missing or couldn't resolve 'owner'`)
      return
    } else {
      core.setOutput('repo', repo)
      core.debug(`Resolved 'repo' as ${repo}`)
    }

    if (!toTag) {
      core.error(`💥 Missing or couldn't resolve 'toTag'`)
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
      ignorePreReleases: ignorePreReleases === 'true',
      configuration
    })

    core.setOutput('changelog', await releaseNotes.pull(token))
  } catch (error) {
    core.setFailed(error.message)
  }
}

run()
