import {mergeConfiguration, resolveConfiguration} from '../src/utils'
import {ReleaseNotesBuilder} from '../src/releaseNotesBuilder'

jest.setTimeout(180000)

it('Test custom changelog builder', async () => {
  const configuration = mergeConfiguration(undefined, resolveConfiguration(
    '',
    'configs_test/configuration_approvers.json'
  ))
  const releaseNotesBuilder = new ReleaseNotesBuilder(
    null, // baseUrl
    null, // token
    '.',  // repoPath
    'mikepenz',                                         // user
    'release-changelog-builder-action',      // repo
    'v4.0.0-rc04',         // fromTag
    'v4.0.0-rc05',         // toTag
    false, // includeOpen
    false, // failOnError
    false, // ignorePrePrelease
    false, // enable to fetch via commits
    false, // enable to fetch reviewers
    false, // enable to fetch release information
    false, // enable to fetch reviews
    false, // enable commitMode
    false, // enable exportCache
    false, // enable exportOnly
    configuration  // configuration
  )

  const changeLog = await releaseNotesBuilder.build()
  console.log(changeLog)
  expect(changeLog).toStrictEqual(`define-expected-output`)
})