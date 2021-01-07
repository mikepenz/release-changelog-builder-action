import {resolveConfiguration} from '../src/utils'
import {ReleaseNotesBuilder} from '../src/releaseNotesBuilder'

jest.setTimeout(180000)

it('Should match generated changelog (unspecified fromTag)', async () => {
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
    false,
    configuration
  )

  const changeLog = await releaseNotesBuilder.build()
  console.log(changeLog)
  expect(changeLog).toStrictEqual(`- no changes`)
})

it('Should fill empty placeholders', async () => {
  const configuration = resolveConfiguration(
    '',
    'configs_test/configuration_empty_all_placeholders.json'
  )
  const releaseNotesBuilder = new ReleaseNotesBuilder(
    null,
    '.',
    'mikepenz',
    'release-changelog-builder-action',
    'v0.0.2',
    'v0.0.3',
    false,
    false,
    false,
    configuration
  )

  const changeLog = await releaseNotesBuilder.build()
  console.log(changeLog)
  expect(changeLog).toStrictEqual(
    `mikepenz\nrelease-changelog-builder-action\nv0.0.2\nv0.0.3`
  )
})

it('Should fill `template` placeholders', async () => {
  const configuration = resolveConfiguration(
    '',
    'configs_test/configuration_empty_all_placeholders.json'
  )
  const releaseNotesBuilder = new ReleaseNotesBuilder(
    null,
    '.',
    'mikepenz',
    'release-changelog-builder-action',
    'v0.0.1',
    'v0.0.3',
    false,
    false,
    false,
    configuration
  )

  const changeLog = await releaseNotesBuilder.build()
  console.log(changeLog)
  expect(changeLog).toStrictEqual(
    `## 🧪 Tests\n\n- [CI] Specify Test Case\n   - PR: #10\n\n\n\n\nmikepenz\nrelease-changelog-builder-action\nv0.0.1\nv0.0.3\n1\n0\n0`
  )
})

it('Should fill `template` placeholders, ignore', async () => {
  const configuration = resolveConfiguration(
    '',
    'configs_test/configuration_empty_all_placeholders.json'
  )
  const releaseNotesBuilder = new ReleaseNotesBuilder(
    null,
    '.',
    'mikepenz',
    'release-changelog-builder-action',
    'v0.9.1',
    'v0.9.5',
    false,
    false,
    false,
    configuration
  )

  const changeLog = await releaseNotesBuilder.build()
  console.log(changeLog)
  expect(changeLog).toStrictEqual(
    `## 🚀 Features\n\n- Enhance sorting by using proper semver\n   - PR: #51\n\n## 🧪 Tests\n\n- Improve test cases\n   - PR: #49\n\n\n- Bump @types/node from 14.11.8 to 14.11.10\n   - PR: #47\n- Adjust code to move fromTag resolving to main.ts\n   - PR: #48\n- dev -> main\n   - PR: #52\n- Update package.json to updated description\n   - PR: #53\n- dev -> main\n   - PR: #54\n\n- New additional placeholders for \`template\` and \`empty_template\`\n   - PR: #50\n\nmikepenz\nrelease-changelog-builder-action\nv0.9.1\nv0.9.5\n2\n5\n1`
  )
})

it('Uncategorized category', async () => {
  const configuration = resolveConfiguration(
    '',
    'configs_test/configuration_uncategorized_category.json'
  )
  const releaseNotesBuilder = new ReleaseNotesBuilder(
    null,
    '.',
    'mikepenz',
    'release-changelog-builder-action',
    'v0.9.1',
    'v0.9.5',
    false,
    false,
    false,
    configuration
  )

  const changeLog = await releaseNotesBuilder.build()
  console.log(changeLog)
  expect(changeLog).toStrictEqual(
    `## 🚀 Features\n\n- Enhance sorting by using proper semver\n   - PR: #51\n\n## 📦 Uncategorized\n\n- Bump @types/node from 14.11.8 to 14.11.10\n   - PR: #47\n- Adjust code to move fromTag resolving to main.ts\n   - PR: #48\n- Improve test cases\n   - PR: #49\n- dev -> main\n   - PR: #52\n- Update package.json to updated description\n   - PR: #53\n- dev -> main\n   - PR: #54\n\n\n\nUncategorized:\n- Bump @types/node from 14.11.8 to 14.11.10\n   - PR: #47\n- Adjust code to move fromTag resolving to main.ts\n   - PR: #48\n- Improve test cases\n   - PR: #49\n- dev -> main\n   - PR: #52\n- Update package.json to updated description\n   - PR: #53\n- dev -> main\n   - PR: #54\n\n\nIgnored:\n- New additional placeholders for \`template\` and \`empty_template\`\n   - PR: #50\n\n\n6\n1`
  )
})



it('Verify commit based changelog', async () => {
  const configuration = resolveConfiguration(
    '',
    'configs_test/configuration_commits.json'
  )
  const releaseNotesBuilder = new ReleaseNotesBuilder(
    null,
    '.',
    'mikepenz',
    'release-changelog-builder-action',
    'v0.0.1',
    'v0.0.3',
    false,
    false,
    true,
    configuration
  )

  const changeLog = await releaseNotesBuilder.build()
  console.log(changeLog)
  expect(changeLog).toStrictEqual(
    `## 📦 Uncategorized\n\n- - introduce proper approach to retrieve tag before a given tag\n\n- - configure test case\n\n- Merge pull request #10 from mikepenz/feature/specify_test\n\n\n\n\nUncategorized:\n- - introduce proper approach to retrieve tag before a given tag\n\n- - configure test case\n\n- Merge pull request #10 from mikepenz/feature/specify_test\n\n\n\nIgnored:\n\n\n3\n0`
  )
})
