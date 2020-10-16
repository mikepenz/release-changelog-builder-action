import {wait} from '../src/wait'
import * as process from 'process'
import * as cp from 'child_process'
import * as path from 'path'
import {ReleaseNotes} from '../src/releaseNotes'
import {readConfiguration} from '../src/utils'
import {createCommandManager} from '../src/git-helper'
import * as core from '@actions/core'
import {Tags} from '../src/tags'

// shows how the runner will run a javascript action with env / stdout protocol
/*
test('test runs', () => {
  jest.setTimeout(180000);
  
  process.env['INPUT_CONFIGURATION'] = 'configuration.json'
  const ip = path.join(__dirname, '..', 'lib', 'main.js')
  const options: cp.ExecSyncOptions = {
    env: process.env
  }
  console.log(cp.execSync(`node ${ip}`, options).toString())
})
*/

it('Should be true', async () => {
  jest.setTimeout(180000)

  const configuration = readConfiguration('configuration.json')
  const releaseNotes = new ReleaseNotes({
    owner: 'mikepenz',
    repo: 'release-changelog-builder-action',
    fromTag: null,
    toTag: 'v0.0.3',
    configuration: configuration
  })

  const changeLog = await releaseNotes.pull()
  console.log(changeLog)
  expect(changeLog).toStrictEqual(`## 🧪 Tests

- [CI] Specify Test Case
   - PR: #10

`)
})
