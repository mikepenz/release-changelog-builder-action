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
it('Should have empty changelog (tags)', async () => {
  jest.setTimeout(180000)

  const configuration = readConfiguration('configs/configuration.json')!!
  const releaseNotes = new ReleaseNotes({
    owner: 'mikepenz',
    repo: 'release-changelog-builder-action',
    fromTag: 'v0.0.1',
    toTag: 'v0.0.2',
    ignorePreReleases: false,
    configuration: configuration
  })

  const changeLog = await releaseNotes.pull()
  console.log(changeLog)
  expect(changeLog).toStrictEqual(`- no changes`)
})

it('Should match generated changelog (tags)', async () => {
  jest.setTimeout(180000)

  const configuration = readConfiguration('configs/configuration.json')!!
  const releaseNotes = new ReleaseNotes({
    owner: 'mikepenz',
    repo: 'release-changelog-builder-action',
    fromTag: 'v0.0.1',
    toTag: 'v0.0.3',
    ignorePreReleases: false,
    configuration: configuration
  })

  const changeLog = await releaseNotes.pull()
  console.log(changeLog)
  expect(changeLog).toStrictEqual(`## 🧪 Tests

- [CI] Specify Test Case
   - PR: #10

`)
})

it('Should match generated changelog (unspecified fromTag)', async () => {
  jest.setTimeout(180000)

  const configuration = readConfiguration('configs/configuration.json')!!
  const releaseNotes = new ReleaseNotes({
    owner: 'mikepenz',
    repo: 'release-changelog-builder-action',
    fromTag: null,
    toTag: 'v0.0.3',
    ignorePreReleases: false,
    configuration: configuration
  })

  const changeLog = await releaseNotes.pull()
  console.log(changeLog)
  expect(changeLog).toStrictEqual(`## 🧪 Tests

- [CI] Specify Test Case
   - PR: #10

`)
})

it('Should match generated changelog (refs)', async () => {
  jest.setTimeout(180000)

  const configuration = readConfiguration('configs/configuration_all_placeholders.json')!!
  const releaseNotes = new ReleaseNotes({
    owner: 'mikepenz',
    repo: 'release-changelog-builder-action',
    fromTag: '5ec7a2d86fe9f43fdd38d5e254a1117c8a51b4c3',
    toTag: 'fa3788c8c4b3373ef8424ce3eb008a5cd07cc5aa',
    ignorePreReleases: false,
    configuration: configuration
  })

  const changeLog = await releaseNotes.pull()
  console.log(changeLog)
  expect(changeLog).toStrictEqual(`## 🧪 Tests

[CI] Specify Test Case
10
https://github.com/mikepenz/release-changelog-builder-action/pull/10
2020-10-16T13:59:36.000Z
mikepenz
test
1.0.0
- specify test case
mikepenz, nhoelzl
nhoelzl

`)
})
