import {ReleaseNotes} from '../src/releaseNotes'
import { resolveConfiguration } from '../src/utils';
import { Octokit } from '@octokit/rest';

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

// load octokit instance
const octokit = new Octokit({
  auth: `token ${process.env.GITHUB_TOKEN}`
})

/*
it('Should match generated changelog (unspecified fromTag)', async () => {
  jest.setTimeout(180000)

  const configuration = resolveConfiguration('', 'configs/configuration.json')
  const releaseNotes = new ReleaseNotes(octokit, {
    owner: 'mikepenz',
    repo: 'release-changelog-builder-action',
    fromTag: null,
    toTag: 'v0.0.3',
    failOnError: false,
    configuration: configuration
  })

  const changeLog = await releaseNotes.pull()
  console.log(changeLog)
  expect(changeLog).toStrictEqual(`## 🧪 Tests

- [CI] Specify Test Case
   - PR: #10

`)
})
*/