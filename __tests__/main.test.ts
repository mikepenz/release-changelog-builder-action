import * as path from 'path'
import * as process from 'process'
import * as cp from 'child_process'
import * as fs from 'fs'
import {clear} from '../src/transform'

jest.setTimeout(180000)
clear()

test('missing values should result in failure', () => {
  expect.assertions(1)

  process.env['GITHUB_WORKSPACE'] = '.'
  process.env['INPUT_OWNER'] = undefined
  process.env['INPUT_CONFIGURATION'] = 'configs/configuration.json'
  const ip = path.join(__dirname, '..', 'lib', 'main.js')
  const options: cp.ExecSyncOptions = {
    env: process.env
  }
  try {
    cp.execSync(`node ${ip}`, options).toString()
  } catch (error: any) {
    expect(true).toBe(true)
  }
})

test('complete input should succeed', () => {
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
  process.env['GITHUB_WORKSPACE'] = '.'
  process.env['INPUT_CONFIGURATION'] = 'configuration.json'
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
  const result = cp.execSync(`node ${ip}`, options).toString()
  // should succeed
  expect(result).toBeDefined()

  const readOutput = fs.readFileSync('test.md')

  fs.unlinkSync('test.md')

  expect(readOutput.toString()).not.toBe('')
})
