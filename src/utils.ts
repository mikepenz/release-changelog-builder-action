import * as core from '@actions/core'
import * as fs from 'fs'
import * as path from 'path'
import {Configuration, DefaultConfiguration} from './configuration'
import {ReleaseNotesData, ReleaseNotesOptions} from './releaseNotesBuilder'
import {DiffInfo} from './commits'
import {PullRequestInfo} from './pullRequests'
import moment from 'moment'
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
export function failOrError(message: string | Error, failOnError: boolean): void {
  // if we report any failure, consider the action to have failed, may not make the build fail
  core.setOutput('failed', true)
  if (failOnError) {
    core.setFailed(message)
  } else {
    core.error(message)
  }
}

/**
 * Retrieves the exported information from a previous run of the `release-changelog-builder-action`.
 * If available, return a [ReleaseNotesData].
 */
export function checkExportedData(): ReleaseNotesData | null {
  const rawDiffInfo = process.env[`RCBA_EXPORT_diffInfo`]
  const rawMergedPullRequests = process.env[`RCBA_EXPORT_mergedPullRequests`]
  const rawOptions = process.env[`RCBA_EXPORT_options`]

  if (rawDiffInfo && rawMergedPullRequests && rawOptions) {
    const diffInfo: DiffInfo = JSON.parse(rawDiffInfo)
    const mergedPullRequests: PullRequestInfo[] = JSON.parse(rawMergedPullRequests)

    for (const pr of mergedPullRequests) {
      pr.createdAt = moment(pr.createdAt)
      if (pr.mergedAt) {
        pr.mergedAt = moment(pr.mergedAt)
      }

      if (pr.reviews) {
        for (const review of pr.reviews) {
          if (review.submittedAt) {
            review.submittedAt = moment(review.submittedAt)
          }
        }
      }
    }

    const options: ReleaseNotesOptions = JSON.parse(rawOptions)
    return {
      diffInfo,
      mergedPullRequests,
      options
    }
  } else {
    return null
  }
}

/**
 * Retrieves the configuration given the file path, if not found it will fallback to the `DefaultConfiguration`
 */
export function resolveConfiguration(githubWorkspacePath: string, configurationFile: string): Configuration | undefined {
  if (configurationFile) {
    const configurationPath = path.resolve(githubWorkspacePath, configurationFile)
    core.debug(`configurationPath = '${configurationPath}'`)
    const providedConfiguration = readConfiguration(configurationPath)
    if (providedConfiguration) {
      const configuration = providedConfiguration
      core.info(`ℹ️ Configuration successfully loaded.`)
      if (core.isDebug()) {
        core.debug(`configuration = ${JSON.stringify(configuration)}`)
      }
      return configuration
    } else {
      core.debug(`Configuration file could not be read.`)
    }
  } else {
    core.debug(`Configuration file not provided.`)
  }
  return undefined
}

/**
 * Reads in the configuration from the JSON file
 */
function readConfiguration(filename: string): Configuration | undefined {
  try {
    const rawdata = fs.readFileSync(filename, 'utf8')
    if (rawdata) {
      return parseConfiguration(rawdata)
    }
  } catch (error) {
    core.debug(`Failed to load configuration due to: ${error}`)
  }
  core.info(`⚠️ Configuration provided, but it couldn't be found. Fallback to Defaults.`)
  return undefined
}
/**
 * Parses the configuration from the JSON file
 */
export function parseConfiguration(config: string): Configuration | undefined {
  try {
    // for compatiblity with the `yml` file we require to use `#{{}}` instead of `${{}}` - replace it here.
    const configurationJSON: Configuration = JSON.parse(config.replace(/#{{/g, '${{'))
    return configurationJSON
  } catch (error) {
    core.info(`⚠️ Configuration provided, but it couldn't be parsed. Fallback to Defaults.`)
    return undefined
  }
}

/**
 * Merges the configurations, will fallback to the DefaultConfiguration value
 */
export function mergeConfiguration(jc?: Configuration, fc?: Configuration): Configuration {
  return {
    max_tags_to_fetch: jc?.max_tags_to_fetch || fc?.max_tags_to_fetch || DefaultConfiguration.max_tags_to_fetch,
    max_pull_requests: jc?.max_pull_requests || fc?.max_pull_requests || DefaultConfiguration.max_pull_requests,
    max_back_track_time_days: jc?.max_back_track_time_days || fc?.max_back_track_time_days || DefaultConfiguration.max_back_track_time_days,
    exclude_merge_branches: jc?.exclude_merge_branches || fc?.exclude_merge_branches || DefaultConfiguration.exclude_merge_branches,
    sort: jc?.sort || fc?.sort || DefaultConfiguration.sort,
    template: jc?.template || fc?.template || DefaultConfiguration.template,
    pr_template: jc?.pr_template || fc?.pr_template || DefaultConfiguration.pr_template,
    empty_template: jc?.empty_template || fc?.empty_template || DefaultConfiguration.empty_template,
    categories: jc?.categories || fc?.categories || DefaultConfiguration.categories,
    ignore_labels: jc?.ignore_labels || fc?.ignore_labels || DefaultConfiguration.ignore_labels,
    label_extractor: jc?.label_extractor || fc?.label_extractor || DefaultConfiguration.label_extractor,
    duplicate_filter: jc?.duplicate_filter || fc?.duplicate_filter || DefaultConfiguration.duplicate_filter,
    transformers: jc?.transformers || fc?.transformers || DefaultConfiguration.transformers,
    tag_resolver: jc?.tag_resolver || fc?.tag_resolver || DefaultConfiguration.tag_resolver,
    base_branches: jc?.base_branches || fc?.base_branches || DefaultConfiguration.base_branches,
    custom_placeholders: jc?.custom_placeholders || fc?.custom_placeholders || DefaultConfiguration.custom_placeholders,
    trim_values: jc?.trim_values || fc?.trim_values || DefaultConfiguration.trim_values
  }
}

/**
 * Checks if a given directory exists
 */
export function directoryExistsSync(inputPath: string, required?: boolean): boolean {
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

    throw new Error(`Encountered an error when checking whether path '${inputPath}' exists: ${error.message}`)
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
export function writeOutput(githubWorkspacePath: string, outputFile: string, changelog: string | null): void {
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

export function createOrSet<T>(map: Map<string, T[]>, key: string, value: T): void {
  const entry = map.get(key)
  if (!entry) {
    map.set(key, [value])
  } else {
    entry.push(value)
  }
}

export function haveCommonElements(arr1: string[], arr2: Set<string>): boolean {
  return arr1.some(item => arr2.has(item))
}

export function haveCommonElementsArr(arr1: string[], arr2: string[]): boolean {
  return haveCommonElements(arr1, new Set(arr2))
}

export function haveEveryElements(arr1: string[], arr2: Set<string>): boolean {
  return arr1.every(item => arr2.has(item))
}

export function haveEveryElementsArr(arr1: string[], arr2: string[]): boolean {
  return haveEveryElements(arr1, new Set(arr2))
}
