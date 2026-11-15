import moment from 'moment'
import {Octokit} from '@octokit/rest'
import * as core from '@actions/core'
import {buildChangelog, clear} from '../src/transform.js'
import {DefaultConfiguration} from '../src/configuration.js'
import {Commits, DefaultDiffInfo} from '../src/pr-collector/commits.js'
import {EMPTY_PULL_REQUEST_INFO, PullRequestInfo, PullRequests} from '../src/pr-collector/pullRequests.js'
import {BaseRepository} from '../src/repositories/BaseRepository.js'
import {GithubRepository} from '../src/repositories/GithubRepository.js'
import {GiteaRepository} from '../src/repositories/GiteaRepository.js'
import {OfflineRepository} from '../src/repositories/OfflineRepository.js'
import {describe, expect, test, vi} from 'vitest'

vi.mock('@actions/core', async importOriginal => ({
  ...(await importOriginal<typeof import('@actions/core')>()),
  warning: vi.fn(),
  setOutput: vi.fn()
}))

clear()

const pr = (number: number, author: string, mergedAt?: string, status: 'open' | 'merged' = 'merged'): PullRequestInfo => ({
  ...EMPTY_PULL_REQUEST_INFO,
  number,
  title: `PR ${number}`,
  htmlURL: `https://github.com/mikepenz/release-changelog-builder-action/pull/${number}`,
  createdAt: moment('2024-01-01T00:00:00Z'),
  mergedAt: mergedAt ? moment(mergedAt) : undefined,
  author,
  labels: [],
  status
})

const pullRequestsFor = (getNewContributors: BaseRepository['getNewContributors']): PullRequests =>
  new PullRequests({getNewContributors} as unknown as BaseRepository, {} as Commits)

