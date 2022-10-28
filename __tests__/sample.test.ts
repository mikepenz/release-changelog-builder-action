import {resolveConfiguration} from '../src/utils'
import {ReleaseNotesBuilder} from '../src/releaseNotesBuilder'

jest.setTimeout(180000)


it('Verify custom categorisation of open PRs', async () => {
  const configuration = resolveConfiguration('', 'configs_test/config_sample.json')
  const releaseNotesBuilder = new ReleaseNotesBuilder(
    null, // baseUrl
    null, // token
    '.', // repoPath
    'TheLastDarkthorne', // user
    'svof', // repo
    'ffde868f4a8ced55fa6d8d1d57a0f9f9e062a1d5', // fromTag
    '0d8b223436081e69deb719fa1b2d54190fc5aa96', // toTag
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
