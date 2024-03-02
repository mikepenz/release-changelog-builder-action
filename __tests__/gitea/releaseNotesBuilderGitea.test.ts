import {mergeConfiguration, resolveConfiguration} from '../../src/utils'
import {ReleaseNotesBuilder} from '../../src/releaseNotesBuilder'
import {GiteaRepository} from '../../src/repositories/GiteaRepository'
import {clear} from '../../src/transform'

jest.setTimeout(180000)
clear()

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
const configurationFile = 'configs/configuration_gitea.json'

it('[Gitea] Verify reviewers who approved are fetched and also release information', async () => {
  const configuration = mergeConfiguration(undefined, resolveConfiguration('', 'configs_test/configuration_approvers.json'))

  const giteaRepository = new GiteaRepository(token, undefined, workingDirectory)
  const releaseNotesBuilder = new ReleaseNotesBuilder(
    null, // baseUrl
    giteaRepository, // token
    workingDirectory, // repoPath
    owner, // user
    repo, // repo
    'v0.5.0', // fromTag
    'master', // toTag
    true, // includeOpen
    false, // failOnError
    false, // ignorePrePrelease
    false, // enable to fetch via commits
    true, // enable to fetch reviewers
    true, // enable to fetch tag release information
    false, // enable to fetch reviews
    'PR', // mode
    false, // enable exportCache
    false, // enable exportOnly
    null, // path to the cache
    configuration // configuration
  )

  const changeLog = await releaseNotesBuilder.build()
  console.log(changeLog)
  expect(changeLog).toStrictEqual(
    `## 📦 Uncategorized

- Add attachment removal and change message -- (#36) [merged]  --- 
- Change to vanity URL -- (#37) [merged]  --- 



4`
  )
})

it('[Gitea] Should match generated changelog (unspecified fromTag)', async () => {
  const configuration = mergeConfiguration(undefined, resolveConfiguration('', configurationFile))

  const giteaRepository = new GiteaRepository(token, undefined, workingDirectory)
  const releaseNotesBuilder = new ReleaseNotesBuilder(
    null,
    giteaRepository,
    workingDirectory,
    owner,
    repo,
    null,
    'v0.1.1',
    false,
    false,
    false,
    true, // enable to fetch via commits
    false, // enable to fetch reviewers
    false, // enable to fetch tag release information
    false, // enable to fetch reviews
    'PR', // mode
    false, // enable exportCache
    false, // enable exportOnly
    null, // path to the cache
    configuration
  )

  const changeLog = await releaseNotesBuilder.build()
  console.log(changeLog)
  expect(changeLog).toStrictEqual(`## 🧪 Upgrade

- Clean up and polish
   - PR: #1

`)
})

//
it('[Gitea] Should match generated changelog (unspecified tags)', async () => {
  const configuration = mergeConfiguration(undefined, resolveConfiguration('', configurationFile))

  const giteaRepository = new GiteaRepository(token, undefined, workingDirectory)
  const releaseNotesBuilder = new ReleaseNotesBuilder(
    null,
    giteaRepository,
    workingDirectory,
    owner,
    repo,
    null,
    null,
    false,
    false,
    false,
    false, // enable to fetch via commits
    false, // enable to fetch reviewers
    false, // enable to fetch tag release information
    false, // enable to fetch reviews
    'PR', // mode
    false, // enable exportCache
    false, // enable exportOnly
    null, // path to the cache
    configuration
  )

  const changeLog = await releaseNotesBuilder.build()
  console.log(changeLog)
  expect(changeLog).toStrictEqual(`## 🚀 Features

- Add release attachments
   - PR: #26

`)
})

