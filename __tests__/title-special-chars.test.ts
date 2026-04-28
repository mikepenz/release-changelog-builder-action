import {buildChangelog, clear} from '../src/transform.js'
import moment from 'moment'
import {Configuration, DefaultConfiguration} from '../src/configuration.js'
import {PullRequestInfo} from '../src/pr-collector/pullRequests.js'
import {DefaultDiffInfo} from '../src/pr-collector/commits.js'
import {GithubRepository} from '../src/repositories/GithubRepository.js'
import {expect, test} from 'vitest'

clear()

const repositoryUtils = new GithubRepository(undefined, undefined, '.')

const buildChangelogTest = (config: Configuration, prs: PullRequestInfo[]): string => {
  return buildChangelog(DefaultDiffInfo, prs, {
    owner: 'mikepenz',
    repo: 'test-repo',
    fromTag: {name: '1.0.0'},
    toTag: {name: '2.0.0'},
    includeOpen: false,
    failOnError: false,
    fetchReviewers: false,
    fetchReleaseInformation: false,
    fetchReviews: false,
    mode: 'PR',
    configuration: config,
    repositoryUtils
  })
}

const mkPr = (number: number, title: string, label: string): PullRequestInfo => ({
  number,
  title,
  htmlURL: '',
  baseBranch: '',
  createdAt: moment(),
  mergedAt: moment(),
  mergeCommitSha: `sha${number}`,
  author: 'octocat',
  authorName: 'octocat',
  repoName: 'test-repo',
  labels: [label],
  milestone: '',
  body: '',
  assignees: [],
  requestedReviewers: [],
  approvedReviewers: [],
  status: 'merged'
})

const config: Configuration = Object.assign({}, DefaultConfiguration)
config.categories = [
  {title: '## Features', labels: ['feature']},
  {title: '## Bugs', labels: ['bug']},
  {title: '## Tests', labels: ['test']}
]
config.template = '#{{CHANGELOG}}'
config.pr_template = '* #{{TITLE}} by @#{{AUTHOR}} in ##{{NUMBER}}'

test('PR titles with backtick code spans render verbatim', () => {
  const prs = [
    mkPr(269, 'Fix unit test for `String.Format()`', 'test'),
    mkPr(270, 'Improvements in `String` class', 'feature'),
    mkPr(271, 'Rewrote `Guid.CompareTo`', 'bug')
  ]
  const out = buildChangelogTest(config, prs)
  expect(out).toContain('* Fix unit test for `String.Format()` by @octocat in #269')
  expect(out).toContain('* Improvements in `String` class by @octocat in #270')
  expect(out).toContain('* Rewrote `Guid.CompareTo` by @octocat in #271')
})

test('PR titles with $-escape sequences render verbatim', () => {
  const prs = [
    mkPr(101, 'weird $& and $1 and $$ chars', 'bug'),
    mkPr(102, "edge $` and $' and $0 and $<name>", 'bug')
  ]
  const out = buildChangelogTest(config, prs)
  expect(out).toContain('* weird $& and $1 and $$ chars by @octocat in #101')
  expect(out).toContain("* edge $` and $' and $0 and $<name> by @octocat in #102")
})
