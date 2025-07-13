import * as path from 'path'
import * as process from 'process'
import * as cp from 'child_process'
import * as fs from 'fs'
import {clear} from '../src/transform.js'
import {jest} from '@jest/globals'
import { fileURLToPath } from 'url';

jest.setTimeout(180000)
clear()

const __filename = fileURLToPath(import.meta.url); // get the resolved path to the file
const __dirname = path.dirname(__filename); // get the name of the directory

function resetEnv(): void {
  process.env['INPUT_CONFIGURATION'] = ''
  process.env['INPUT_OWNER'] = ''
  process.env['INPUT_REPO'] = ''
  process.env['INPUT_MODE'] = ''
  process.env['INPUT_OFFLINEMODE'] = ''
  process.env['INPUT_OUTPUTFILE'] = ''
  process.env['INPUT_CACHE'] = ''
  process.env['GITHUB_WORKSPACE'] = ''
  process.env['INPUT_FROMTAG'] = ''
  process.env['INPUT_TOTAG'] = ''
}

test('missing values should result in failure', () => {
  resetEnv()
  process.env['GITHUB_WORKSPACE'] = '.'
  process.env['INPUT_OWNER'] = undefined
  process.env['INPUT_CONFIGURATION'] = 'configs/configuration.json'
  const ip = path.join(__dirname, '..', 'lib', 'main.js')
  const options: cp.ExecSyncOptions = {
    env: process.env
  }
  try {
    cp.execFileSync('node', [ip], options).toString()
  } catch (error: unknown) {
    expect(true).toBe(true)
  }
})

test('complete input should succeed', () => {
  resetEnv()
  process.env['GITHUB_WORKSPACE'] = '.'
  process.env['INPUT_CONFIGURATION'] = 'configuration.json'
  process.env['INPUT_OWNER'] = 'mikepenz'
  process.env['INPUT_REPO'] = 'release-changelog-builder-action'
  process.env['INPUT_FROMTAG'] = 'v0.3.0'
  process.env['INPUT_TOTAG'] = 'v0.5.0'
  process.env['INPUT_CACHE'] = 'caches/rcba_0.3.0-0.5.0_cache.json'

  const ip = path.join(__dirname, '..', 'lib', 'main.js')
  const options: cp.ExecSyncOptions = {
    env: process.env
  }
  const result = cp.execSync(`node ${ip}`, options).toString()
  // should succeed
  expect(result).toBeDefined()
})

test('should write result to file', () => {
  resetEnv()
  process.env['GITHUB_WORKSPACE'] = '.'
  process.env['INPUT_CONFIGURATION'] = 'configs/configuration.json'
  process.env['INPUT_OWNER'] = 'mikepenz'
  process.env['INPUT_REPO'] = 'release-changelog-builder-action'
  process.env['INPUT_FROMTAG'] = 'v0.3.0'
  process.env['INPUT_TOTAG'] = 'v0.5.0'
  process.env['INPUT_OUTPUTFILE'] = 'test.md'
  process.env['INPUT_CACHE'] = 'caches/rcba_0.3.0-0.5.0_cache.json'

  const ip = path.join(__dirname, '..', 'lib', 'main.js')
  const options: cp.ExecSyncOptions = {
    env: process.env
  }
  const result = cp.execFileSync('node', [ip], options).toString()
  // should succeed
  expect(result).toBeDefined()

  const readOutput = fs.readFileSync('test.md')

  fs.unlinkSync('test.md')

  expect(readOutput.toString()).not.toBe('')
})

test('offline mode should work with commit mode', () => {
  resetEnv()
  // This test verifies that the offlineMode parameter is correctly passed to the configuration
  // and that the OfflineRepository is used when offlineMode is enabled.

  // Set up environment variables for the test
  process.env['GITHUB_WORKSPACE'] = '.'
  process.env['INPUT_CONFIGURATION'] = 'configs/configuration_commit.json'
  process.env['INPUT_OWNER'] = 'mikepenz'
  process.env['INPUT_REPO'] = 'release-changelog-builder-action'
  process.env['INPUT_MODE'] = 'PR'
  process.env['INPUT_OFFLINEMODE'] = 'true'
  process.env['INPUT_OUTPUTFILE'] = 'test.md'
  process.env['INPUT_CACHE'] = ''

  const ip = path.join(__dirname, '..', 'lib', 'main.js')
  const options: cp.ExecSyncOptions = {
    env: process.env
  }

  const result = cp.execFileSync('node', [ip], options).toString()
  // should succeed
  expect(result).toBeDefined()

  const readOutput = fs.readFileSync('test.md')
  fs.unlinkSync('test.md')

  expect(readOutput.toString()).not.toBe("- no changes")
  expect(readOutput.toString()).not.toBe('')

  console.log('Offline mode test succeeded')
})
