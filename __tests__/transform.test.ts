import {buildChangelog} from '../src/transform'
import {PullRequestInfo} from '../src/pullRequests'
import moment from 'moment'
import {Configuration, DefaultConfiguration} from '../src/configuration'
import {DefaultDiffInfo} from '../src/commits'

jest.setTimeout(180000)

const configuration = Object.assign({}, DefaultConfiguration)
configuration.pr_template = '${{TITLE}}'
configuration.categories = [
  {
    title: '## 🚀 Test',
    labels: ['test']
  }
]

// list of PRs without labels assigned (extract from title)
const mergedPullRequests: PullRequestInfo[] = []
mergedPullRequests.push(
  {
    number: 1,
    title: 'This is a PR 1 title message CRIC-1234',
    htmlURL: '',
    baseBranch: '',
    createdAt: moment(),
    mergedAt: moment(),
    mergeCommitSha: 'sha1',
    author: 'Mike',
    repoName: 'test-repo',
    labels: new Set<string>().add("test"),
    milestone: '',
    body: 'no magic body1 for this matter',
    assignees: [],
    requestedReviewers: [],
    approvedReviewers: [],
    status: 'merged'
  },
  {
    number: 2,
    title: 'This is a PR 2 title message',
    htmlURL: '',
    baseBranch: '',
    createdAt: moment(),
    mergedAt: moment(),
    mergeCommitSha: 'sha1',
    author: 'Mike',
    repoName: 'test-repo',
    labels: new Set<string>().add("test"),
    milestone: '',
    body: 'no magic body2 for this matter',
    assignees: [],
    requestedReviewers: [],
    approvedReviewers: [],
    status: 'merged'
  },
  {
    number: 3,
    title: 'This is a PR 3 title message',
    htmlURL: '',
    baseBranch: '',
    createdAt: moment(),
    mergedAt: moment(),
    mergeCommitSha: 'sha1',
    author: 'Mike',
    repoName: 'test-repo',
    labels: new Set<string>().add("test"),
    milestone: '',
    body: 'no magic body3 for this matter',
    assignees: [],
    requestedReviewers: [],
    approvedReviewers: [],
    status: 'merged'
  },
  {
    number: 4,
    title: 'Not found label',
    htmlURL: '',
    baseBranch: '',
    createdAt: moment(),
    mergedAt: moment(),
    mergeCommitSha: 'sha1',
    author: 'Mike',
    repoName: 'test-repo',
    labels: new Set<string>().add("test"),
    milestone: '',
    body: 'no magic body4 for this matter',
    assignees: [],
    requestedReviewers: [],
    approvedReviewers: [],
    status: 'merged'
  }
)


it('Transform', async () => {
  configuration.transformers = [
    {
      "pattern": "(CRIC-\\d{4})[:,] ([a-zA-Z0-9 _\\s]*)",
      "target": "[$1](https://jira.finods.com/browse/$1) $2"
    },
    {
      "pattern": "(CRIC-\\d{4}) ([a-zA-Z0-9 _\\s]*)",
      "target": "[$1](https://jira.finods.com/browse/$1) $2"
    },
    {
      "pattern": "(CRIC-\\d{4}$)",
      "target": "[$1](https://jira.finods.com/browse/$1)"
    }
  ]

  let prs = Array.from(mergedPullRequests)
  const resultChangelog = buildChangelog(DefaultDiffInfo, prs, {
    owner: 'mikepenz',
    repo: 'test-repo',
    fromTag: {name: '1.0.0'},
    toTag: {name: '2.0.0'},
    includeOpen: false,
    failOnError: false,
    fetchReviewers: false,
    fetchReleaseInformation: false,
    commitMode: false,
    configuration
  })

  expect(resultChangelog).toStrictEqual(
    ``
  )
})