describe('New contributors', () => {
  test('GitHub searches for PRs merged before the first merge of each author in this release', async () => {
    const githubRepository = new GithubRepository('', undefined, '.')
    const graphql = vi.fn().mockResolvedValueOnce({a0: {issueCount: 0}, a1: {issueCount: 3}})
    ;(githubRepository as unknown as {octokit: Octokit}).octokit = {graphql} as unknown as Octokit

    const newContributors = await githubRepository.getNewContributors(
      'mikepenz',
      'release-changelog-builder-action',
      new Map([
        ['newbie', moment('2024-02-01T10:00:00Z')],
        ['dependabot[bot]', moment('2024-02-02T10:00:00Z')]
      ])
    )

    expect(newContributors).toStrictEqual(new Set(['newbie']))
    expect(graphql).toHaveBeenCalledTimes(1)
    const [query, variables] = graphql.mock.calls[0]
    expect(query).toContain('query($q0: String!, $q1: String!)')
    expect(query).toContain('a0: search(type: ISSUE, query: $q0, first: 0) { issueCount }')
    expect(query).toContain('a1: search(type: ISSUE, query: $q1, first: 0) { issueCount }')
    expect(variables).toStrictEqual({
      q0: 'repo:mikepenz/release-changelog-builder-action is:pr is:merged author:newbie merged:<2024-02-01T10:00:00.000Z',
      q1: 'repo:mikepenz/release-changelog-builder-action is:pr is:merged author:dependabot[bot] merged:<2024-02-02T10:00:00.000Z'
    })
  })

  test('GitHub batches the searches for many authors', async () => {
    const githubRepository = new GithubRepository('', undefined, '.')
    const graphql = vi.fn(async (_query: string, variables: Record<string, string>) => {
      // report every author as returning contributor, except `author-21`
      return Object.fromEntries(
        Object.entries(variables).map(([key, value]) => [key.replace('q', 'a'), {issueCount: value.includes('author:author-21 ') ? 0 : 1}])
      )
    })
    ;(githubRepository as unknown as {octokit: Octokit}).octokit = {graphql} as unknown as Octokit

    const firstMerges = new Map<string, moment.Moment>()
    for (let i = 0; i < 45; i++) {
      firstMerges.set(`author-${i}`, moment('2024-02-01T10:00:00Z'))
    }
    const newContributors = await githubRepository.getNewContributors('mikepenz', 'release-changelog-builder-action', firstMerges)

    expect(newContributors).toStrictEqual(new Set(['author-21']))
    expect(graphql).toHaveBeenCalledTimes(3)
    expect(graphql.mock.calls.map(call => Object.keys(call[1]).length)).toStrictEqual([20, 20, 5])
  })

  test('Gitea and offline mode report no new contributors', async () => {
    const firstMerges = new Map([['newbie', moment('2024-02-01T10:00:00Z')]])

    expect(await new GiteaRepository('', undefined, '.').getNewContributors('owner', 'repo', firstMerges)).toStrictEqual(new Set())
    expect(await new OfflineRepository('.').getNewContributors('owner', 'repo', firstMerges)).toStrictEqual(new Set())
  })

  test('Marks the PRs of authors without a prior merged PR, using their earliest merge in this release', async () => {
    const getNewContributors = vi.fn(async () => new Set(['newbie']))
    const prs = [
      pr(1, 'newbie', '2024-02-03T10:00:00Z'),
      pr(2, 'regular', '2024-02-02T10:00:00Z'),
      pr(3, 'newbie', '2024-02-01T10:00:00Z'),
      pr(4, 'drafter', undefined, 'open'),
      pr(5, '', '2024-02-01T10:00:00Z')
    ]

    await pullRequestsFor(getNewContributors).markNewContributors('mikepenz', 'release-changelog-builder-action', prs)

    expect(getNewContributors).toHaveBeenCalledTimes(1)
    const firstMerges = (getNewContributors.mock.calls[0] as unknown[])[2] as Map<string, moment.Moment>
    expect(Array.from(firstMerges.keys())).toStrictEqual(['newbie', 'regular'])
    expect(firstMerges.get('newbie')?.toISOString()).toStrictEqual('2024-02-01T10:00:00.000Z')
    expect(firstMerges.get('regular')?.toISOString()).toStrictEqual('2024-02-02T10:00:00.000Z')
    expect(prs.map(p => p.newContributor)).toStrictEqual([true, false, true, undefined, undefined])
  })

  test('Skips the lookup if there are no merged PRs', async () => {
    const getNewContributors = vi.fn(async () => new Set<string>())
    const prs = [pr(1, 'drafter', undefined, 'open')]

    await pullRequestsFor(getNewContributors).markNewContributors('mikepenz', 'release-changelog-builder-action', prs)

    expect(getNewContributors).not.toHaveBeenCalled()
    expect(prs[0].newContributor).toBeUndefined()
  })

  test('A failing lookup only warns and leaves the PRs unmarked', async () => {
    const getNewContributors = vi.fn(async () => {
      throw new Error('search unavailable')
    })
    const prs = [pr(1, 'newbie', '2024-02-01T10:00:00Z')]

    await pullRequestsFor(getNewContributors).markNewContributors('mikepenz', 'release-changelog-builder-action', prs)

    expect(prs[0].newContributor).toBeUndefined()
    expect(core.warning).toHaveBeenCalledWith(expect.stringContaining('search unavailable'))
  })

  test.each([true, false])('Only looks up new contributors while collecting PRs if enabled (%s)', async fetchNewContributors => {
    const commit = {
      sha: 'a'.repeat(40),
      htmlURL: '',
      summary: 'feat: commit',
      message: 'feat: commit',
      author: 'newbie',
      authorName: 'Newbie',
      authorDate: moment('2024-02-01T09:00:00Z'),
      committer: 'newbie',
      committerName: 'Newbie',
      commitDate: moment('2024-02-01T09:00:00Z')
    }
    const commits = {getCommitHistory: async () => ({...DefaultDiffInfo, commits: 1, commitInfo: [commit]})} as unknown as Commits
    const getNewContributors = vi.fn(async () => new Set(['newbie']))
    const repositoryUtils = {
      getForCommitHash: async () => [pr(1, 'newbie', '2024-02-01T10:00:00Z')],
      getNewContributors
    } as unknown as BaseRepository

    const [, prs] = await new PullRequests(repositoryUtils, commits).getMergedPullRequests({
      owner: 'mikepenz',
      repo: 'release-changelog-builder-action',
      fromTag: {name: 'v1.0.0'},
      toTag: {name: 'v1.1.0'},
      includeOpen: false,
      failOnError: false,
      fetchViaCommits: true,
      fetchReviewers: false,
      fetchReleaseInformation: false,
      fetchReviews: false,
      fetchNewContributors,
      mode: 'PR',
      configuration: DefaultConfiguration
    })

    expect(prs).toHaveLength(1)
    expect(getNewContributors).toHaveBeenCalledTimes(fetchNewContributors ? 1 : 0)
    expect(prs[0].newContributor).toStrictEqual(fetchNewContributors ? true : undefined)
  })

  test('Renders the new contributors via the `NEW_CONTRIBUTORS` placeholder', async () => {
    const prs = [
      {...pr(1, 'newbie', '2024-02-01T10:00:00Z'), newContributor: true},
      {...pr(2, 'regular', '2024-02-02T10:00:00Z'), newContributor: false},
      {...pr(3, 'newbie', '2024-02-03T10:00:00Z'), newContributor: true},
      {...pr(4, 'another', '2024-02-04T10:00:00Z'), newContributor: true}
    ]

    const configuration = Object.assign({}, DefaultConfiguration)
    configuration.template = 'Contributors: #{{CONTRIBUTORS}}\nNew contributors: #{{NEW_CONTRIBUTORS}}'

    const changelog = buildChangelog(DefaultDiffInfo, prs, {
      owner: 'mikepenz',
      repo: 'release-changelog-builder-action',
      fromTag: {name: 'v1.0.0'},
      toTag: {name: 'v1.1.0'},
      includeOpen: false,
      failOnError: false,
      fetchReviewers: false,
      fetchReleaseInformation: false,
      fetchReviews: false,
      fetchNewContributors: true,
      mode: 'PR',
      configuration,
      repositoryUtils: new GithubRepository('', undefined, '.')
    })

    expect(changelog).toStrictEqual('Contributors: @newbie, @regular, @another\nNew contributors: @newbie, @another')
    expect(core.setOutput).toHaveBeenCalledWith('new_contributors', '@newbie,@another')
  })

  test('Renders an empty `NEW_CONTRIBUTORS` placeholder if the lookup was not enabled', async () => {
    const configuration = Object.assign({}, DefaultConfiguration)
    configuration.template = 'New contributors: #{{NEW_CONTRIBUTORS}}'

    const changelog = buildChangelog(DefaultDiffInfo, [pr(1, 'newbie', '2024-02-01T10:00:00Z')], {
      owner: 'mikepenz',
      repo: 'release-changelog-builder-action',
      fromTag: {name: 'v1.0.0'},
      toTag: {name: 'v1.1.0'},
      includeOpen: false,
      failOnError: false,
      fetchReviewers: false,
      fetchReleaseInformation: false,
      fetchReviews: false,
      fetchNewContributors: false,
      mode: 'PR',
      configuration,
      repositoryUtils: new GithubRepository('', undefined, '.')
    })

    expect(changelog).toStrictEqual('New contributors: ')
  })
})
