import {resolveConfiguration} from '../src/utils'
import {ReleaseNotesBuilder} from '../src/releaseNotesBuilder'

jest.setTimeout(180000)

it('Should match generated changelog (unspecified fromTag)', async () => {
  const configuration = resolveConfiguration('', 'configs/configuration.json')
  const releaseNotesBuilder = new ReleaseNotesBuilder(
    null,
    null,
    '.',
    'mikepenz',
    'release-changelog-builder-action',
    null,
    'v0.0.3',
    false,
    false,
    false,
    false, // enable to fetch reviewers
    false, // enable to fetch tag release information
    false, // enable to fetch reviews
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

it('Should match generated changelog (unspecified tags)', async () => {
  const configuration = resolveConfiguration('', 'configs/configuration.json')
  const releaseNotesBuilder = new ReleaseNotesBuilder(
    null,
    null,
    '.',
    'mikepenz',
    'action-junit-report-legacy',
    null,
    null,
    false,
    false,
    false,
    false, // enable to fetch reviewers
    false, // enable to fetch tag release information
    false, // enable to fetch reviews
    false,
    configuration
  )

  const changeLog = await releaseNotesBuilder.build()
  console.log(changeLog)
  expect(changeLog).toStrictEqual(`## 🐛 Fixes\n\n- Stacktrace Data can be an array\n   - PR: #39\n\n`)
})

it('Should use empty placeholder', async () => {
  const configuration = resolveConfiguration('', 'configs/configuration.json')
  const releaseNotesBuilder = new ReleaseNotesBuilder(
    null,
    null,
    '.',
    'mikepenz',
    'release-changelog-builder-action',
    'v0.0.2',
    'v0.0.3',
    false,
    false,
    false,
    false, // enable to fetch reviewers
    false, // enable to fetch tag release information
    false, // enable to fetch reviews
    false,
    configuration
  )

  const changeLog = await releaseNotesBuilder.build()
  console.log(changeLog)
  expect(changeLog).toStrictEqual(`- no changes`)
})

it('Should fill empty placeholders', async () => {
  const configuration = resolveConfiguration('', 'configs_test/configuration_empty_all_placeholders.json')
  const releaseNotesBuilder = new ReleaseNotesBuilder(
    null,
    null,
    '.',
    'mikepenz',
    'release-changelog-builder-action',
    'v0.0.2',
    'v0.0.3',
    false,
    false,
    false,
    false, // enable to fetch reviewers
    false, // enable to fetch tag release information
    false, // enable to fetch reviews
    false,
    configuration
  )

  const changeLog = await releaseNotesBuilder.build()
  console.log(changeLog)
  expect(changeLog).toStrictEqual(
    `mikepenz\nrelease-changelog-builder-action\nv0.0.2\nv0.0.3\nhttps://github.com/mikepenz/release-changelog-builder-action/compare/v0.0.2...v0.0.3`
  )
})

it('Should fill `template` placeholders', async () => {
  const configuration = resolveConfiguration('', 'configs_test/configuration_empty_all_placeholders.json')
  const releaseNotesBuilder = new ReleaseNotesBuilder(
    null,
    null,
    '.',
    'mikepenz',
    'release-changelog-builder-action',
    'v0.0.1',
    'v0.0.3',
    false,
    false,
    false,
    false, // enable to fetch reviewers
    false, // enable to fetch tag release information
    false, // enable to fetch reviews
    false,
    configuration
  )

  const changeLog = await releaseNotesBuilder.build()
  console.log(changeLog)
  expect(changeLog).toStrictEqual(
    `## 🧪 Tests\n\n- [CI] Specify Test Case\n   - PR: #10\n\n\n\n\nmikepenz\nrelease-changelog-builder-action\nv0.0.1\nv0.0.3\nhttps://github.com/mikepenz/release-changelog-builder-action/compare/v0.0.1...v0.0.3\n1\n0\n0\n19\n14827\n444\n15271\n3`
  )
})

it('Should fill `template` placeholders, ignore', async () => {
  const configuration = resolveConfiguration('', 'configs_test/configuration_empty_all_placeholders.json')
  const releaseNotesBuilder = new ReleaseNotesBuilder(
    null,
    null,
    '.',
    'mikepenz',
    'release-changelog-builder-action',
    'v0.9.1',
    'v0.9.5',
    false,
    false,
    false,
    false, // enable to fetch reviewers
    false, // enable to fetch tag release information
    false, // enable to fetch reviews
    false,
    configuration
  )

  const changeLog = await releaseNotesBuilder.build()
  console.log(changeLog)
  expect(changeLog).toStrictEqual(
    `## 🚀 Features\n\n- Enhance sorting by using proper semver\n   - PR: #51\n\n## 🧪 Tests\n\n- Improve test cases\n   - PR: #49\n\n\n- Bump @types/node from 14.11.8 to 14.11.10\n   - PR: #47\n- Adjust code to move fromTag resolving to main.ts\n   - PR: #48\n- dev -> main\n   - PR: #52\n- Update package.json to updated description\n   - PR: #53\n- dev -> main\n   - PR: #54\n\n- New additional placeholders for \`template\` and \`empty_template\`\n   - PR: #50\n\nmikepenz\nrelease-changelog-builder-action\nv0.9.1\nv0.9.5\nhttps://github.com/mikepenz/release-changelog-builder-action/compare/v0.9.1...v0.9.5\n2\n5\n1\n16\n2931\n450\n3381\n26`
  )
})

it('Uncategorized category', async () => {
  const configuration = resolveConfiguration('', 'configs_test/configuration_uncategorized_category.json')
  const releaseNotesBuilder = new ReleaseNotesBuilder(
    null,
    null,
    '.',
    'mikepenz',
    'release-changelog-builder-action',
    'v0.9.1',
    'v0.9.5',
    false,
    false,
    false,
    false, // enable to fetch reviewers
    false, // enable to fetch tag release information
    false, // enable to fetch reviews
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
  const configuration = resolveConfiguration('', 'configs_test/configuration_commits.json')
  const releaseNotesBuilder = new ReleaseNotesBuilder(
    null,
    null,
    '.',
    'mikepenz',
    'release-changelog-builder-action',
    'v0.0.1',
    'v0.0.3',
    false,
    false,
    false,
    false, // enable to fetch reviewers
    false, // enable to fetch tag release information
    false, // enable to fetch reviews
    true,
    configuration
  )

  const changeLog = await releaseNotesBuilder.build()
  console.log(changeLog)
  expect(changeLog).toStrictEqual(
    `## 📦 Uncategorized\n\n- - introduce proper approach to retrieve tag before a given tag\n\n- - configure test case\n\n- Merge pull request #10 from mikepenz/feature/specify_test\n\n\n\n\nUncategorized:\n- - introduce proper approach to retrieve tag before a given tag\n\n- - configure test case\n\n- Merge pull request #10 from mikepenz/feature/specify_test\n\n\n\nIgnored:\n\n\n3\n0`
  )
})

it('Verify commit based changelog, with emoji categorisation', async () => {
  const configuration = resolveConfiguration('', 'configs_test/configuration_commits_emoji.json')
  const releaseNotesBuilder = new ReleaseNotesBuilder(
    null,
    null,
    '.',
    'theapache64',
    'stackzy',
    'bd3242a6b6eadb24744c478e112c4628e89609c2',
    '17a9e4dfaedcabe6a6eff2754bebb715e1c58ec4',
    false,
    false,
    false,
    false, // enable to fetch reviewers
    false, // enable to fetch tag release information
    false, // enable to fetch reviews
    true,
    configuration
  )

  const changeLog = await releaseNotesBuilder.build()
  console.log(changeLog)
  expect(changeLog).toStrictEqual(
    `## 🚀 Features\n\n- add dynamic merging\n- add auto-cleaning\n- add built-in adb support\n- add adb fallback (thanks to @mikepenz ;))\n- add install note\n- add @mikepenz to credits\n\n## 🐛 Fixes\n\n- fix dynamic lib replacement\n- fix apostrophe issue with app name\n- fix java.util.logger error\n\n## 💬 Other\n\n- update screenshot with truecaller stack\n\n`
  )
})

it('Verify default inclusion of open PRs', async () => {
  const configuration = resolveConfiguration('', 'configs_test/configuration_including_open.json')
  const releaseNotesBuilder = new ReleaseNotesBuilder(
    null, // baseUrl
    null, // token
    '.', // repoPath
    'mikepenz', // user
    'release-changelog-builder-action-playground', // repo
    '1.5.0', // fromTag
    '2.0.0', // toTag
    true, // includeOpen
    false, // failOnError
    false, // ignorePrePrelease
    false, // enable to fetch reviewers
    false, // enable to fetch tag release information
    false, // enable to fetch reviews
    false, // commitMode
    configuration // configuration
  )

  const changeLog = await releaseNotesBuilder.build()
  console.log(changeLog)
  expect(changeLog).toStrictEqual(
    `## 🚀 Features\n\n- A feature to be going to v2 (nr3) (#3) merged\n- New feature to keep open (nr5) (#7) open\n\n\n\n\nUncategorized\n\n\n\nOpen\n- New feature to keep open (nr5) (#7) open\n`
  )
})

it('Verify custom categorisation of open PRs', async () => {
  const configuration = resolveConfiguration('', 'configs_test/configuration_excluding_open.json')
  const releaseNotesBuilder = new ReleaseNotesBuilder(
    null, // baseUrl
    null, // token
    '.', // repoPath
    'mikepenz', // user
    'release-changelog-builder-action-playground', // repo
    '1.5.0', // fromTag
    '2.0.0', // toTag
    true, // includeOpen
    false, // failOnError
    false, // ignorePrePrelease
    false, // enable to fetch reviewers
    false, // enable to fetch tag release information
    false, // enable to fetch reviews
    false, // commitMode
    configuration // configuration
  )

  const changeLog = await releaseNotesBuilder.build()
  console.log(changeLog)
  expect(changeLog).toStrictEqual(
    `## 🚀 Features Merged\n\n- A feature to be going to v2 (nr3) -- (#3) [merged] {feature}\n\n## 🚀 Features Open\n\n- New feature to keep open (nr5) -- (#7) [open] {feature}\n\n`
  )
})

it('Verify reviewers who approved are fetched and also release information', async () => {
  const configuration = resolveConfiguration('', 'configs_test/configuration_approvers.json')
  const releaseNotesBuilder = new ReleaseNotesBuilder(
    null, // baseUrl
    null, // token
    '.', // repoPath
    'mikepenz', // user
    'release-changelog-builder-action-playground', // repo
    '1.5.0', // fromTag
    '2.0.0', // toTag
    true, // includeOpen
    false, // failOnError
    false, // ignorePrePrelease
    true, // enable to fetch reviewers
    true, // enable to fetch tag release information
    false, // enable to fetch reviews
    false, // commitMode
    configuration // configuration
  )

  const changeLog = await releaseNotesBuilder.build()
  console.log(changeLog)
  expect(changeLog).toStrictEqual(
    `## 🚀 Features\n\n- A feature to be going to v2 (nr3) -- (#3) [merged]  --- \n- New feature to keep open (nr5) -- (#7) [open]  --- gabrielpopa\n\n\n\n0`
  )
})

it('Fetch release information', async () => {
  const configuration = resolveConfiguration('', 'configs_test/configuration_approvers.json')
  configuration.template = '${{FROM_TAG}}-${{FROM_TAG_DATE}}\n${{TO_TAG}}-${{TO_TAG_DATE}}\n${{DAYS_SINCE}}'
  const releaseNotesBuilder = new ReleaseNotesBuilder(
    null, // baseUrl
    null, // token
    '.', // repoPath
    'mikepenz', // user
    'release-changelog-builder-action-playground', // repo
    '2.0.0', // fromTag
    '3.0.0-a01', // toTag
    true, // includeOpen
    false, // failOnError
    false, // ignorePrePrelease
    false, // enable to fetch reviewers
    true, // enable to fetch tag release information
    false, // enable to fetch reviews
    false, // commitMode
    configuration // configuration
  )

  const changeLog = await releaseNotesBuilder.build()
  console.log(changeLog)
  expect(changeLog).toStrictEqual(`2.0.0-2022-04-08T07:52:40.000Z\n3.0.0-a01-2022-07-26T14:28:36.000Z\n109`)
})

it('Fetch release information for non existing tag / release', async () => {
  const configuration = resolveConfiguration('', 'configs_test/configuration_approvers.json')
  configuration.template = '${{FROM_TAG}}-${{FROM_TAG_DATE}}\n${{TO_TAG}}-${{TO_TAG_DATE}}\n${{DAYS_SINCE}}'
  const releaseNotesBuilder = new ReleaseNotesBuilder(
    null, // baseUrl
    null, // token
    '.', // repoPath
    'mikepenz', // user
    'release-changelog-builder-action-playground', // repo
    '2.0.0', // fromTag
    '3.0.1', // toTag
    true, // includeOpen
    false, // failOnError
    false, // ignorePrePrelease
    false, // enable to fetch reviewers
    true, // enable to fetch tag release information
    false, // enable to fetch reviews
    false, // commitMode
    configuration // configuration
  )

  const changeLog = await releaseNotesBuilder.build()
  console.log(changeLog)
  expect(changeLog).toStrictEqual(`- no changes`)
})
