import {buildChangelog} from '../src/transform'
import moment from 'moment'
import {Configuration, DefaultConfiguration} from '../src/configuration'
import {PullRequestInfo} from 'github-pr-collector/lib/pullRequests'
import {DefaultDiffInfo} from 'github-pr-collector/lib/commits'

jest.setTimeout(180000)

const configuration = Object.assign({}, DefaultConfiguration)
configuration.categories = [
  {
    title: '## 🚀 Features',
    labels: ['feat', 'feature']
  },
  {
    title: '## 🐛 Fixes',
    labels: ['fix', 'bug']
  },
  {
    title: '## Chores',
    labels: ['chore']
  },
  {
    title: '## Dependencies',
    labels: ['deps']
  }
]

// list of PRs without labels assigned (extract from title)
const mergedPullRequests: PullRequestInfo[] = []
mergedPullRequests.push(
  {
    number: 1,
    title: '[Feature][AB-1234] - this is a PR 1 title message',
    branch: "feat|fix|chore: some task",
    htmlURL: '',
    baseBranch: '',
    createdAt: moment(),
    mergedAt: moment(),
    mergeCommitSha: 'sha1',
    author: 'Mike',
    repoName: 'test-repo',
    labels: [],
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
    branch: "feat|fix|chore(auth): some auth task",
    htmlURL: '',
    baseBranch: '',
    createdAt: moment(),
    mergedAt: moment(),
    mergeCommitSha: 'sha1',
    author: 'Mike',
    repoName: 'test-repo',
    labels: [],
    milestone: '',
    body: 'no magic body2 for this matter',
    assignees: [],
    requestedReviewers: [],
    approvedReviewers: [],
    status: 'merged'
  }
)

it('Extract label from title, combined regex', async () => {
  configuration.label_extractor = [
    {
      pattern: '^([\\w\\-]+)',
      target: '$1',
      method: 'match',
      on_property: 'branch'
    }
  ]
  expect(buildChangelogTest(configuration, mergedPullRequests)).toStrictEqual(
    ``
  )
})

function buildChangelogTest(config: Configuration, prs: PullRequestInfo[]): string {
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
    commitMode: false,
    configuration: config
  })
}
