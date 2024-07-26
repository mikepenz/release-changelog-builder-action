import {checkExportedData, mergeConfiguration, resolveConfiguration} from '../../src/utils'
import {buildChangelog} from '../../src/transform'
import {Options, pullData} from '../../src/pr-collector/prCollector'
import {GiteaRepository} from '../../src/repositories/GiteaRepository'
import {clear} from '../../src/transform'
import {ReleaseNotesOptions} from '../../src/releaseNotesBuilder'

jest.setTimeout(180000)
clear()

// load octokit instance
const enablePullData = false
/**
 * if false -> use cache for data
 * Use the below snippet to export the cache:
 *
 *  writeCacheData({
 *    mergedPullRequests: data.mergedPullRequests,
 *    diffInfo: data.diffInfo,
 *    options
 *  }, 'caches/gitea_rcba_0.1.0-master_cache.json')
 */

/**
 * Before starting testing, you should manually clone the repository
 * cd /tmp && git clone https://gitea.com/mikepenz/sip
 *
 * (Forked from: https://gitea.com/jolheiser/sip)
 */

const token = process.env.GITEA_TOKEN || ''
const workingDirectory = '/tmp/sip/'
const owner = 'jolheiser'
const repo = 'sip'
const giteaRepository = new GiteaRepository(token, undefined, workingDirectory)
const configurationFile = 'configs/configuration_gitea.json'
it('[Gitea] Should have  changelog (tags)', async () => {
  const configuration = mergeConfiguration(undefined, resolveConfiguration('', configurationFile))

  const options = {
    owner: owner,
    repo: repo,
    fromTag: {name: 'v0.5.0'},
    toTag: {name: 'master'},
    includeOpen: false,
    failOnError: false,
    fetchViaCommits: true,
    fetchReviewers: false,
    fetchReleaseInformation: false,
    fetchReviews: false,
    mode: 'PR',
    configuration,
    repositoryUtils: giteaRepository
  }
  let data: any
  if (enablePullData) {
    data = await pullData(giteaRepository, options as Options)
  } else {
    data = checkExportedData(false, 'caches/gitea_rcba_0.5.0-master_cache.json')
  }
  const changeLog = buildChangelog(data!.diffInfo, data!.mergedPullRequests, options as ReleaseNotesOptions)
  console.log(changeLog)
  expect(changeLog).toStrictEqual(`## 🚀 Features

- Add attachment removal and change message
   - PR: #36

## 🐛 Fixes

- Fix drone-gitea-main
   - PR: #38

`)
})

it('[Gitea] Should match generated changelog (tags)', async () => {
  const configuration = mergeConfiguration(undefined, resolveConfiguration('', configurationFile))
  const options = {
    owner: owner,
    repo: repo,
    fromTag: {name: 'v0.5.0'},
    toTag: {name: 'master'},
    includeOpen: false,
    failOnError: false,
    fetchViaCommits: true,
    fetchReviewers: false,
    fetchReleaseInformation: false,
    fetchReviews: false,
    mode: 'PR',
    configuration,
    repositoryUtils: giteaRepository
  }
  let data: any
  if (enablePullData) {
    data = await pullData(giteaRepository, options as Options)
  } else {
    data = checkExportedData(false, 'caches/gitea_rcba_0.5.0-master_cache.json')
  }
  const changeLog = buildChangelog(data!.diffInfo, data!.mergedPullRequests, options as ReleaseNotesOptions)
  console.log(changeLog)
  expect(changeLog).toStrictEqual(`## 🚀 Features

- Add attachment removal and change message
   - PR: #36

## 🐛 Fixes

- Fix drone-gitea-main
   - PR: #38

`)
})

it('[Gitea] Should match generated changelog (refs)', async () => {
  const configuration = mergeConfiguration(undefined, resolveConfiguration('', 'configs_test/configuration_all_placeholders.json'))

  const options = {
    owner: owner,
    repo: repo,
    fromTag: {name: '3e49adf6047960a03f53346bbececb3ce7e0809b'},
    toTag: {name: '894a641ef86c444dccfa55eca457186b5e10da95'},
    includeOpen: false,
    failOnError: false,
    fetchViaCommits: true,
    fetchReviewers: false,
    fetchReleaseInformation: false,
    fetchReviews: false,
    mode: 'PR',
    configuration,
    repositoryUtils: giteaRepository
  }
  let data: any
  if (enablePullData) {
    data = await pullData(giteaRepository, options as Options)
  } else {
    data = checkExportedData(false, 'caches/gitea_rcba_3e49adf-894a64_cache.json')
  }
  const changeLog = buildChangelog(data!.diffInfo, data!.mergedPullRequests, options as ReleaseNotesOptions)
  console.log(changeLog)
  expect(changeLog).toStrictEqual(`## 📦 Uncategorized

Add release attachments
26
https://gitea.com/jolheiser/sip/pulls/26
2020-09-16T18:07:32.000Z
jolheiser
enhancement
0.5.0
Resolves #25


Refactor
29
https://gitea.com/jolheiser/sip/pulls/29
2020-09-17T16:25:11.000Z
jolheiser
enhancement
0.5.0
Fixes #27

Fixes #28

This PR refactors and cleans up packages.

It also scans CLI flags into variables for fewer footguns.



`)
})

