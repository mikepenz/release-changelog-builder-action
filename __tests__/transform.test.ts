import {buildChangelog} from '../src/transform'
import {PullRequestInfo} from '../src/pullRequests'
import moment from 'moment'
import {DefaultConfiguration} from '../src/configuration'
import {DefaultDiffInfo} from '../src/commits'

jest.setTimeout(180000)

const configuration = Object.assign({}, DefaultConfiguration)
configuration.categories = [
  {
    title: '## 🚀 Features',
    labels: ['[Feature]']
  },
  {
    title: '## 🐛 Fixes',
    labels: ['[Bug]', '[Issue]']
  },
  {
    title: '## 🧪 Tests',
    labels: ['[Test]']
  },
  {
    title: '## 🧪 Others',
    labels: ['[Other]']
  }
]

// list of PRs without labels assigned (extract from title)
const mergedPullRequests: PullRequestInfo[] = []
mergedPullRequests.push(
  {
    number: 1,
    title: '   [Feature][AB-1234] - this is a PR 1 title messag.   e.    ',
    htmlURL: '',
    baseBranch: '',
    createdAt: moment(),
    mergedAt: moment(),
    mergeCommitSha: 'sha1',
    author: 'Mike',
    repoName: 'test-repo',
    labels: new Set<string>(),
    milestone: '',
    body: 'no magic body1 for this matter',
    assignees: [],
    requestedReviewers: [],
    approvedReviewers: [],
    status: 'merged'
  },
  {
    number: 2,
    title: '[Issue][AB-4321] - this is a PR 2 title message',
    htmlURL: '',
    baseBranch: '',
    createdAt: moment(),
    mergedAt: moment(),
    mergeCommitSha: 'sha1',
    author: 'Mike',
    repoName: 'test-repo',
    labels: new Set<string>(),
    milestone: '',
    body: 'no magic body2 for this matter',
    assignees: [],
    requestedReviewers: [],
    approvedReviewers: [],
    status: 'merged'
  },
  {
    number: 3,
    title: '[Issue][Feature][AB-1234321] - this is a PR 3 title message',
    htmlURL: '',
    baseBranch: '',
    createdAt: moment(),
    mergedAt: moment(),
    mergeCommitSha: 'sha1',
    author: 'Mike',
    repoName: 'test-repo',
    labels: new Set<string>(),
    milestone: '',
    body: 'no magic body3 for this matter',
    assignees: [],
    requestedReviewers: [],
    approvedReviewers: [],
    status: 'merged'
  },
  {
    number: 4,
    title: '[AB-404] - not found label',
    htmlURL: '',
    baseBranch: '',
    createdAt: moment(),
    mergedAt: moment(),
    mergeCommitSha: 'sha1',
    author: 'Mike',
    repoName: 'test-repo',
    labels: new Set<string>(),
    milestone: '',
    body: 'no magic body4 for this matter',
    assignees: [],
    requestedReviewers: [],
    approvedReviewers: [],
    status: 'merged'
  }
)

const pullRequestWithLabelInBody: PullRequestInfo = {
  number: 5,
  title: 'label in body',
  htmlURL: '',
  baseBranch: '',
  createdAt: moment(),
  mergedAt: moment(),
  mergeCommitSha: 'sha1',
  author: 'Mike',
  repoName: 'test-repo',
  labels: new Set<string>(),
  milestone: '',
  body: '[Issue][Feature][AB-1234321] - no magic body for this matter',
  assignees: [],
  requestedReviewers: [],
  approvedReviewers: [],
  status: 'merged'
}

it('Strip whitespaces', async () => {
  const customConfig = Object.assign({}, configuration)
  customConfig.custom_placeholders = [
    {
      name: 'STRIPPED_TITLE',
      source: 'TITLE',
      transformer: {
        pattern: '[\\S\\s]*?(([\\S]+[\\s]*)*[\\S]+)[\\S\\s]*',
        target: '$1'
      }
    }
  ]
  customConfig.template ='${{UNCATEGORIZED}}'
  customConfig.pr_template = '"${{STRIPPED_TITLE}}" vs ${{TITLE}}'

  const resultChangelog = buildChangelog(DefaultDiffInfo, mergedPullRequests, {
    owner: 'mikepenz',
    repo: 'test-repo',
    fromTag: {name: '1.0.0'},
    toTag: {name: '2.0.0'},
    includeOpen: false,
    failOnError: false,
    fetchReviewers: false,
    fetchReleaseInformation: false,
    commitMode: false,
    configuration: customConfig
  })

  expect(resultChangelog).toStrictEqual(
    ``
  )
})
