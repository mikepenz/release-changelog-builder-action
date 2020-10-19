import { resolveConfiguration } from '../src/utils';
import { ReleaseNotesBuilder } from '../src/releaseNotesBuilder';

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
it('Should match generated changelog (unspecified fromTag)', async () => {
  jest.setTimeout(180000)

  const configuration = resolveConfiguration('', 'configs/configuration.json')
  const releaseNotesBuilder = new ReleaseNotesBuilder(
    null,
    '.',
    'mikepenz',
    'release-changelog-builder-action',
    null,
    'v0.0.3',
    false,
    false,
    configuration
  )

  const changeLog = await releaseNotesBuilder.build()
  console.log(changeLog)
  expect(changeLog).toStrictEqual(`## 🧪 Tests

- [CI] Specify Test Case
   - PR: #10

`)
})