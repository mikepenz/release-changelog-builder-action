import * as fs from 'fs'
import {Configuration} from './configuration'

export function readConfiguration(filename: string): Configuration | null {
  try {
    const rawdata = fs.readFileSync(filename, 'utf8')
    const configurationJSON: Configuration = JSON.parse(rawdata)
    return configurationJSON
  } catch (error) {
    return null
  }
}

export function directoryExistsSync(path: string, required?: boolean): boolean {
  if (!path) {
    throw new Error("Arg 'path' must not be empty")
  }

  let stats: fs.Stats
  try {
    stats = fs.statSync(path)
  } catch (error) {
    if (error.code === 'ENOENT') {
      if (!required) {
        return false
      }

      throw new Error(`Directory '${path}' does not exist`)
    }

    throw new Error(
      `Encountered an error when checking whether path '${path}' exists: ${error.message}`
    )
  }

  if (stats.isDirectory()) {
    return true
  } else if (!required) {
    return false
  }

  throw new Error(`Directory '${path}' does not exist`)
}