it('[Gitea] Should match generated changelog and replace all occurrences (refs)', async () => {
  const configuration = mergeConfiguration(undefined, resolveConfiguration('', 'configs_test/configuration_replace_all_placeholders.json'))
  const options = {
    owner: owner,
    repo: repo,
    fromTag: {name: '3e49adf6047960a03f53346bbececb3ce7e0809b'},
    toTag: {name: '894a641ef86c444dccfa55eca457186b5e10da95'},
    includeOpen: false,
    failOnError: false,
    fetchViaCommits: true,
    fetchReviewers: false,
    fetchReleaseInformation: false,
    fetchReviews: false,
    mode: 'PR',
    configuration,
    repositoryUtils: giteaRepository
  }
  let data: any
  if (enablePullData) {
    data = await pullData(giteaRepository, options as Options)
  } else {
    data = checkExportedData(false, 'caches/gitea_rcba_3e49adf-894a64_cache.json')
  }
  const changeLog = buildChangelog(data!.diffInfo, data!.mergedPullRequests, options as ReleaseNotesOptions)
  console.log(changeLog)
  expect(changeLog).toStrictEqual(`## 📦 Uncategorized

Add release attachments
Add release attachments
26
https://gitea.com/jolheiser/sip/pulls/26
2020-09-16T18:07:32.000Z
jolheiser
jolheiser
enhancement
0.5.0
Resolves #25


Refactor
Refactor
29
https://gitea.com/jolheiser/sip/pulls/29
2020-09-17T16:25:11.000Z
jolheiser
jolheiser
enhancement
0.5.0
Fixes #27

Fixes #28

This PR refactors and cleans up packages.

It also scans CLI flags into variables for fewer footguns.



`)
})

it('[Gitea] Should match ordered ASC', async () => {
  const configuration = mergeConfiguration(undefined, resolveConfiguration('', configurationFile))
  configuration.categories.pop() // drop `uncategorized` category
  const options = {
    owner: owner,
    repo: repo,
    fromTag: {name: 'v0.1.0'},
    toTag: {name: 'master'},
    includeOpen: false,
    failOnError: false,
    fetchViaCommits: false,
    fetchReviewers: false,
    fetchReleaseInformation: false,
    fetchReviews: false,
    mode: 'PR',
    configuration,
    repositoryUtils: giteaRepository
  }
  let data: any
  if (enablePullData) {
    data = await pullData(giteaRepository, options as Options)
  } else {
    data = checkExportedData(false, 'caches/gitea_rcba_0.1.0-master_cache.json')
  }
  const changeLog = buildChangelog(data!.diffInfo, data!.mergedPullRequests, options as ReleaseNotesOptions)
  console.log(changeLog)
  expect(changeLog).toStrictEqual(`## 🚀 Features

- Add Drone and releases
   - PR: #2
- Add search filters
   - PR: #8
- Add qualifier module
   - PR: #10
- Add create repo command
   - PR: #13
- Add release support and CSV output
   - PR: #16
- Add open functionality
   - PR: #21
- Add changelog for 0.3.0 and 0.4.0
   - PR: #22
- Add release attachments
   - PR: #26
- Add attachment removal and change message
   - PR: #36

## 🐛 Fixes

- Fix PR head nil panic
   - PR: #7
- Fix Drone release
   - PR: #14

`)
})

it('[Gitea] Should match ordered DESC', async () => {
  const configuration = mergeConfiguration(undefined, resolveConfiguration('', 'configs_test/configuration_gitea_desc.json'))
  configuration.categories.pop() // drop `uncategorized` category
  const options = {
    owner: owner,
    repo: repo,
    fromTag: {name: 'v0.1.0'},
    toTag: {name: 'master'},
    includeOpen: false,
    failOnError: false,
    fetchViaCommits: false,
    fetchReviewers: false,
    fetchReleaseInformation: false,
    fetchReviews: false,
    mode: 'PR',
    configuration,
    repositoryUtils: giteaRepository
  }
  let data: any
  if (enablePullData) {
    data = await pullData(giteaRepository, options as Options)
  } else {
    data = checkExportedData(false, 'caches/gitea_rcba_0.1.0-master_cache.json')
  }
  const changeLog = buildChangelog(data!.diffInfo, data!.mergedPullRequests, options as ReleaseNotesOptions)
  console.log(changeLog)
  expect(changeLog).toStrictEqual(`## 🚀 Features

- Add attachment removal and change message
   - PR: #36
- Add release attachments
   - PR: #26
- Add changelog for 0.3.0 and 0.4.0
   - PR: #22
- Add open functionality
   - PR: #21
- Add release support and CSV output
   - PR: #16
- Add create repo command
   - PR: #13
- Add qualifier module
   - PR: #10
- Add search filters
   - PR: #8
- Add Drone and releases
   - PR: #2

## 🐛 Fixes

- Fix Drone release
   - PR: #14
- Fix PR head nil panic
   - PR: #7

`)
})

/*
 * I delete these test cases about gitea
 * Should match ordered by title ASC
 * Should match ordered by title DESC
 * Should ignore PRs not merged into develop branch
 */
