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
