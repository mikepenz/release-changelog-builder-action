import {ReleaseNotes} from '../src/releaseNotes'
import {resolveConfiguration} from '../src/utils'
import {Octokit} from '@octokit/rest'

jest.setTimeout(180000)

// load octokit instance
const octokit = new Octokit({
  auth: `token ${process.env.GITHUB_TOKEN}`
})

it('Should have empty changelog (tags)', async () => {
  const configuration = resolveConfiguration('', 'configs/configuration.json')
  const releaseNotes = new ReleaseNotes(octokit, {
    owner: 'mikepenz',
    repo: 'release-changelog-builder-action',
    fromTag: 'v0.0.1',
    toTag: 'v0.0.2',
    failOnError: false,
    commitMode: false,
    configuration: configuration
  })

  const changeLog = await releaseNotes.pull()
  console.log(changeLog)
  expect(changeLog).toStrictEqual(null)
})

it('Should match generated changelog (tags)', async () => {
  const configuration = resolveConfiguration('', 'configs/configuration.json')
  const releaseNotes = new ReleaseNotes(octokit, {
    owner: 'mikepenz',
    repo: 'release-changelog-builder-action',
    fromTag: 'v0.0.1',
    toTag: 'v0.0.3',
    failOnError: false,
    commitMode: false,
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
  const configuration = resolveConfiguration(
    '',
    'configs_test/configuration_all_placeholders.json'
  )
  const releaseNotes = new ReleaseNotes(octokit, {
    owner: 'mikepenz',
    repo: 'release-changelog-builder-action',
    fromTag: '5ec7a2d86fe9f43fdd38d5e254a1117c8a51b4c3',
    toTag: 'fa3788c8c4b3373ef8424ce3eb008a5cd07cc5aa',
    failOnError: false,
    commitMode: false,
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

it('Should match ordered ASC', async () => {
  const configuration = resolveConfiguration(
    '',
    'configs_test/configuration_asc.json'
  )
  const releaseNotes = new ReleaseNotes(octokit, {
    owner: 'mikepenz',
    repo: 'release-changelog-builder-action',
    fromTag: 'v0.3.0',
    toTag: 'v0.5.0',
    failOnError: false,
    commitMode: false,
    configuration: configuration
  })

  const changeLog = await releaseNotes.pull()
  console.log(changeLog)
  expect(changeLog).toStrictEqual(
    `## 🚀 Features\n\n22\n24\n25\n26\n28\n\n## 🐛 Fixes\n\n23\n\n`
  )
})

it('Should match ordered DESC', async () => {
  const configuration = resolveConfiguration(
    '',
    'configs_test/configuration_desc.json'
  )
  const releaseNotes = new ReleaseNotes(octokit, {
    owner: 'mikepenz',
    repo: 'release-changelog-builder-action',
    fromTag: 'v0.3.0',
    toTag: 'v0.5.0',
    failOnError: false,
    commitMode: false,
    configuration: configuration
  })

  const changeLog = await releaseNotes.pull()
  console.log(changeLog)
  expect(changeLog).toStrictEqual(
    `## 🚀 Features\n\n28\n26\n25\n24\n22\n\n## 🐛 Fixes\n\n23\n\n`
  )
})
