import {describe, expect, test, vi} from 'vitest'
import {createCommandManager} from '../src/pr-collector/gitHelper.js'

const F = '\x1f' // unit separator (field delimiter)
const R = '\x00' // null byte (record delimiter)

/**
 * Simulates the broken parsing that existed before the fix.
 * This is the old logic: split on '\n', then split each line on '|'.
 * Multi-line commit bodies produce extra lines that yield undefined fields.
 */
function parseLegacy(stdout: string) {
  const lines = stdout.trim().split('\n').filter((line: string) => line.trim() !== '')
  return lines.map((line: string) => {
    const [sha, authorName, authorEmail, authorDate, subject, body] = line.split('|')
    return {sha, subject, message: body, author: authorEmail, authorName, authorDate}
  })
}

/**
 * Raw git log output as produced by the ORIGINAL format: git log --pretty="format:%H|%an|%ae|%aI|%s|%b"
 * This triggered the bug reported in #1552. The merge commit for PR #57 has a multi-line body
 * with Reviewed-on / Reviewed-by lines that break the newline-based parser.
 */
const RAW_GIT_LOG_WITH_MULTILINE_BODY = [
  "4a8857bd358972a5a2396d552ee118299fee8cf9|philipp|philipp@example.com|2026-04-08T18:46:15+00:00|Merge branch 'main' into bugfix/image_rotation|",
  "7fc5c50cdd345ca03fc7f17e18a7a4900fc04c7c|philipp|philipp@example.com|2026-04-08T18:28:23+00:00|Merge pull request 'Major CSS / JS overhaul' (#57) from map into main|Reviewed-on: https://example.com/pulls/57",
  'Reviewed-by: chosen <chosen@example.com>',
  '',
  'ffa3f0034d2028024f2175f95bb5507e672418e1|philipp|philipp@example.com|2026-04-08T20:06:18+02:00|Fix image loading|',
  '0483d05995b12df27d95ddd2f753a6d52b8d96d2|philipp|philipp@example.com|2026-04-08T19:59:26+02:00|Fix passive touch events|'
].join('\n')

/**
 * The same commits as produced by the fixed format using %x00 (record sep) and %x1f (field sep):
 * git log --pretty="format:%x00%H%x1f%an%x1f%ae%x1f%aI%x1f%s%x1f%b"
 */
function buildFixedGitLog() {
  return [
    `${R}4a8857bd358972a5a2396d552ee118299fee8cf9${F}philipp${F}philipp@example.com${F}2026-04-08T18:46:15+00:00${F}Merge branch 'main' into bugfix/image_rotation${F}`,
    `${R}7fc5c50cdd345ca03fc7f17e18a7a4900fc04c7c${F}philipp${F}philipp@example.com${F}2026-04-08T18:28:23+00:00${F}Merge pull request 'Major CSS / JS overhaul' (#57) from map into main${F}Reviewed-on: https://example.com/pulls/57\nReviewed-by: chosen <chosen@example.com>\n`,
    `${R}ffa3f0034d2028024f2175f95bb5507e672418e1${F}philipp${F}philipp@example.com${F}2026-04-08T20:06:18+02:00${F}Fix image loading${F}`,
    `${R}0483d05995b12df27d95ddd2f753a6d52b8d96d2${F}philipp${F}philipp@example.com${F}2026-04-08T19:59:26+02:00${F}Fix passive touch events${F}`
  ].join('')
}

describe('getCommitsBetween', () => {
  test('legacy parsing crashes on multi-line commit bodies (reproduces #1552)', () => {
    // Prove the old parsing logic is broken with multi-line bodies
    const commits = parseLegacy(RAW_GIT_LOG_WITH_MULTILINE_BODY)

    // Old parser creates 5 entries instead of 4 (the "Reviewed-by:" line becomes a bogus commit)
    expect(commits.length).toBe(5)

    // The "Reviewed-by:" continuation line produces a commit with undefined subject
    const bogusCommit = commits[2]
    expect(bogusCommit.sha).toBe('Reviewed-by: chosen <chosen@example.com>')
    expect(bogusCommit.subject).toBeUndefined()

    // This is the exact crash from the issue: commit.subject.split('\n') throws TypeError
    // @ts-expect-error Intentionally calling .split() on undefined to reproduce the historical crash
    expect(() => bogusCommit.subject.split('\n')).toThrow(TypeError)
  })

  test('fixed parsing handles multi-line commit bodies and preserves their content', async () => {
    const gitHelper = await createCommandManager('.')

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.spyOn(gitHelper as any, 'execGit').mockResolvedValue({
      stdout: buildFixedGitLog(),
      exitCode: 0
    })

    const result = await gitHelper.getCommitsBetween('tag1', 'tag2')

    // Must produce exactly 4 commits — no bogus entries from body continuation lines
    expect(result.count).toBe(4)

    // Every commit must have a defined subject — the downstream .split('\n') must not crash
    for (const commit of result.commits) {
      expect(commit.sha).toBeDefined()
      expect(commit.subject).toBeDefined()
      expect(() => commit.subject.split('\n')).not.toThrow()
    }

    // Verify commit fields
    expect(result.commits[0].sha).toBe('4a8857bd358972a5a2396d552ee118299fee8cf9')
    expect(result.commits[0].subject).toBe("Merge branch 'main' into bugfix/image_rotation")
    expect(result.commits[0].authorName).toBe('philipp')
    expect(result.commits[0].message).toBe('')

    expect(result.commits[1].sha).toBe('7fc5c50cdd345ca03fc7f17e18a7a4900fc04c7c')
    expect(result.commits[1].subject).toBe("Merge pull request 'Major CSS / JS overhaul' (#57) from map into main")
    // Multi-line body must be fully preserved
    expect(result.commits[1].message).toBe(
      'Reviewed-on: https://example.com/pulls/57\nReviewed-by: chosen <chosen@example.com>'
    )

    expect(result.commits[2].sha).toBe('ffa3f0034d2028024f2175f95bb5507e672418e1')
    expect(result.commits[2].subject).toBe('Fix image loading')

    expect(result.commits[3].sha).toBe('0483d05995b12df27d95ddd2f753a6d52b8d96d2')
    expect(result.commits[3].subject).toBe('Fix passive touch events')
  })

  test('should handle fields containing pipe characters', async () => {
    // Author name and subject both contain pipe characters — old '|' delimiter would break these
    const gitLog = `${R}abc123${F}John | Doe${F}john@example.com${F}2026-04-08T18:00:00+00:00${F}Fix | handle edge case${F}body text`

    const gitHelper = await createCommandManager('.')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.spyOn(gitHelper as any, 'execGit').mockResolvedValue({
      stdout: gitLog,
      exitCode: 0
    })

    const result = await gitHelper.getCommitsBetween('tag1', 'tag2')

    expect(result.count).toBe(1)
    expect(result.commits[0].authorName).toBe('John | Doe')
    expect(result.commits[0].subject).toBe('Fix | handle edge case')
    expect(result.commits[0].message).toBe('body text')
  })

  test('should handle empty git log output', async () => {
    const gitHelper = await createCommandManager('.')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.spyOn(gitHelper as any, 'execGit').mockResolvedValue({
      stdout: '',
      exitCode: 0
    })

    const result = await gitHelper.getCommitsBetween('tag1', 'tag2')
    expect(result.count).toBe(0)
    expect(result.commits).toEqual([])
  })
})
