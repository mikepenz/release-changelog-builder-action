import {buildChangelog} from '../src/transform'
import {PullRequestInfo} from '../src/pullRequests'
import moment from 'moment'
import {Configuration, DefaultConfiguration} from '../src/configuration'
import {DefaultDiffInfo} from '../src/commits'

jest.setTimeout(180000)

const configuration = Object.assign({}, DefaultConfiguration)
configuration.pr_template = '${{TITLE_ONLY}} - ${{TICKET}}'
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
    title: 'CRIC-1233: This is a PR 1 title message',
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
    title: 'CRIC-1235 This is a PR 3 title message',
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
    title: 'Not fou CRIC-1234 nd label',
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
  configuration.custom_placeholders = [
    {
      "name": "TITLE_ONLY",
      "source": "TITLE",
      "transformer": {
        "pattern": "(CRIC-\\d{4}:{0,1} )?([\\S\\s]*)",
        "target": "$2"
      }
    },
    {
      "name": "TICKET",
      "source": "TITLE",
      "transformer": {
        "pattern": "[\\S\\s]*?(CRIC-\\d{4})[\\S\\s]*",
        "target": "[$1](https://jira.finods.com/browse/$1)"
      }
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