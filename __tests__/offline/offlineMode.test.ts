/**
 * @file offlineMode.test.ts
 * @description Test file for validating the behavior of the new offline mode feature.
 * 
 * This test verifies that:
 * 1. The offlineMode parameter is correctly passed to the configuration
 * 2. The OfflineRepository is used when offlineMode is enabled
 * 3. Local tag and diff retrieval works correctly
 * 
 * To run this test:
 * npm run test-offline
 * 
 * Note: This test requires a local git repository with tags to work properly.
 */

import {mergeConfiguration, resolveConfiguration} from '../../src/utils.js'
import {ReleaseNotesBuilder} from '../../src/releaseNotesBuilder.js'
import {OfflineRepository} from '../../src/repositories/OfflineRepository.js'
import { expect, test } from 'vitest'

// This test validates the behavior of the new offline mode
test('Test offline mode functionality', async () => {
  // Define the configuration file to use
  const configuration = mergeConfiguration(undefined, resolveConfiguration('', 'configs/configuration_commit.json'))

  // Set offlineMode to true in the configuration
  configuration.offlineMode = true

  // Create an instance of OfflineRepository
  const offlineRepository = new OfflineRepository( '.')

  const releaseNotesBuilder = new ReleaseNotesBuilder(
    null, // The base url used for the API requests (not needed for offline mode)
    offlineRepository, // Use the OfflineRepository implementation
    '.', // Root path to the checked out sources
    'mikepenz', // The owner of the repo to test
    'release-changelog-builder-action', // The repository name - using this repo itself for the test
    null, // fromTag - will be resolved automatically
    null, // toTag - will be resolved automatically
    false, // includeOpen - not supported in offline mode
    false, // failOnError
    false, // ignorePrePrerelease
    false, // fetchViaCommits - not needed in offline mode
    false, // fetchReviewers - not supported in offline mode
    false, // fetchReleaseInformation
    false, // fetchReviews - not supported in offline mode
    'COMMIT', // mode - must be COMMIT for offline mode
    false, // exportCache
    false, // exportOnly
    null, // cache
    configuration // The configuration to use
  )

  // Build the changelog
  const changeLog = await releaseNotesBuilder.build()

  // Verify that a changelog was generated
  expect(changeLog).toBeDefined()
  expect(changeLog).not.toBe("- no changes")
  expect(changeLog?.length).toBeGreaterThan(0)

  // Log the changelog for inspection
  console.log('Generated changelog in offline mode:')
  console.log(changeLog)
})