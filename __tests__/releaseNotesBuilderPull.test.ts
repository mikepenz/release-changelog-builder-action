import {checkExportedData, mergeConfiguration, resolveConfiguration} from '../src/utils.js'
import {buildChangelog} from '../src/transform.js'
import {Options, pullData} from '../src/pr-collector/prCollector.js'
import {GithubRepository} from '../src/repositories/GithubRepository.js'
import {clear} from '../src/transform.js'
import {ReleaseNotesOptions} from '../src/releaseNotesBuilder.js'
import {expect, test} from 'vitest'

clear()

// load octokit instance
const enablePullData = false // if false -> use cache for data

const token = process.env.GITHUB_TOKEN || ''
const githubRepository = new GithubRepository(token, undefined, '.')
test('Should have empty changelog (tags)', async () => {
  const configuration = mergeConfiguration(undefined, resolveConfiguration('', 'configs/configuration.json'))

  const options = {
    owner: 'mikepenz',
    repo: 'release-changelog-builder-action',
    fromTag: {name: 'v0.0.2'},
    toTag: {name: 'v0.0.3'},
    includeOpen: false,
    failOnError: false,
    fetchViaCommits: true,
    fetchReviewers: false,
    fetchReleaseInformation: false,
    fetchReviews: false,
    mode: 'PR',
    configuration,
    repositoryUtils: githubRepository
  }
  let data: any
  if (enablePullData) {
    data = await pullData(githubRepository, options as Options)
  } else {
    data = checkExportedData(false, 'caches/rcba_0.0.2-0.0.3_cache.json')
  }
  const changeLog = buildChangelog(data!.diffInfo, data!.mergedPullRequests, options as ReleaseNotesOptions)
  console.log(changeLog)
  expect(changeLog).toStrictEqual('- no changes')
})

test('Should match generated changelog (tags)', async () => {
  const configuration = mergeConfiguration(undefined, resolveConfiguration('', 'configs/configuration.json'))
  const options = {
    owner: 'mikepenz',
    repo: 'release-changelog-builder-action',
    fromTag: {name: 'v0.0.1'},
    toTag: {name: 'v0.0.3'},
    includeOpen: false,
    failOnError: false,
    fetchViaCommits: true,
    fetchReviewers: false,
    fetchReleaseInformation: false,
    fetchReviews: false,
    mode: 'PR',
    configuration,
    repositoryUtils: githubRepository
  }
  let data: any
  if (enablePullData) {
    data = await pullData(githubRepository, options as Options)
  } else {
    data = checkExportedData(false, 'caches/rcba_0.0.1-0.0.3_cache.json')
  }
  const changeLog = buildChangelog(data!.diffInfo, data!.mergedPullRequests, options as ReleaseNotesOptions)
  console.log(changeLog)
  expect(changeLog).toStrictEqual(`## 🧪 Tests

- [CI] Specify Test Case
   - PR: #10

`)
})

