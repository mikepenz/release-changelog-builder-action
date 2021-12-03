import {resolveConfiguration} from '../src/utils'
import {ReleaseNotesBuilder} from '../src/releaseNotesBuilder'
import moment from 'moment'
import { DefaultConfiguration, Configuration } from '../src/configuration';
import { PullRequestInfo } from '../src/pullRequests';
import { buildChangelog } from '../src/transform';

jest.setTimeout(180000)

const configuration = Object.assign({}, DefaultConfiguration)
configuration.categories = [
  {
    "title": "## 🚀 New Features",
    "labels": ["feat"]
  },
  {
    "title": "## 🐛 Fixes",
    "labels": ["fix"]
  },
  {
    "title": "## 🧪 Tests",
    "labels": ["test"]
  },
  {
      "title": "## 📦 Dependencies",
      "labels": ["deps"]
  },
  {
    "title": "## 📖 Documentation",
    "labels": ["docs"]
  },
  {
    "title": "## 🧹 Chores",
    "labels": ["chore"]
  }
]

// list of PRs without labels assigned (extract from title)
const mergedPullRequests: PullRequestInfo[] = []
mergedPullRequests.push(
  {
    number: 1,
    title: 'feat: Add new button to menu',
    htmlURL: '',
    baseBranch: '',
    mergedAt: moment(),
    mergeCommitSha: 'sha1',
    author: 'Mike',
    repoName: 'test-repo',
    labels: new Set<string>(),
    milestone: '',
    body: 'no magic body for this matter',
    assignees: [],
    requestedReviewers: []
  },
  {
    number: 2,
    title: 'fix: Remove line causing bug',
    htmlURL: '',
    baseBranch: '',
    mergedAt: moment(),
    mergeCommitSha: 'sha1',
    author: 'Mike',
    repoName: 'test-repo',
    labels: new Set<string>(),
    milestone: '',
    body: 'no magic body for this matter',
    assignees: [],
    requestedReviewers: []
  }
)

it('Extract label from title', async () => {
  configuration.label_extractor = [
    {
      "pattern": "^feat",
      "target": "feat",
      "on_property": "title",
      "method": "match"
    },
    {
      "pattern": "^fix",
      "target": "fix",
      "on_property": "title",
      "method": "match"
    },
  ]

  const resultChangelog = buildChangelog(mergedPullRequests, {
    owner: 'mikepenz',
    repo: 'test-repo',
    fromTag: '1.0.0',
    toTag: '2.0.0',
    failOnError: false,
    commitMode: false,
    configuration
  })

  expect(resultChangelog).toStrictEqual(
    ``
  )
})