import * as core from '@actions/core'
import * as fs from 'fs'

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

export type Unpacked<T> = T extends (infer U)[] ? U : T
