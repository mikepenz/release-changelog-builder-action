import {resolveConfiguration} from '../src/utils'
import {ReleaseNotesBuilder} from '../src/releaseNotesBuilder'

jest.setTimeout(180000)


it('Verify custom categorisation of open PRs', async () => {
  const configuration = resolveConfiguration('', 'configs_test/configuration_excluding_open.json')
  const releaseNotesBuilder = new ReleaseNotesBuilder(
    null, // baseUrl
    null, // token
    '.', // repoPath
    'TheLastDarkthorne', // user
    'svof', // repo
    '896ffc9d02d598396241b2044733500b3298476a', // fromTag
    '51', // toTag
    false, // includeOpen
    false, // failOnError
    false, // ignorePrePrelease
    false, // enable to fetch reviewers
    false, // enable to fetch tag release information
    false, // commitMode
    configuration // configuration
  )

  const changeLog = await releaseNotesBuilder.build()
  console.log(changeLog)
  expect(changeLog).toStrictEqual(
    ``
  )
})
