import * as core from '@actions/core'
import * as fs from 'fs'
import * as path from 'path'
import {Configuration, DefaultConfiguration} from './configuration'

/**
 * Resolves the repository path, relatively to the GITHUB_WORKSPACE
 */
export function retrieveRepositoryPath(providedPath: string): string {
  let githubWorkspacePath = process.env['GITHUB_WORKSPACE']
  if (!githubWorkspacePath) {
    throw new Error('GITHUB_WORKSPACE not defined')
  }
  githubWorkspacePath = path.resolve(githubWorkspacePath)
  core.debug(`GITHUB_WORKSPACE = '${githubWorkspacePath}'`)

  let repositoryPath = providedPath || '.'
  repositoryPath = path.resolve(githubWorkspacePath, repositoryPath)
  core.debug(`repositoryPath = '${repositoryPath}'`)
  return repositoryPath
}

/**
 * Will automatically either report the message to the log, or mark the action as failed. Additionally defining the output failed, allowing it to be read in by other actions
 */
export function failOrError(
  message: string | Error,
  failOnError: boolean
): void {
  // if we report any failure, consider the action to have failed, may not make the build fail
  core.setOutput('failed', true)
  if (failOnError) {
    core.setFailed(message)
  } else {
    core.error(message)
  }
}

/**
 * Retrieves the configuration given the file path, if not found it will fallback to the `DefaultConfiguration`
 */
export function resolveConfiguration(
  githubWorkspacePath: string,
  configurationFile: string
): Configuration {
  let configuration = DefaultConfiguration
  if (configurationFile) {
    const configurationPath = path.resolve(
      githubWorkspacePath,
      configurationFile
    )
    core.debug(`configurationPath = '${configurationPath}'`)
    const providedConfiguration = readConfiguration(configurationPath)
    if (providedConfiguration) {
      configuration = providedConfiguration
      core.info(`ℹ️ Configuration successfully loaded.`)
      if (core.isDebug()) {
        core.debug(`configuration = ${JSON.stringify(configuration)}`)
      }
    }
  } else {
    core.info(`ℹ️ Configuration not provided. Using Defaults.`)
  }
  return configuration
}

/**
 * Reads in the configuration from the JSON file
 */
function readConfiguration(filename: string): Configuration | null {
  let rawdata: string
  try {
    rawdata = fs.readFileSync(filename, 'utf8')
  } catch (error) {
    core.info(
      `⚠️ Configuration provided, but it couldn't be found. Fallback to Defaults.`
    )
    return null
  }
  try {
    const configurationJSON: Configuration = JSON.parse(rawdata)
    return configurationJSON
  } catch (error) {
    core.info(
      `⚠️ Configuration provided, but it couldn't be parsed. Fallback to Defaults.`
    )
    return null
  }
}

/**
 * Checks if a given directory exists
 */
export function directoryExistsSync(
  inputPath: string,
  required?: boolean
): boolean {
  if (!inputPath) {
    throw new Error("Arg 'path' must not be empty")
  }

  let stats: fs.Stats
  try {
    stats = fs.statSync(inputPath)
  } catch (error: any /* eslint-disable-line @typescript-eslint/no-explicit-any */) {
    if (error.code === 'ENOENT') {
      if (!required) {
        return false
      }

      throw new Error(`Directory '${inputPath}' does not exist`)
    }

    throw new Error(
      `Encountered an error when checking whether path '${inputPath}' exists: ${error.message}`
    )
  }

  if (stats.isDirectory()) {
    return true
  } else if (!required) {
    return false
  }

  throw new Error(`Directory '${inputPath}' does not exist`)
}

/**
 * Writes the changelog to the given the file
 */
export function writeOutput(
  githubWorkspacePath: string,
  outputFile: string,
  changelog: string | null
): void {
  if (outputFile && changelog) {
    const outputPath = path.resolve(githubWorkspacePath, outputFile)
    core.debug(`outputPath = '${outputPath}'`)
    try {
      fs.writeFileSync(outputPath, changelog)
    } catch (error: any /* eslint-disable-line @typescript-eslint/no-explicit-any */) {
      core.warning(`⚠️ Could not write the file to disk - ${error.message}`)
    }
  }
}

export type Unpacked<T> = T extends (infer U)[] ? U : T
