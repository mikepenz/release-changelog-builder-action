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
    owner: 'fazulk',
    repo: 'test-repo',
    fromTag: 'v0.6.0',
    toTag: 'v0.6.1',
    failOnError: false,
    commitMode: false,
    configuration
  })

  const changeLog = await releaseNotes.pull()
  console.log(changeLog)
  expect(changeLog).toStrictEqual("")
})

