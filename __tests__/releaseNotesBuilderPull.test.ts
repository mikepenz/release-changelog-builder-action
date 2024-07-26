import {checkExportedData, mergeConfiguration, resolveConfiguration} from '../src/utils'
import {buildChangelog} from '../src/transform'
import {Options, pullData} from '../src/pr-collector/prCollector'
import {GithubRepository} from '../src/repositories/GithubRepository'
import {clear} from '../src/transform'
import {ReleaseNotesOptions} from '../src/releaseNotesBuilder'

jest.setTimeout(180000)
clear()

// load octokit instance
const enablePullData = false // if false -> use cache for data

const token = process.env.GITHUB_TOKEN || ''
const githubRepository = new GithubRepository(token, undefined, '.')
it('Should have empty changelog (tags)', async () => {
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

it('Should match generated changelog (tags)', async () => {
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

it('Should match generated changelog (refs)', async () => {
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

it('Should match generated changelog and replace all occurrences (refs)', async () => {
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

it('Should match ordered ASC', async () => {
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

it('Should match ordered DESC', async () => {
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

it('Should match ordered by title ASC', async () => {
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

it('Should match ordered by title DESC', async () => {
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

it('Should ignore PRs not merged into develop branch', async () => {
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

it('Should ignore PRs not merged into main branch', async () => {
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

it('Default configuration with commit mode', async () => {
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

it('Default configuration with commit mode and custom placeholder', async () => {
  const configuration = Object.assign({}, mergeConfiguration(undefined, undefined, 'COMMIT'))
  configuration.pr_template = '- #{{TITLE_ONLY}}'
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