test('Should match generated changelog (refs)', async () => {
  const configuration = mergeConfiguration(undefined, resolveConfiguration('', 'configs_test/configuration_all_placeholders.json'))

  const options = {
    owner: 'mikepenz',
    repo: 'release-changelog-builder-action',
    fromTag: {name: '5ec7a2d86fe9f43fdd38d5e254a1117c8a51b4c3'},
    toTag: {name: 'fa3788c8c4b3373ef8424ce3eb008a5cd07cc5aa'},
    includeOpen: false,
    failOnError: false,
    fetchViaCommits: true,
    fetchReviewers: false,
    fetchReleaseInformation: false,
    fetchReviews: false,
    mode: 'PR',
    configuration,
    repositoryUtils: githubRepository
  }
  let data: any
  if (enablePullData) {
    data = await pullData(githubRepository, options as Options)
  } else {
    data = checkExportedData(false, 'caches/rcba_5ec7a2-fa3788_cache.json')
  }
  const changeLog = buildChangelog(data!.diffInfo, data!.mergedPullRequests, options as ReleaseNotesOptions)
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

test('Should match generated changelog and replace all occurrences (refs)', async () => {
  const configuration = mergeConfiguration(undefined, resolveConfiguration('', 'configs_test/configuration_replace_all_placeholders.json'))
  const options = {
    owner: 'mikepenz',
    repo: 'release-changelog-builder-action',
    fromTag: {name: '5ec7a2d86fe9f43fdd38d5e254a1117c8a51b4c3'},
    toTag: {name: 'fa3788c8c4b3373ef8424ce3eb008a5cd07cc5aa'},
    includeOpen: false,
    failOnError: false,
    fetchViaCommits: true,
    fetchReviewers: false,
    fetchReleaseInformation: false,
    fetchReviews: false,
    mode: 'PR',
    configuration,
    repositoryUtils: githubRepository
  }
  let data: any
  if (enablePullData) {
    data = await pullData(githubRepository, options as Options)
  } else {
    data = checkExportedData(false, 'caches/rcba_5ec7a2-fa3788_cache.json')
  }
  const changeLog = buildChangelog(data!.diffInfo, data!.mergedPullRequests, options as ReleaseNotesOptions)
  console.log(changeLog)
  expect(changeLog).toStrictEqual(`## 🧪 Tests

[CI] Specify Test Case
[CI] Specify Test Case
10
https://github.com/mikepenz/release-changelog-builder-action/pull/10
2020-10-16T13:59:36.000Z
mikepenz
mikepenz
test
1.0.0
- specify test case
mikepenz, nhoelzl
nhoelzl

`)
})

test('Should match ordered ASC', async () => {
  const configuration = mergeConfiguration(undefined, resolveConfiguration('', 'configs_test/configuration_asc.json'))
  configuration.categories.pop() // drop `uncategorized` category
  const options = {
    owner: 'mikepenz',
    repo: 'release-changelog-builder-action',
    fromTag: {name: 'v0.3.0'},
    toTag: {name: 'v0.5.0'},
    includeOpen: false,
    failOnError: false,
    fetchViaCommits: false,
    fetchReviewers: false,
    fetchReleaseInformation: false,
    fetchReviews: false,
    mode: 'PR',
    configuration,
    repositoryUtils: githubRepository
  }
  let data: any
  if (enablePullData) {
    data = await pullData(githubRepository, options as Options)
  } else {
    data = checkExportedData(false, 'caches/rcba_0.3.0-0.5.0_cache.json')
  }
  const changeLog = buildChangelog(data!.diffInfo, data!.mergedPullRequests, options as ReleaseNotesOptions)
  console.log(changeLog)
  expect(changeLog).toStrictEqual(`## 🚀 Features\n\n22\n24\n25\n26\n28\n\n## 🐛 Fixes\n\n23\n\n`)
})

test('Should match ordered DESC', async () => {
  const configuration = mergeConfiguration(undefined, resolveConfiguration('', 'configs_test/configuration_desc.json'))
  configuration.categories.pop() // drop `uncategorized` category
  const options = {
    owner: 'mikepenz',
    repo: 'release-changelog-builder-action',
    fromTag: {name: 'v0.3.0'},
    toTag: {name: 'v0.5.0'},
    includeOpen: false,
    failOnError: false,
    fetchViaCommits: false,
    fetchReviewers: false,
    fetchReleaseInformation: false,
    fetchReviews: false,
    mode: 'PR',
    configuration,
    repositoryUtils: githubRepository
  }
  let data: any
  if (enablePullData) {
    data = await pullData(githubRepository, options as Options)
  } else {
    data = checkExportedData(false, 'caches/rcba_0.3.0-0.5.0_cache.json')
  }
  const changeLog = buildChangelog(data!.diffInfo, data!.mergedPullRequests, options as ReleaseNotesOptions)
  console.log(changeLog)
  expect(changeLog).toStrictEqual(`## 🚀 Features\n\n28\n26\n25\n24\n22\n\n## 🐛 Fixes\n\n23\n\n`)
})

test('Should match ordered by title ASC', async () => {
  const configuration = mergeConfiguration(undefined, resolveConfiguration('', 'configs_test/configuration_sort_title_asc.json'))
  const options = {
    owner: 'mikepenz',
    repo: 'release-changelog-builder-action',
    fromTag: {name: 'v0.3.0'},
    toTag: {name: 'v0.5.0'},
    includeOpen: false,
    failOnError: false,
    fetchViaCommits: false,
    fetchReviewers: false,
    fetchReleaseInformation: false,
    fetchReviews: false,
    mode: 'PR',
    configuration,
    repositoryUtils: githubRepository
  }
  let data: any
  if (enablePullData) {
    data = await pullData(githubRepository, options as Options)
  } else {
    data = checkExportedData(false, 'caches/rcba_0.3.0-0.5.0_cache.json')
  }
  const changeLog = buildChangelog(data!.diffInfo, data!.mergedPullRequests, options as ReleaseNotesOptions)
  console.log(changeLog)
  expect(changeLog).toStrictEqual(
    `## 🚀 Features\n\nEnhanced action logs\nImprove README\nImproved configuration failure handling\nImproved defaults if no configuration is provided\nIntroduce additional placeholders [milestone, labels, assignees, reviewers]\n\n## 🐛 Fixes\n\nImproved handling for non existing tags\n\n`
  )
})

test('Should match ordered by title DESC', async () => {
  const configuration = mergeConfiguration(undefined, resolveConfiguration('', 'configs_test/configuration_sort_title_desc.json'))
  const options = {
    owner: 'mikepenz',
    repo: 'release-changelog-builder-action',
    fromTag: {name: 'v0.3.0'},
    toTag: {name: 'v0.5.0'},
    includeOpen: false,
    failOnError: false,
    fetchViaCommits: false,
    fetchReviewers: false,
    fetchReleaseInformation: false,
    fetchReviews: false,
    mode: 'PR',
    configuration,
    repositoryUtils: githubRepository
  }
  let data: any
  if (enablePullData) {
    data = await pullData(githubRepository, options as Options)
  } else {
    data = checkExportedData(false, 'caches/rcba_0.3.0-0.5.0_cache.json')
  }
  const changeLog = buildChangelog(data!.diffInfo, data!.mergedPullRequests, options as ReleaseNotesOptions)
  console.log(changeLog)
  expect(changeLog).toStrictEqual(
    `## 🚀 Features\n\nIntroduce additional placeholders [milestone, labels, assignees, reviewers]\nImproved defaults if no configuration is provided\nImproved configuration failure handling\nImprove README\nEnhanced action logs\n\n## 🐛 Fixes\n\nImproved handling for non existing tags\n\n`
  )
})

test('Should ignore PRs not merged into develop branch', async () => {
  const configuration = mergeConfiguration(undefined, resolveConfiguration('', 'configs_test/configuration_base_branches_develop.json'))
  const options = {
    owner: 'mikepenz',
    repo: 'release-changelog-builder-action',
    fromTag: {name: 'v1.3.1'},
    toTag: {name: 'v1.4.0'},
    includeOpen: false,
    failOnError: false,
    fetchViaCommits: true,
    fetchReviewers: false,
    fetchReleaseInformation: false,
    fetchReviews: false,
    mode: 'PR',
    configuration,
    repositoryUtils: githubRepository
  }
  let data: any
  if (enablePullData) {
    data = await pullData(githubRepository, options as Options)
  } else {
    data = checkExportedData(false, 'caches/rcba_1.3.1-1.4.0_base_develop_cache.json')
  }
  const changeLog = buildChangelog(data!.diffInfo, data!.mergedPullRequests, options as ReleaseNotesOptions)
  console.log(changeLog)
  expect(changeLog).toStrictEqual(`150\n\n`)
})

test('Should ignore PRs not merged into main branch', async () => {
  const configuration = mergeConfiguration(undefined, resolveConfiguration('', 'configs_test/configuration_base_branches_main.json'))
  const options = {
    owner: 'mikepenz',
    repo: 'release-changelog-builder-action',
    fromTag: {name: 'v1.3.1'},
    toTag: {name: 'v1.4.0'},
    includeOpen: false,
    failOnError: false,
    fetchViaCommits: true,
    fetchReviewers: false,
    fetchReleaseInformation: false,
    fetchReviews: false,
    mode: 'PR',
    configuration,
    repositoryUtils: githubRepository
  }
  let data: any
  if (enablePullData) {
    data = await pullData(githubRepository, options as Options)
  } else {
    data = checkExportedData(false, 'caches/rcba_1.3.1-1.4.0_base_main_cache.json')
  }
  const changeLog = buildChangelog(data!.diffInfo, data!.mergedPullRequests, options as ReleaseNotesOptions)
  console.log(changeLog)
  expect(changeLog).toStrictEqual(`153\n\n`)
})

test('Default configuration with commit mode', async () => {
  const configuration = Object.assign({}, mergeConfiguration(undefined, undefined, 'COMMIT'))
  const options = {
    owner: 'conventional-commits',
    repo: 'conventionalcommits.org',
    fromTag: {name: '56cdc85d01fd11aa164bd958bbf6114a51abfcf6'},
    toTag: {name: '325b74fbc44bf34d9fa645951d076a450b4e26be'},
    includeOpen: false,
    failOnError: false,
    fetchViaCommits: false,
    fetchReviewers: false,
    fetchReleaseInformation: false,
    fetchReviews: false,
    mode: 'COMMIT',
    configuration,
    repositoryUtils: githubRepository
  }
  let data: any
  if (enablePullData) {
    data = await pullData(githubRepository, options as Options)
  } else {
    data = checkExportedData(false, 'caches/github_conventional-commits-1e1c8e-325b74.json')
  }
  const changeLog = buildChangelog(data!.diffInfo, data!.mergedPullRequests, options as ReleaseNotesOptions)
  console.log(changeLog)
  expect(changeLog).toStrictEqual(
    `## 🚀 Features\n\n- feat(lang): add Bengali\n- feat(lang): add uzbek translation (#558)\n\n## 🐛 Fixes\n\n- fix: Fix grammar and consistency in french translation (#546)\n- fix(ja): fix typo\n- fix(zh-hant): Distinguish translations of 'Release/Publish'\n- fix(ko): fix translation typo for message (#567)\n\n## 📦 Other\n\n- doc: new thi.ng links and descriptions\n- docs: add link to git-changelog-command-line docker image\n- docs: Add descriptions for commit types\n\n`
  )
})

test('Default configuration with commit mode and custom placeholder', async () => {
  const configuration = Object.assign({}, mergeConfiguration(undefined, undefined, 'COMMIT'))
  configuration.commit_template = '- #{{TITLE_ONLY}}'
  configuration.trim_values = true
  configuration.custom_placeholders = [
    {
      name: 'TITLE_ONLY',
      source: 'TITLE',
      transformer: {
        method: 'regexr',
        pattern: '(\\w+(\\(.+\\))?: ?)?(.+)',
        target: '$3'
      }
    }
  ]

  const options = {
    owner: 'conventional-commits',
    repo: 'conventionalcommits.org',
    fromTag: {name: '56cdc85d01fd11aa164bd958bbf6114a51abfcf6'},
    toTag: {name: '325b74fbc44bf34d9fa645951d076a450b4e26be'},
    includeOpen: false,
    failOnError: false,
    fetchViaCommits: false,
    fetchReviewers: false,
    fetchReleaseInformation: false,
    fetchReviews: false,
    mode: 'COMMIT',
    configuration,
    repositoryUtils: githubRepository
  }
  let data: any
  if (enablePullData) {
    data = await pullData(githubRepository, options as Options)
  } else {
    data = checkExportedData(false, 'caches/github_conventional-commits-1e1c8e-325b74.json')
  }
  const changeLog = buildChangelog(data!.diffInfo, data!.mergedPullRequests, options as ReleaseNotesOptions)
  console.log(changeLog)
  expect(changeLog).toStrictEqual(
    `## 🚀 Features\n\n- add Bengali\n- add uzbek translation (#558)\n\n## 🐛 Fixes\n\n- Fix grammar and consistency in french translation (#546)\n- fix typo\n- Distinguish translations of 'Release/Publish'\n- fix translation typo for message (#567)\n\n## 📦 Other\n\n- new thi.ng links and descriptions\n- add link to git-changelog-command-line docker image\n- Add descriptions for commit types`
  )
})

test('Default configuration with hybrid mode and classic categories', async () => {
  const configuration = Object.assign({}, mergeConfiguration(undefined, undefined, 'HYBRID'))
  const options = {
    owner: 'conventional-commits',
    repo: 'conventionalcommits.org',
    fromTag: {name: '56cdc85d01fd11aa164bd958bbf6114a51abfcf6'},
    toTag: {name: '325b74fbc44bf34d9fa645951d076a450b4e26be'},
    includeOpen: false,
    failOnError: false,
    fetchViaCommits: false,
    fetchReviewers: false,
    fetchReleaseInformation: false,
    fetchReviews: false,
    mode: 'HYBRID',
    configuration,
    repositoryUtils: githubRepository
  } as ReleaseNotesOptions & Options
  let data: any
  if (enablePullData) {
    data = await pullData(githubRepository, options as Options)
  } else {
    data = checkExportedData(false, 'caches/github_conventional-hybrid-1e1c8e-325b74.json')
  }
  const releaseNotesOptions = {...options, ...(data?.options ? data.options : {})} as unknown as ReleaseNotesOptions
  const changeLog = buildChangelog(data!.diffInfo, data!.mergedPullRequests, releaseNotesOptions)
  console.log(changeLog)

  const expected = `## 🚀 Features

- feat(lang): add Bengali
- feat(lang): add uzbek translation (#558)

## 🐛 Fixes

- fix: Fix grammar and consistency in french translation (#546)
- fix(ja): fix typo
- fix(zh-hant): Distinguish translations of 'Release/Publish'
- fix(ko): fix translation typo for message (#567)

## 📦 Other

- fix: Fix grammar and consistency in french translation
- Add/update tool/project links
- fix(ja): fix typo
- docs: add link to git-changelog-command-line docker image
- docs: Add descriptions for commit types
- fix(zh-hant): Distinguish translations of 'Release/Publish'
- "feat(lang): add Bengali translation"  
- feat(lang): add uzbek translation
- fix(ko): fix translation typo for message
- doc: new thi.ng links and descriptions
- docs: add link to git-changelog-command-line docker image
- docs: Add descriptions for commit types

`

  expect(changeLog).toStrictEqual(expected)
})

test('Default configuration with hybrid mode and with separate feature categories', async () => {
  const configuration = Object.assign({}, mergeConfiguration(undefined, undefined, 'HYBRID'))
  const options = {
    owner: 'conventional-commits',
    repo: 'conventionalcommits.org',
    fromTag: {name: '56cdc85d01fd11aa164bd958bbf6114a51abfcf6'},
    toTag: {name: '325b74fbc44bf34d9fa645951d076a450b4e26be'},
    includeOpen: false,
    failOnError: false,
    fetchViaCommits: false,
    fetchReviewers: false,
    fetchReleaseInformation: false,
    fetchReviews: false,
    mode: 'HYBRID',
    configuration,
    repositoryUtils: githubRepository
  } as ReleaseNotesOptions & Options
  let data: any
  if (enablePullData) {
    data = await pullData(githubRepository, options as Options)
  } else {
    data = checkExportedData(false, 'caches/github_conventional-hybrid-separate-cats-1e1c8e-325b74.json')
  }
  const releaseNotesOptions = {...options, ...(data?.options ? data.options : {})} as unknown as ReleaseNotesOptions
  const changeLog = buildChangelog(data!.diffInfo, data!.mergedPullRequests, releaseNotesOptions)
  console.log(changeLog)

  const expected = `## 🚀 Big features

- feat(lang): add uzbek translation

## 🚀 Small features

- feat(lang): add Bengali
- feat(lang): add uzbek translation (#558)

## 🐛 Fixes

- fix: Fix grammar and consistency in french translation
- fix(ja): fix typo
- fix(zh-hant): Distinguish translations of 'Release/Publish'
- fix(ko): fix translation typo for message
- fix: Fix grammar and consistency in french translation (#546)
- fix(ja): fix typo
- fix(zh-hant): Distinguish translations of 'Release/Publish'
- fix(ko): fix translation typo for message (#567)

## 📦 Other

- Add/update tool/project links
- docs: add link to git-changelog-command-line docker image
- docs: Add descriptions for commit types
- "feat(lang): add Bengali translation"  
- doc: new thi.ng links and descriptions
- docs: add link to git-changelog-command-line docker image
- docs: Add descriptions for commit types

`

  expect(changeLog).toStrictEqual(expected)
})
test('Default configuration with hybrid mode and with separate feature categories and dup checker', async () => {
  const configuration = Object.assign({}, mergeConfiguration(undefined, undefined, 'HYBRID'))
  const options = {
    owner: 'conventional-commits',
    repo: 'conventionalcommits.org',
    fromTag: {name: '56cdc85d01fd11aa164bd958bbf6114a51abfcf6'},
    toTag: {name: '325b74fbc44bf34d9fa645951d076a450b4e26be'},
    includeOpen: false,
    failOnError: false,
    fetchViaCommits: false,
    fetchReviewers: false,
    fetchReleaseInformation: false,
    fetchReviews: false,
    mode: 'HYBRID',
    configuration,
    repositoryUtils: githubRepository
  } as ReleaseNotesOptions & Options
  let data: any
  if (enablePullData) {
    data = await pullData(githubRepository, options as Options)
  } else {
    data = checkExportedData(false, 'caches/github_conventional-hybrid-separate-cats-1e1c8e-325b74.json')
  }
  const releaseNotesOptions = {...options, ...(data?.options ? data.options : {})} as unknown as ReleaseNotesOptions

  releaseNotesOptions.configuration.duplicate_filter = {
    pattern: '(.+) \\(#\\d+\\)',
    target: '$1',
    on_property: 'title'
  }

  const changeLog = buildChangelog(data!.diffInfo, data!.mergedPullRequests, releaseNotesOptions)
  console.log(changeLog)

  // Test author's note: Here I was hoping the "add uzbek translation" pr would be categorized
  // as a Big feature, but due to how duplicates are handled (i.e. previous ones get replaced by following duplicates)
  // it ends up as a Small feature. I'm not sure if this is the desired behavior or not, but I'm leaving it as is for now.
  const expected = `## 🚀 Small features

- feat(lang): add Bengali
- feat(lang): add uzbek translation (#558)

## 🐛 Fixes

- fix: Fix grammar and consistency in french translation
- fix(ja): fix typo
- fix(zh-hant): Distinguish translations of 'Release/Publish'
- fix(ko): fix translation typo for message (#567)

## 📦 Other

- Add/update tool/project links
- "feat(lang): add Bengali translation"  
- doc: new thi.ng links and descriptions
- docs: add link to git-changelog-command-line docker image
- docs: Add descriptions for commit types

`

  expect(changeLog).toStrictEqual(expected)
})
