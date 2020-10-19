import * as path from 'path';
import * as process from 'process'
import * as cp from 'child_process'

test('missing values should result in failure', () => {
  process.env['GITHUB_WORKSPACE'] = '.'
  process.env['INPUT_CONFIGURATION'] = 'configuration.json'
  const ip = path.join(__dirname, '..', 'lib', 'main.js')
  const options: cp.ExecSyncOptions = {
    env: process.env
  }
  try {
    cp.execSync(`node ${ip}`, options).toString()
    fail("Should not succeed, because values miss")
  } catch (error) {
    console.log(`correctly failed due to: ${error}`)
  }
})

test('missing values should result in failure', () => {
  process.env['GITHUB_WORKSPACE'] = '.'
  process.env['INPUT_CONFIGURATION'] = 'configuration.json'
  process.env['INPUT_OWNER'] = 'mikepenz'
  process.env['INPUT_REPO'] = 'release-changelog-builder-action'
  process.env['INPUT_FROMTAG'] = 'v0.3.0'
  process.env['INPUT_TOTAG'] = 'v0.5.0'
  
  const ip = path.join(__dirname, '..', 'lib', 'main.js')
  const options: cp.ExecSyncOptions = {
    env: process.env
  }
  const result = cp.execSync(`node ${ip}`, options).toString()
  // should succeed
})