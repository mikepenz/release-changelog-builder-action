import {buildChangelog} from '../src/transform'
import {PullRequestInfo} from '../src/pullRequests'
import moment from 'moment'
import { DefaultConfiguration, Configuration } from '../src/configuration';

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
  }
]

// list of PRs without labels assigned (extract from title)
const mergedPullRequests: PullRequestInfo[] = []
mergedPullRequests.push(
  {
    number: 1,
    title: '[Feature][AB-1234] - this is a PR 1 title message',
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
    title: '[Issue][AB-4321] - this is a PR 2 title message',
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
    number: 3,
    title: '[Issue][Feature][AB-1234321] - this is a PR 3 title message',
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
    number: 4,
    title: '[AB-404] - not found label',
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

it('Extract label from title, combined regex', async () => {
  configuration.label_extractor = [
    {
      pattern: '.*(\\[Feature\\]|\\[Issue\\]).*',
      target: '$1',
      on_property: 'title'
    }
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
    `## 🚀 Features\n\n- [Feature][AB-1234] - this is a PR 1 title message\n   - PR: #1\n- [Issue][Feature][AB-1234321] - this is a PR 3 title message\n   - PR: #3\n\n## 🐛 Fixes\n\n- [Issue][AB-4321] - this is a PR 2 title message\n   - PR: #2\n\n`
  )
})

it('Extract label from title, split regex', async () => {
  configuration.label_extractor = [
    {
      pattern: '.*(\\[Feature\\]).*',
      target: '$1',
      on_property: 'title'
    },
    {
      pattern: '.*(\\[Issue\\]).*',
      target: '$1',
      on_property: 'title'
    }
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
    `## 🚀 Features\n\n- [Feature][AB-1234] - this is a PR 1 title message\n   - PR: #1\n- [Issue][Feature][AB-1234321] - this is a PR 3 title message\n   - PR: #3\n\n## 🐛 Fixes\n\n- [Issue][AB-4321] - this is a PR 2 title message\n   - PR: #2\n- [Issue][Feature][AB-1234321] - this is a PR 3 title message\n   - PR: #3\n\n`
  )
})

it('Extract label from title, match', async () => {
  configuration.label_extractor = [
    {
      pattern: '\\[Feature\\]',
      on_property: 'title',
      method: 'match'
    },
    {
      pattern: '\\[Issue\\]',
      on_property: 'title',
      method: 'match'
    }
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
    `## 🚀 Features\n\n- [Feature][AB-1234] - this is a PR 1 title message\n   - PR: #1\n- [Issue][Feature][AB-1234321] - this is a PR 3 title message\n   - PR: #3\n\n## 🐛 Fixes\n\n- [Issue][AB-4321] - this is a PR 2 title message\n   - PR: #2\n- [Issue][Feature][AB-1234321] - this is a PR 3 title message\n   - PR: #3\n\n`
  )
})

it('Extract label from title, match multiple', async () => {
  configuration.label_extractor = [
    {
      pattern: '\\[Feature\\]|\\[Issue\\]',
      on_property: 'title',
      method: 'match'
    }
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
    `## 🚀 Features\n\n- [Feature][AB-1234] - this is a PR 1 title message\n   - PR: #1\n- [Issue][Feature][AB-1234321] - this is a PR 3 title message\n   - PR: #3\n\n## 🐛 Fixes\n\n- [Issue][AB-4321] - this is a PR 2 title message\n   - PR: #2\n- [Issue][Feature][AB-1234321] - this is a PR 3 title message\n   - PR: #3\n\n`
  )
})

// test set of PRs with lables predefined
const pullRequestsWithLabels: PullRequestInfo[] = []
pullRequestsWithLabels.push(
  {
    number: 1,
    title: '[ABC-1234] - this is a PR 1 title message',
    htmlURL: '',
    baseBranch: '',
    mergedAt: moment(),
    mergeCommitSha: 'sha1',
    author: 'Mike',
    repoName: 'test-repo',
    labels: new Set<string>().add('feature'),
    milestone: '',
    body: 'no magic body for this matter',
    assignees: [],
    requestedReviewers: []
  },
  {
    number: 2,
    title: '[ABC-4321] - this is a PR 2 title message',
    htmlURL: '',
    baseBranch: '',
    mergedAt: moment(),
    mergeCommitSha: 'sha1',
    author: 'Mike',
    repoName: 'test-repo',
    labels: new Set<string>().add('issue').add('fix'),
    milestone: '',
    body: 'no magic body for this matter',
    assignees: [],
    requestedReviewers: []
  },
  {
    number: 3,
    title: '[ABC-1234] - this is a PR 3 title message',
    htmlURL: '',
    baseBranch: '',
    mergedAt: moment().add(1, 'days'),
    mergeCommitSha: 'sha1',
    author: 'Mike',
    repoName: 'test-repo',
    labels: new Set<string>().add('issue').add('feature').add('fix'),
    milestone: '',
    body: 'no magic body for this matter',
    assignees: [],
    requestedReviewers: []
  },
  {
    number: 4,
    title: '[AB-404] - not found label',
    htmlURL: '',
    baseBranch: '',
    mergedAt: moment(),
    mergeCommitSha: 'sha1',
    author: 'Mike',
    repoName: 'test-repo',
    labels: new Set<string>().add(''),
    milestone: '',
    body: 'no magic body for this matter',
    assignees: [],
    requestedReviewers: []
  }
)

it('Match multiple labels exhaustive for category', async () => {
  const customConfig = Object.assign({}, DefaultConfiguration)
  customConfig.categories = [
    {
      title: '## 🚀 Features and 🐛 Issues',
      labels: ['Feature', 'Issue'],
      exhaustive: true
    },
    {
      title: '## 🚀 Features',
      labels: ['Feature', 'Feature2'],
      exhaustive: true
    },
    {
      title: '## 🐛 Fixes',
      labels: ['Issue', 'Issue2'],
      exhaustive: true
    }
  ]

  const resultChangelog = buildChangelog(pullRequestsWithLabels, {
    owner: 'mikepenz',
    repo: 'test-repo',
    fromTag: '1.0.0',
    toTag: '2.0.0',
    failOnError: false,
    commitMode: false,
    configuration: customConfig
  })

  expect(resultChangelog).toStrictEqual(
    `## 🚀 Features and 🐛 Issues\n\n- [ABC-1234] - this is a PR 3 title message\n   - PR: #3\n\n`
  )
})

it('Deduplicate duplicated PRs', async () => {
  const customConfig = Object.assign({}, DefaultConfiguration)
  customConfig.duplicate_filter = {
    pattern: '\\[ABC-....\\]',
    on_property: 'title',
    method: 'match'
  }

  const resultChangelog = buildChangelog(pullRequestsWithLabels, {
    owner: 'mikepenz',
    repo: 'test-repo',
    fromTag: '1.0.0',
    toTag: '2.0.0',
    failOnError: false,
    commitMode: false,
    configuration: customConfig
  })

  expect(resultChangelog).toStrictEqual(
    `## 🚀 Features\n\n- [ABC-1234] - this is a PR 3 title message\n   - PR: #3\n\n## 🐛 Fixes\n\n- [ABC-1234] - this is a PR 3 title message\n   - PR: #3\n- [ABC-4321] - this is a PR 2 title message\n   - PR: #2\n\n`
  )
})

it('Deduplicate duplicated PRs DESC', async () => {
  const customConfig = Object.assign({}, DefaultConfiguration)
  customConfig.sort = "DESC"
  customConfig.duplicate_filter = {
    pattern: '\\[ABC-....\\]',
    on_property: 'title',
    method: 'match'
  }

  const resultChangelog = buildChangelog(pullRequestsWithLabels, {
    owner: 'mikepenz',
    repo: 'test-repo',
    fromTag: '1.0.0',
    toTag: '2.0.0',
    failOnError: false,
    commitMode: false,
    configuration: customConfig
  })

  expect(resultChangelog).toStrictEqual(
    `## 🚀 Features\n\n- [ABC-1234] - this is a PR 1 title message\n   - PR: #1\n\n## 🐛 Fixes\n\n- [ABC-4321] - this is a PR 2 title message\n   - PR: #2\n\n`
  )
})