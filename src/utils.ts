import * as fs from 'fs'
import {Configuration} from './configuration'

export function readConfiguration(filename: string): Configuration {
  const rawdata = fs.readFileSync(filename, 'utf8')
  const configurationJSON: Configuration = JSON.parse(rawdata)
  return configurationJSON
}
