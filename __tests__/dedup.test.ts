import {ReleaseNotes} from '../src/releaseNotes'
import {resolveConfiguration} from '../src/utils'
import {Octokit} from '@octokit/rest'
import { buildChangelog } from '../src/transform'
import moment from 'moment'
import { PullRequestInfo } from '../src/pullRequests'
import { DefaultConfiguration } from '../src/configuration'

jest.setTimeout(180000)

// load octokit instance
const octokit = new Octokit({
  auth: `token ${process.env.GITHUB_TOKEN}`
})

// test set of PRs with lables predefined
const pullRequestsWithLabels: PullRequestInfo[] = []
pullRequestsWithLabels.push(
  {
    number: 1,
    title: '[ABC-1234] - this is a PR 1 title message',
    htmlURL: '',
    baseBranch: '',
    createdAt: moment(),
    mergedAt: moment(),
    mergeCommitSha: 'sha1-1',
    author: 'Mike',
    repoName: 'test-repo',
    labels: new Set<string>().add('feature'),
    milestone: '',
    body: 'no magic body for this matter',
    assignees: [],
    requestedReviewers: [],
    approvedReviewers: [],
    status: "merged"
  },
  {
    number: 2,
    title: '[ABC-4321] - this is a PR 2 title message',
    htmlURL: '',
    baseBranch: '',
    createdAt: moment(),
    mergedAt: moment(),
    mergeCommitSha: 'sha1-2',
    author: 'Mike',
    repoName: 'test-repo',
    labels: new Set<string>().add('issue').add('fix'),
    milestone: '',
    body: 'no magic body for this matter',
    assignees: [],
    requestedReviewers: [],
    approvedReviewers: [],
    status: "merged"
  },
  {
    number: 3,
    title: '[ABC-1234] - this is a PR 3 title message',
    htmlURL: '',
    baseBranch: '',
    createdAt: moment(),
    mergedAt: moment().add(1, 'days'),
    mergeCommitSha: 'sha1-3',
    author: 'Mike',
    repoName: 'test-repo',
    labels: new Set<string>().add('issue').add('feature').add('fix'),
    milestone: '',
    body: 'no magic body for this matter',
    assignees: [],
    requestedReviewers: [],
    approvedReviewers: [],
    status: "merged"
  },
  {
    number: 4,
    title: '[AB-404] - not found label',
    htmlURL: '',
    baseBranch: '',
    createdAt: moment(),
    mergedAt: moment(),
    mergeCommitSha: 'sha1-4',
    author: 'Mike',
    repoName: 'test-repo',
    labels: new Set<string>().add(''),
    milestone: '',
    body: 'no magic body for this matter',
    assignees: [],
    requestedReviewers: [],
    approvedReviewers: [],
    status: "merged"
  }
)


it('Deduplicate duplicated PRs', async () => {
  const customConfig = Object.assign({}, DefaultConfiguration)


  const resultChangelog = buildChangelog(pullRequestsWithLabels, {
    owner: 'mikepenz',
    repo: 'test-repo',
    fromTag: '1.0.0',
    toTag: '2.0.0',
    includeOpen: false,
    failOnError: false,
    fetchReviewers: false,
    commitMode: false,
    configuration: customConfig
  })

  expect(resultChangelog).toStrictEqual(
    ``
  )
})



/*
it('Should match ordered ASC', async () => {
  const configuration = resolveConfiguration(
    '',
    'configs_test/configuration_dedup.json'
  )
  const releaseNotes = new ReleaseNotes(octokit, {
    owner: 'mikepenz',
    repo: 'release-changelog-builder-action',
    fromTag: 'v0.3.0',
    toTag: 'v0.5.0',
    includeOpen: false,
    failOnError: false,
    fetchReviewers: false,
    commitMode: false,
    configuration
  })

  const changeLog = await releaseNotes.pull()
  console.log(changeLog)
  expect(changeLog).toStrictEqual(
    `## 🚀 Features\n\n22\n24\n25\n26\n28\n\n## 🐛 Fixes\n\n23\n\n`
  )
})

*/