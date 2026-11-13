import {PullRequest} from 'gitea-js'
import {DefaultConfiguration} from '../src/configuration.js'
import {Options, pullData} from '../src/pr-collector/prCollector.js'
import {GiteaRepository} from '../src/repositories/GiteaRepository.js'
import {clear} from '../src/transform.js'
import {beforeEach, describe, expect, test, vi} from 'vitest'

vi.mock('../src/pr-collector/gitHelper.js', () => ({
  createCommandManager: vi.fn(async () => ({
    getDiffStats: async () => ({changedFiles: 2, additions: 2, deletions: 0, changes: 2}),
    getCommitsBetween: async () => ({
      count: 2,
      commits: [
        {
          sha: 'a'.repeat(40),
          subject: 'Merge pull request #1',
          message: 'Merge pull request #1',
          author: 'octocat',
          authorName: 'The Octocat',
          authorDate: '2024-01-01T00:00:00Z'
        },
        {
          sha: 'b'.repeat(40),
          subject: 'Merge pull request #2',
          message: 'Merge pull request #2',
          author: 'octocat',
          authorName: 'The Octocat',
          authorDate: '2024-01-03T00:00:00Z'
        }
      ]
    })
  }))
}))

clear()

const pullRequest = (number: number, mergeCommitSha: string, base: string, head: string): PullRequest => ({
  number,
  title: `PR ${number}`,
  html_url: `https://gitea.com/mikepenz/sip/pulls/${number}`,
  base: {ref: base, repo: {default_branch: 'main', full_name: 'mikepenz/sip'}},
  head: {ref: head},
  merge_base: 'c'.repeat(40),
  merge_commit_sha: mergeCommitSha,
  merged_at: '2024-01-02T00:00:00Z',
  closed_at: '2024-01-02T00:00:00Z',
  created_at: '2024-01-01T12:00:00Z',
  user: {login: 'octocat', full_name: 'The Octocat'},
  labels: [],
  assignees: [],
  requested_reviewers: []
})

const giteaRepository = (): GiteaRepository => {
  const repository = new GiteaRepository('', undefined, '.')
  const repoListPullRequests = vi.fn(async (owner: string, repo: string, query: {state: string; page: number}) => ({
    error: null,
    data:
      query.state === 'closed' && query.page === 1
        ? [pullRequest(1, 'a'.repeat(40), 'release/1.x', 'fix/backport'), pullRequest(2, 'b'.repeat(40), 'main', 'feature/new')]
        : []
  }))
  Object.assign(repository, {api: {repos: {repoListPullRequests}}})
  return repository
}

const options = (baseBranches: string[]): Options => ({
  owner: 'mikepenz',
  repo: 'sip',
  fromTag: {name: 'v1.0.0'},
  toTag: {name: 'v1.1.0'},
  includeOpen: false,
  failOnError: false,
  fetchViaCommits: false,
  fetchReviewers: false,
  fetchReleaseInformation: false,
  fetchReviews: false,
  mode: 'PR',
  configuration: {...DefaultConfiguration, base_branches: baseBranches}
})

describe('Gitea pull request branches', () => {
  beforeEach(() => {
    GiteaRepository.pulls = {closed: [], open: []}
  })

  test('maps the source and target branch of the pull request', async () => {
    const prs = await giteaRepository().getForCommitHash('mikepenz', 'sip', 'a'.repeat(40), 200)

    expect(prs).toHaveLength(1)
    expect(prs[0].baseBranch).toStrictEqual('release/1.x')
    expect(prs[0].branch).toStrictEqual('fix/backport')
  })

  test('`base_branches` filters on the target branch of the pull request', async () => {
    const data = await pullData(giteaRepository(), options(['release/.*']))

    expect(data?.mergedPullRequests.map(pr => pr.number)).toStrictEqual([1])
  })
})
