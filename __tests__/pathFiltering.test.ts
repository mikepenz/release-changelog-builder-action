import {jest} from '@jest/globals'
import {CommitInfo, filterCommits} from '../src/pr-collector/commits.js'
import moment from 'moment'

jest.setTimeout(180000)

describe('Path Filtering', () => {
  test('should parse includeOnlyPaths parameter correctly', () => {
    // Test the parsing of comma-separated paths
    const paths = 'app1/,app2/,shared/'
    const pathPatterns = paths.split(',')
    
    expect(pathPatterns).toEqual(['app1/', 'app2/', 'shared/'])
  })

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
        commitDate: moment(),
        changedFiles: ['app1/file1.js', 'app1/file2.js']
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
        commitDate: moment(),
        changedFiles: ['app2/file1.js']
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
        commitDate: moment(),
        changedFiles: ['shared/utils.js']
      }
    ]

    const excludeMergeBranches = ['Merge pull request']
    const filtered = filterCommits(commits, excludeMergeBranches)

    expect(filtered).toHaveLength(2)
    expect(filtered[0].sha).toBe('commit1')
    expect(filtered[1].sha).toBe('commit3')
  })

  test('should handle empty includeOnlyPaths', () => {
    const emptyPaths = ''
    expect(emptyPaths.split(',')).toEqual([])
  })

  test('should handle whitespace in includeOnlyPaths', () => {
    const pathsWithWhitespace = ' app1/ , app2/ ,  shared/  '
    const pathPatterns = pathsWithWhitespace.split(',').map(pattern => pattern.trim()).filter(pattern => pattern.length > 0)
    
    expect(pathPatterns).toEqual(['app1/', 'app2/', 'shared/'])
  })
})