it('[Gitea] Should use empty placeholder', async () => {
  const configuration = mergeConfiguration(undefined, resolveConfiguration('', configurationFile))

  const giteaRepository = new GiteaRepository(token, undefined, workingDirectory)
  const releaseNotesBuilder = new ReleaseNotesBuilder(
    null,
    giteaRepository,
    workingDirectory,
    owner,
    repo,
    'v0.1.1',
    'v0.3.0',
    false,
    false,
    false,
    true, // enable to fetch via commits
    false, // enable to fetch reviewers
    false, // enable to fetch tag release information
    false, // enable to fetch reviews
    'PR', // mode
    false, // enable exportCache
    false, // enable exportOnly
    null, // path to the cache
    configuration
  )

  const changeLog = await releaseNotesBuilder.build()
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

## 🐛 Fixes

- Fix PR head nil panic
   - PR: #7
- Fix Drone release
   - PR: #14

`)
})

it('[Gitea] Should fill empty placeholders', async () => {
  const configuration = mergeConfiguration(undefined, resolveConfiguration('', 'configs_test/configuration_empty_all_placeholders.json'))

  const giteaRepository = new GiteaRepository(token, undefined, workingDirectory)
  const releaseNotesBuilder = new ReleaseNotesBuilder(
    null,
    giteaRepository,
    workingDirectory,
    owner,
    repo,
    'v0.1.0',
    'v0.4.0',
    false,
    false,
    false,
    true, // enable to fetch via commits
    false, // enable to fetch reviewers
    false, // enable to fetch tag release information
    false, // enable to fetch reviews
    'PR', // mode
    false, // enable exportCache
    false, // enable exportOnly
    null, // path to the cache
    configuration
  )

  const changeLog = await releaseNotesBuilder.build()
  console.log(changeLog)
  expect(changeLog).toStrictEqual(
    `## 🚀 Features

- Add create repo command
   - PR: #13
- Add release support and CSV output
   - PR: #16
- Add open functionality
   - PR: #21

## 📦 Uncategorized

- Clean up and polish
   - PR: #1
- Add Drone and releases
   - PR: #2
- Update Beaver and fix bugs
   - PR: #6
- Fix PR head nil panic
   - PR: #7
- Add search filters
   - PR: #8
- Changelog 0.2.0
   - PR: #9
- Add qualifier module
   - PR: #10
- Fix Drone release
   - PR: #14
- Imp formatting
   - PR: #17
- Update Gitea SDK and other modules
   - PR: #19
- Update modules
   - PR: #20
- Add changelog for 0.3.0 and 0.4.0
   - PR: #22


- Clean up and polish
   - PR: #1
- Add Drone and releases
   - PR: #2
- Update Beaver and fix bugs
   - PR: #6
- Fix PR head nil panic
   - PR: #7
- Add search filters
   - PR: #8
- Changelog 0.2.0
   - PR: #9
- Add qualifier module
   - PR: #10
- Fix Drone release
   - PR: #14
- Imp formatting
   - PR: #17
- Update Gitea SDK and other modules
   - PR: #19
- Update modules
   - PR: #20
- Add changelog for 0.3.0 and 0.4.0
   - PR: #22


jolheiser
sip
v0.1.0
v0.4.0
https://gitea.com/jolheiser/sip/compare/v0.1.0...v0.4.0
3
12
0
36
1322
274
0
16`
  )
})

it('[Gitea] Should fill `template` placeholders', async () => {
  const configuration = mergeConfiguration(undefined, resolveConfiguration('', 'configs_test/configuration_empty_all_placeholders.json'))

  const giteaRepository = new GiteaRepository(token, undefined, workingDirectory)
  const releaseNotesBuilder = new ReleaseNotesBuilder(
    null,
    giteaRepository,
    workingDirectory,
    owner,
    repo,
    'v0.1.0',
    'v0.4.0',
    false,
    false,
    false,
    true, // enable to fetch via commits
    false, // enable to fetch reviewers
    false, // enable to fetch tag release information
    false, // enable to fetch reviews
    'PR', // mode
    false, // enable exportCache
    false, // enable exportOnly
    null, // path to the cache
    configuration
  )

  const changeLog = await releaseNotesBuilder.build()
  console.log(changeLog)
  expect(changeLog).toStrictEqual(
    `## 🚀 Features

- Add create repo command
   - PR: #13
- Add release support and CSV output
   - PR: #16
- Add open functionality
   - PR: #21

## 📦 Uncategorized

- Clean up and polish
   - PR: #1
- Add Drone and releases
   - PR: #2
- Update Beaver and fix bugs
   - PR: #6
- Fix PR head nil panic
   - PR: #7
- Add search filters
   - PR: #8
- Changelog 0.2.0
   - PR: #9
- Add qualifier module
   - PR: #10
- Fix Drone release
   - PR: #14
- Imp formatting
   - PR: #17
- Update Gitea SDK and other modules
   - PR: #19
- Update modules
   - PR: #20
- Add changelog for 0.3.0 and 0.4.0
   - PR: #22


- Clean up and polish
   - PR: #1
- Add Drone and releases
   - PR: #2
- Update Beaver and fix bugs
   - PR: #6
- Fix PR head nil panic
   - PR: #7
- Add search filters
   - PR: #8
- Changelog 0.2.0
   - PR: #9
- Add qualifier module
   - PR: #10
- Fix Drone release
   - PR: #14
- Imp formatting
   - PR: #17
- Update Gitea SDK and other modules
   - PR: #19
- Update modules
   - PR: #20
- Add changelog for 0.3.0 and 0.4.0
   - PR: #22


jolheiser
sip
v0.1.0
v0.4.0
https://gitea.com/jolheiser/sip/compare/v0.1.0...v0.4.0
3
12
0
36
1322
274
0
16`
  )
})

it('[Gitea] Should fill `template` placeholders, ignore', async () => {
  const configuration = mergeConfiguration(undefined, resolveConfiguration('', 'configs_test/configuration_empty_all_placeholders.json'))
  configuration.categories.pop() // drop `uncategorized` category

  const giteaRepository = new GiteaRepository(token, undefined, workingDirectory)
  const releaseNotesBuilder = new ReleaseNotesBuilder(
    null,
    giteaRepository,
    workingDirectory,
    owner,
    repo,
    'v0.3.0',
    'v0.5.0',
    false,
    false,
    false,
    false, // enable to fetch via commits
    false, // enable to fetch reviewers
    false, // enable to fetch tag release information
    false, // enable to fetch reviews
    'PR', // mode
    false, // enable exportCache
    false, // enable exportOnly
    null, // path to the cache
    configuration
  )

  const changeLog = await releaseNotesBuilder.build()
  console.log(changeLog)
  expect(changeLog).toStrictEqual(
    `## 🚀 Features

- Add open functionality
   - PR: #21


- Update modules
   - PR: #20
- Add changelog for 0.3.0 and 0.4.0
   - PR: #22
- Update Gitea SDK
   - PR: #23
- Update repo info
   - PR: #24
- Add release attachments
   - PR: #26
- Refactor
   - PR: #29


jolheiser
sip
v0.3.0
v0.5.0
https://gitea.com/jolheiser/sip/compare/v0.3.0...v0.5.0
1
6
0
41
748
314
0
8`
  )
})

it('[Gitea] Uncategorized category', async () => {
  const configuration = mergeConfiguration(undefined, resolveConfiguration('', 'configs_test/configuration_uncategorized_category.json'))

  const giteaRepository = new GiteaRepository(token, undefined, workingDirectory)
  const releaseNotesBuilder = new ReleaseNotesBuilder(
    null,
    giteaRepository,
    workingDirectory,
    owner,
    repo,
    'v0.3.0',
    'v0.5.0',
    false,
    false,
    false,
    false, // enable to fetch via commits
    false, // enable to fetch reviewers
    false, // enable to fetch tag release information
    false, // enable to fetch reviews
    'PR', // mode
    false, // enable exportCache
    false, // enable exportOnly
    null, // path to the cache
    configuration
  )

  const changeLog = await releaseNotesBuilder.build()
  console.log(changeLog)
  expect(changeLog).toStrictEqual(
    `## 🚀 Features

- Add open functionality
   - PR: #21

## 📦 Uncategorized

- Update modules
   - PR: #20
- Add changelog for 0.3.0 and 0.4.0
   - PR: #22
- Update Gitea SDK
   - PR: #23
- Update repo info
   - PR: #24
- Add release attachments
   - PR: #26
- Refactor
   - PR: #29



Uncategorized:
- Update modules
   - PR: #20
- Add changelog for 0.3.0 and 0.4.0
   - PR: #22
- Update Gitea SDK
   - PR: #23
- Update repo info
   - PR: #24
- Add release attachments
   - PR: #26
- Refactor
   - PR: #29


Ignored:


6
0`
  )
})

it('[Gitea] Verify commit based changelog', async () => {
  const configuration = mergeConfiguration(undefined, resolveConfiguration('', 'configs_test/configuration_commits.json'))

  const giteaRepository = new GiteaRepository(token, undefined, workingDirectory)
  const releaseNotesBuilder = new ReleaseNotesBuilder(
    null,
    giteaRepository,
    workingDirectory,
    owner,
    repo,
    'v0.3.0',
    'v0.5.0',
    false,
    false,
    false,
    true, // enable to fetch via commits
    false, // enable to fetch reviewers
    false, // enable to fetch tag release information
    false, // enable to fetch reviews
    'COMMIT', // enable commitMode
    false, // enable exportCache
    false, // enable exportOnly
    null, // path to the cache
    configuration
  )

  const changeLog = await releaseNotesBuilder.build()
  console.log(changeLog)
  expect(changeLog).toStrictEqual(
    `## 📦 Uncategorized

- Update modules (#20)

- Add open functionality (#21)

- Add changelog for 0.3.0 and 0.4.0 (#22)

- Update Gitea SDK (#23)

- Update repo info (#24)

- Add release attachments (#26)

- Refactor (#29)

- Changelog 0.5.0 (#30)




Uncategorized:
- Update modules (#20)

- Add open functionality (#21)

- Add changelog for 0.3.0 and 0.4.0 (#22)

- Update Gitea SDK (#23)

- Update repo info (#24)

- Add release attachments (#26)

- Refactor (#29)

- Changelog 0.5.0 (#30)



Ignored:


8
0`
  )
})

it('[Gitea] Verify commit based changelog', async () => {
  const configuration = mergeConfiguration(undefined, resolveConfiguration('', configurationFile))

  const giteaRepository = new GiteaRepository(token, undefined, workingDirectory)
  const releaseNotesBuilder = new ReleaseNotesBuilder(
    null,
    giteaRepository,
    workingDirectory,
    owner,
    repo,
    '3e49adf6047960a03f53346bbececb3ce7e0809b',
    '894a641ef86c444dccfa55eca457186b5e10da95',
    false,
    false,
    false,
    false, // enable to fetch via commits
    false, // enable to fetch reviewers
    false, // enable to fetch tag release information
    false, // enable to fetch reviews
    'COMMIT', // enable commitMode
    false, // enable exportCache
    false, // enable exportOnly
    null, // path to the cache
    configuration
  )

  const changeLog = await releaseNotesBuilder.build()
  console.log(changeLog)
  expect(changeLog).toStrictEqual(
    `## 🚀 Features

- Add release attachments (#26)
   - PR: #0

`
  )
})
// no open prs
it('[Gitea] Verify default inclusion of open PRs', async () => {
  const configuration = mergeConfiguration(undefined, resolveConfiguration('', 'configs_test/configuration_including_open.json'))

  const giteaRepository = new GiteaRepository(token, undefined, workingDirectory)
  const releaseNotesBuilder = new ReleaseNotesBuilder(
    null, // baseUrl
    giteaRepository, // token
    workingDirectory, // repoPath
    owner, // user
    repo, // repo
    'v0.5.0', // fromTag
    'master', // toTag
    true, // includeOpen
    false, // failOnError
    false, // ignorePrePrelease
    false, // enable to fetch via commits
    false, // enable to fetch reviewers
    false, // enable to fetch tag release information
    false, // enable to fetch reviews
    'PR', // mode
    false, // enable exportCache
    false, // enable exportOnly
    null, // path to the cache
    configuration // configuration
  )

  const changeLog = await releaseNotesBuilder.build()
  console.log(changeLog)
  expect(changeLog).toStrictEqual(`


Uncategorized
- Add attachment removal and change message (#36) merged
- Change to vanity URL (#37) merged



Open
`)
})

it('[Gitea] Verify custom categorisation of open PRs', async () => {
  const configuration = mergeConfiguration(undefined, resolveConfiguration('', 'configs_test/configuration_excluding_open.json'))

  const giteaRepository = new GiteaRepository(token, undefined, workingDirectory)
  const releaseNotesBuilder = new ReleaseNotesBuilder(
    null, // baseUrl
    giteaRepository, // token
    workingDirectory, // repoPath
    owner, // user
    repo, // repo
    'v0.5.0', // fromTag
    'master', // toTag
    true, // includeOpen
    false, // failOnError
    false, // ignorePrePrelease
    false, // enable to fetch via commits
    false, // enable to fetch reviewers
    false, // enable to fetch tag release information
    false, // enable to fetch reviews
    'PR', // mode
    false, // enable exportCache
    false, // enable exportOnly
    null, // path to the cache
    configuration // configuration
  )

  const changeLog = await releaseNotesBuilder.build()
  console.log(changeLog)
  expect(changeLog).toStrictEqual(``)
})

it('[Gitea] Fetch release information', async () => {
  const configuration = mergeConfiguration(undefined, resolveConfiguration('', 'configs_test/configuration_approvers.json'))
  configuration.template = '#{{FROM_TAG}}-#{{FROM_TAG_DATE}}\n#{{TO_TAG}}-#{{TO_TAG_DATE}}\n#{{DAYS_SINCE}}'

  const giteaRepository = new GiteaRepository(token, undefined, workingDirectory)
  const releaseNotesBuilder = new ReleaseNotesBuilder(
    null, // baseUrl
    giteaRepository, // token
    workingDirectory, // repoPath
    owner, // user
    repo, // repo
    'v0.5.0', // fromTag
    'master', // toTag
    true, // includeOpen
    false, // failOnError
    false, // ignorePrePrelease
    false, // enable to fetch via commits
    false, // enable to fetch reviewers
    true, // enable to fetch tag release information
    false, // enable to fetch reviews
    'PR', // mode
    false, // enable exportCache
    false, // enable exportOnly
    null, // path to the cache
    configuration // configuration
  )

  const changeLog = await releaseNotesBuilder.build()
  console.log(changeLog)
  expect(changeLog).toStrictEqual(`v0.5.0-2020-09-17T16:34:40.000Z
master-2020-09-21T19:30:21.000Z
4`)
})

it('[Gitea] Fetch release information for non existing tag / release', async () => {
  const configuration = mergeConfiguration(undefined, resolveConfiguration('', 'configs_test/configuration_approvers.json'))
  configuration.template = '#{{FROM_TAG}}-#{{FROM_TAG_DATE}}\n#{{TO_TAG}}-#{{TO_TAG_DATE}}\n#{{DAYS_SINCE}}'

  const giteaRepository = new GiteaRepository(token, undefined, workingDirectory)
  const releaseNotesBuilder = new ReleaseNotesBuilder(
    null, // baseUrl
    giteaRepository, // token
    workingDirectory, // repoPath
    owner, // user
    repo, // repo
    'v0.5.0', // fromTag
    'master', // toTag
    true, // includeOpen
    false, // failOnError
    false, // ignorePrePrelease
    false, // enable to fetch via commits
    false, // enable to fetch reviewers
    true, // enable to fetch tag release information
    false, // enable to fetch reviews
    'PR', // mode
    false, // enable exportCache
    false, // enable exportOnly
    null, // path to the cache
    configuration // configuration
  )

  const changeLog = await releaseNotesBuilder.build()
  console.log(changeLog)
  expect(changeLog).toStrictEqual(`v0.5.0-2020-09-17T16:34:40.000Z
master-2020-09-21T19:30:21.000Z
4`)
})
