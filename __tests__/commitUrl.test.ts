import moment from 'moment'
import {Octokit} from '@octokit/rest'
import {buildChangelog, clear} from '../src/transform.js'
import {DefaultConfiguration} from '../src/configuration.js'
import {CommitInfo, convertCommitsToPrs, DiffInfo, DefaultDiffInfo} from '../src/pr-collector/commits.js'
import {Options} from '../src/pr-collector/prCollector.js'
import {GithubRepository} from '../src/repositories/GithubRepository.js'
import {GiteaRepository} from '../src/repositories/GiteaRepository.js'
import {OfflineRepository} from '../src/repositories/OfflineRepository.js'
import {describe, expect, test, vi} from 'vitest'

vi.mock('../src/pr-collector/gitHelper.js', () => ({
  createCommandManager: vi.fn(async () => ({
    getDiffStats: async () => ({changedFiles: 1, additions: 1, deletions: 0, changes: 1}),
    getCommitsBetween: async () => ({
      count: 1,
      commits: [
        {
          sha: 'a'.repeat(40),
          subject: 'feat: local commit',
          message: 'feat: local commit',
          author: 'octocat',
          authorName: 'The Octocat',
          authorDate: '2024-01-01T00:00:00Z'
        }
      ]
    })
  }))
}))

clear()

const commit = (sha: string, htmlURL?: string): CommitInfo => ({
  sha,
  htmlURL,
  summary: `feat: commit ${sha}`,
  message: `feat: commit ${sha}`,
  author: 'octocat',
  authorName: 'The Octocat',
  authorDate: moment('2024-01-01T00:00:00Z'),
  committer: 'octocat',
  committerName: 'The Octocat',
  commitDate: moment('2024-01-01T00:00:00Z')
})

const options = {
  owner: 'mikepenz',
  repo: 'release-changelog-builder-action',
  fromTag: {name: 'v1.0.0'},
  toTag: {name: 'v1.1.0'},
  configuration: DefaultConfiguration
} as unknown as Options

const diffInfo = (commits: CommitInfo[]): DiffInfo => ({...DefaultDiffInfo, commits: commits.length, commitInfo: commits})

describe('Commit URL', () => {
  test('GitHub commits keep the html_url returned by the compare API', async () => {
    const githubRepository = new GithubRepository('', undefined, '.')
    const compareCommits = vi.fn()
    compareCommits
      .mockResolvedValueOnce({
        data: {
          total_commits: 1,
          files: [],
          commits: [
            {
              sha: 'b'.repeat(40),
              html_url: `https://github.com/mikepenz/release-changelog-builder-action/commit/${'b'.repeat(40)}`,
              author: {login: 'octocat'},
              committer: {login: 'octocat'},
              commit: {
                message: 'feat: remote commit',
                author: {name: 'The Octocat', date: '2024-01-01T00:00:00Z'},
                committer: {date: '2024-01-01T00:00:00Z'}
              }
            }
          ]
        }
      })
      .mockResolvedValueOnce({data: {total_commits: 0, files: [], commits: []}})
    ;(githubRepository as unknown as {octokit: Octokit}).octokit = {repos: {compareCommits}} as unknown as Octokit

    const diff = await githubRepository.getDiffRemote('mikepenz', 'release-changelog-builder-action', 'v1.0.0', 'v1.1.0')

    expect(diff.commitInfo).toHaveLength(1)
    expect(diff.commitInfo[0].htmlURL).toStrictEqual(
      `https://github.com/mikepenz/release-changelog-builder-action/commit/${'b'.repeat(40)}`
    )
  })

  test('Gitea commits link to the commit on the instance', async () => {
    const giteaRepository = new GiteaRepository('', undefined, '.')

    const diff = await giteaRepository.getDiffRemote('mikepenz', 'release-changelog-builder-action', 'v1.0.0', 'v1.1.0')

    expect(diff.commitInfo).toHaveLength(1)
    expect(diff.commitInfo[0].htmlURL).toStrictEqual(`https://gitea.com/mikepenz/release-changelog-builder-action/commit/${'a'.repeat(40)}`)
  })

  test('Offline commits have no url', async () => {
    const offlineRepository = new OfflineRepository('.')

    const diff = await offlineRepository.getDiffRemote('mikepenz', 'release-changelog-builder-action', 'v1.0.0', 'v1.1.0')
    const [, prs] = convertCommitsToPrs(options, diff)

    expect(prs).toHaveLength(1)
    expect(prs[0].htmlURL).toStrictEqual('')
  })

  test('Commits converted to pull requests expose their url via the `URL` placeholder', async () => {
    const commits = [commit('1111111', 'https://github.com/mikepenz/release-changelog-builder-action/commit/1111111'), commit('2222222')]
    const [info, prs] = convertCommitsToPrs(options, diffInfo(commits))

    expect(prs.map(pr => pr.htmlURL)).toStrictEqual(['https://github.com/mikepenz/release-changelog-builder-action/commit/1111111', ''])

    const configuration = Object.assign({}, DefaultConfiguration)
    configuration.categories = [{title: '## Changes', labels: []}]
    configuration.commit_template = '- #{{TITLE}} (#{{URL}})'

    const changelog = buildChangelog(info, prs, {
      owner: 'mikepenz',
      repo: 'release-changelog-builder-action',
      fromTag: {name: 'v1.0.0'},
      toTag: {name: 'v1.1.0'},
      includeOpen: false,
      failOnError: false,
      fetchReviewers: false,
      fetchReleaseInformation: false,
      fetchReviews: false,
      mode: 'COMMIT',
      configuration,
      repositoryUtils: new GithubRepository('', undefined, '.')
    })

    expect(changelog).toStrictEqual(
      `## Changes\n\n- feat: commit 1111111 (https://github.com/mikepenz/release-changelog-builder-action/commit/1111111)\n- feat: commit 2222222 ()\n\n`
    )
  })
})
