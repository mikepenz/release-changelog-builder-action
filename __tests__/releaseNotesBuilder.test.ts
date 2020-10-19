import { resolveConfiguration } from '../src/utils';
import { ReleaseNotesBuilder } from '../src/releaseNotesBuilder';

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

it('Should use empty placeholder', async () => {
  jest.setTimeout(180000)

  const configuration = resolveConfiguration('', 'configs/configuration.json')
  const releaseNotesBuilder = new ReleaseNotesBuilder(
    null,
    '.',
    'mikepenz',
    'release-changelog-builder-action',
    'v0.0.2',
    'v0.0.3',
    false,
    false,
    configuration
  )

  const changeLog = await releaseNotesBuilder.build()
  console.log(changeLog)
  expect(changeLog).toStrictEqual(`- no changes`)
})

it('Should fill empty placeholders', async () => {
  jest.setTimeout(180000)

  const configuration = resolveConfiguration('', 'configs_test/configuration_empty_all_placeholders.json')
  const releaseNotesBuilder = new ReleaseNotesBuilder(
    null,
    '.',
    'mikepenz',
    'release-changelog-builder-action',
    'v0.0.2',
    'v0.0.3',
    false,
    false,
    configuration
  )

  const changeLog = await releaseNotesBuilder.build()
  console.log(changeLog)
  expect(changeLog).toStrictEqual(`mikepenz\nrelease-changelog-builder-action\nv0.0.2\nv0.0.3`)
})

it('Should fill `template` placeholders', async () => {
  jest.setTimeout(180000)

  const configuration = resolveConfiguration('', 'configs_test/configuration_empty_all_placeholders.json')
  const releaseNotesBuilder = new ReleaseNotesBuilder(
    null,
    '.',
    'mikepenz',
    'release-changelog-builder-action',
    'v0.0.1',
    'v0.0.3',
    false,
    false,
    configuration
  )

  const changeLog = await releaseNotesBuilder.build()
  console.log(changeLog)
  expect(changeLog).toStrictEqual(`## 🧪 Tests\n\n- [CI] Specify Test Case\n   - PR: #10\n\n\n\nmikepenz\nrelease-changelog-builder-action\nv0.0.1\nv0.0.3\n1\n0`)
})