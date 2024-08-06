import * as core from '@actions/core'
import * as fs from 'fs'
import * as path from 'path'
import {Configuration, DefaultCommitConfiguration, DefaultConfiguration} from './configuration'
import moment from 'moment'
import {DiffInfo} from './pr-collector/commits'
import {PullRequestInfo} from './pr-collector/pullRequests'
import {Data, ReleaseNotesOptions} from './releaseNotesBuilder'
import {env} from 'process'

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

export function writeCacheData(data: Data, cacheOutput: string | null): void {
  let cacheFile: string

  if (cacheOutput && !cacheOutput.startsWith('{')) {
    // legacy handling, originally we allowed cache as direct string.
    // However, this can result in a "Argument list too long" exception for very long caches
    cacheFile = cacheOutput
  } else {
    if (env.RUNNER_TEMP && !fs.existsSync(env.RUNNER_TEMP)) {
      fs.mkdirSync(env.RUNNER_TEMP)
    }
    cacheFile = `${env.RUNNER_TEMP}/rcba-cache.json`
    core.debug(`Defined cacheFile as ${cacheFile}`)
  }

  try {
    // use replacer to not cache the repositoryUtils (as that would contain token information)
    fs.writeFileSync(cacheFile, JSON.stringify(data, replacer))
    core.setOutput(`cache`, cacheFile)
  } catch (error) {
    core.warning(`Failed to write cache file. (${error})`)
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function replacer(key: string, value: any): any {
  if (key === 'repositoryUtils') return undefined
  if (key === 'token') return undefined
  else return value
}

/**
 * Retrieves the exported information from a previous run of the `release-changelog-builder-action`.
 * If available, return a [ReleaseNotesData].
 */
export function checkExportedData(exportCache: boolean, cacheInput: string | null): Data | null {
  if (exportCache) {
    return null
  }
  if (cacheInput) {
    // legacy handling, originally we allowed cache as direct string.
    // However, this can result in a "Argument list too long" exception for very long caches
    const legacyJsonCache = cacheInput.startsWith('{')

    let cache: Data
    if (legacyJsonCache) {
      cache = JSON.parse(cacheInput)
    } else {
      if (!fs.existsSync(cacheInput)) {
        throw new Error(`💥 The provided cache file does not exist`)
      } else {
        cache = JSON.parse(fs.readFileSync(cacheInput, 'utf8'))
      }
    }

    const diffInfo: DiffInfo = cache.diffInfo
    const mergedPullRequests: PullRequestInfo[] = cache.mergedPullRequests

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

    const options: ReleaseNotesOptions = cache.options

    if (options.fromTag.date) {
      options.fromTag.date = moment(options.fromTag.date)
    }
    if (options.toTag.date) {
      options.toTag.date = moment(options.toTag.date)
    }

    return {
      diffInfo,
      mergedPullRequests,
      options
    }
  } else {
    return null
  }
}

export function resolveMode(mode: string | undefined, commitMode: boolean): 'PR' | 'COMMIT' | 'HYBRID' {
  if (commitMode === true) {
    return 'COMMIT'
  }

  if (mode !== undefined) {
    const upperCaseMode = mode.toUpperCase();
    if (upperCaseMode === 'COMMIT') {
      return 'COMMIT'
    } else if (upperCaseMode === 'HYBRID') {
      return 'HYBRID'
    }
  }

  return 'PR'
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
    // for compatibility with the `yml` file we require to use `#{{}}` instead of `${{}}` - replace it here.
    const configurationJSON: Configuration = JSON.parse(config.replace(/\${{/g, '#{{'))
    return configurationJSON
  } catch (error) {
    core.info(`⚠️ Configuration provided, but it couldn't be parsed. Fallback to Defaults.`)
    return undefined
  }
}

/**
 * Merges the configurations, will fallback to the DefaultConfiguration value
 */
export function mergeConfiguration(jc?: Configuration, fc?: Configuration, mode?: 'PR' | 'COMMIT' | 'HYBRID'): Configuration {
  let def: Configuration
  if (mode === 'COMMIT') {
    def = DefaultCommitConfiguration
  } else {
    def = DefaultConfiguration
  }

  return {
    max_tags_to_fetch: jc?.max_tags_to_fetch || fc?.max_tags_to_fetch || def.max_tags_to_fetch,
    max_pull_requests: jc?.max_pull_requests || fc?.max_pull_requests || def.max_pull_requests,
    max_back_track_time_days: jc?.max_back_track_time_days || fc?.max_back_track_time_days || def.max_back_track_time_days,
    exclude_merge_branches: jc?.exclude_merge_branches || fc?.exclude_merge_branches || def.exclude_merge_branches,
    sort: jc?.sort || fc?.sort || def.sort,
    template: jc?.template || fc?.template || def.template,
    pr_template: jc?.pr_template || fc?.pr_template || def.pr_template,
    empty_template: jc?.empty_template || fc?.empty_template || def.empty_template,
    categories: jc?.categories || fc?.categories || def.categories,
    ignore_labels: jc?.ignore_labels || fc?.ignore_labels || def.ignore_labels,
    label_extractor: jc?.label_extractor || fc?.label_extractor || def.label_extractor,
    duplicate_filter: jc?.duplicate_filter || fc?.duplicate_filter || def.duplicate_filter,
    transformers: jc?.transformers || fc?.transformers || def.transformers,
    tag_resolver: jc?.tag_resolver || fc?.tag_resolver || def.tag_resolver,
    base_branches: jc?.base_branches || fc?.base_branches || def.base_branches,
    custom_placeholders: jc?.custom_placeholders || fc?.custom_placeholders || def.custom_placeholders,
    trim_values: jc?.trim_values || fc?.trim_values || def.trim_values
  }
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
