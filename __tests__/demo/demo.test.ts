import {mergeConfiguration, resolveConfiguration} from '../../src/utils'
import {ReleaseNotesBuilder} from '../../src/releaseNotesBuilder'
import {GithubRepository} from '../../src/repositories/GithubRepository'

jest.setTimeout(180000)

// Define the token to use. Either retrieved from the environment.
// Alternatively provide it as a string right here.
const token = process.env.GITHUB_TOKEN || ''
const githubRepository = new GithubRepository(token, undefined, '.')
it('Test custom changelog builder', async () => {
  // define the configuration file to use.
  // By default, it retrieves a configuration from a json file
  // You can also quickly modify in code.
  const configuration = mergeConfiguration(undefined, resolveConfiguration('', 'configs/configuration.json'))

  // Demo to modify the configuration further in code
  // configuration.pr_template = "#{{TITLE}}"

  const releaseNotesBuilder = new ReleaseNotesBuilder(
    null, // The base url used for the API requests (not needed for normal github)
    githubRepository, // Repository implementation (allows tu test gitea). Keep default for GitHub
    '.', // Root path to the checked out sources. Commonly keep as default
    'mikepenz', // The owner of the repo to test
    'release-changelog-builder-action-playground', // The repository name
    '1.5.0', // `fromTag`  The from tag name or the SHA1 of the from commit
    '2.0.0', // `toTag`    The to tag name or the SHA1 of the to commit
    false, // `includeOpen` Define if you want to include open PRs into the changelog
    false, // `failOnError` Define if the action should fail on errors
    false, // `ignorePrePrerelease` used if no `fromTag` is defined to resolve the prior tag
    false, // `fetchViaCommits`  enable to fetch via commits
    false, // `fetchReviewers`  Enables fetching of reviewers for building the changelog (does additional API requests)
    false, // `fetchReleaseInformation` Enable to fetch release information (does additional API requests)
    false, // `fetchReviews` Enable to fetch reviews of the PRs (does additional API requests)
    'PR', // `mode` Set the mode to use [PR, COMMIT, HYBRID]. PR -> builds changelog using PRs, COMMIT -> using commits, HYBRID -> Uses both
    false, // `exportCache` Exports the fetched information to the cache. Not relevant for this test
    false, // `exportOnly` Enables to only export the fetched information however not build a changelog
    null, // `cache` Path to the cache. Not relevant for this test.
    configuration // The configuration to use for building the changelog
  )

  const changeLog = await releaseNotesBuilder.build()
  console.log(changeLog)
})
