import {jest} from '@jest/globals'
import {CommitInfo, filterCommits} from '../src/pr-collector/commits.js'
import moment from 'moment'

jest.setTimeout(180000)

describe('Path Filtering', () => {
  test('should filter commits by merge branches (existing functionality)', () => {
    const commits: CommitInfo[] = [
      {
        sha: 'commit1',
        summary: 'feat: add new feature',
        message: 'feat: add new feature\n\nDetailed description',
        author: 'user1',
        authorName: 'User One',
        authorDate: moment(),
        committer: 'user1',
        committerName: 'User One',
        commitDate: moment()
      },
      {
        sha: 'commit2',
        summary: 'Merge pull request #123 from feature-branch',
        message: 'Merge pull request #123 from feature-branch',
        author: 'user2',
        authorName: 'User Two',
        authorDate: moment(),
        committer: 'user2',
        committerName: 'User Two',
        commitDate: moment()
      },
      {
        sha: 'commit3',
        summary: 'fix: bug fix',
        message: 'fix: bug fix',
        author: 'user3',
        authorName: 'User Three',
        authorDate: moment(),
        committer: 'user3',
        committerName: 'User Three',
        commitDate: moment()
      }
    ]

    const excludeMergeBranches = ['Merge pull request']
    const filtered = filterCommits(commits, excludeMergeBranches)

    expect(filtered).toHaveLength(2)
    expect(filtered[0].sha).toBe('commit1')
    expect(filtered[1].sha).toBe('commit3')
  })
})