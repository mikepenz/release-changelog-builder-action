import {buildChangelog} from '../src/transform'
import moment from 'moment'
import {Configuration, DefaultConfiguration} from '../src/configuration'
import {PullRequestInfo} from '../src/pr-collector/pullRequests'
import {DefaultDiffInfo} from '../src/pr-collector/commits'
import {GithubRepository} from '../src/repositories/GithubRepository'
import {clear} from '../src/transform'
import {buildChangelogTest} from './utils'

jest.setTimeout(180000)
clear()

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
    title: '[Feature][AB-1234] - this is a PR 1 title message',
    htmlURL: '',
    baseBranch: '',
    createdAt: moment(),
    mergedAt: moment(),
    mergeCommitSha: 'sha1',
    author: 'Mike',
    authorName: 'Mike',
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
    htmlURL: '',
    baseBranch: '',
    createdAt: moment(),
    mergedAt: moment(),
    mergeCommitSha: 'sha1',
    author: 'Mike',
    authorName: 'Mike',
    repoName: 'test-repo',
    labels: [],
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
    authorName: 'Mike',
    repoName: 'test-repo',
    labels: [],
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
    authorName: 'Mike',
    repoName: 'test-repo',
    labels: [],
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
  authorName: 'Mike',
  repoName: 'test-repo',
  labels: [],
  milestone: '',
  body: '[Issue][Feature][AB-1234321] - no magic body for this matter',
  assignees: [],
  requestedReviewers: [],
  approvedReviewers: [],
  status: 'merged'
}

const openPullRequest: PullRequestInfo = {
  number: 6,
  title: 'Still pending open pull request',
  htmlURL: '',
  baseBranch: '',
  createdAt: moment(),
  mergedAt: moment(),
  mergeCommitSha: 'sha1',
  author: 'Mike',
  authorName: 'Mike',
  repoName: 'test-repo',
  labels: [],
  milestone: '',
  body: 'Some fancy body message',
  assignees: [],
  requestedReviewers: [],
  approvedReviewers: [],
  status: 'open'
}

it('Extract label from title, combined regex', async () => {
  configuration.label_extractor = [
    {
      pattern: '.*(\\[Feature\\]|\\[Issue\\]).*',
      target: '$1',
      on_property: 'title'
    }
  ]
  expect(buildChangelogTest(configuration, mergedPullRequests, repositoryUtils)).toStrictEqual(
    `## 🚀 Features\n\n- [Feature][AB-1234] - this is a PR 1 title message\n   - PR: #1\n- [Issue][Feature][AB-1234321] - this is a PR 3 title message\n   - PR: #3\n\n## 🐛 Fixes\n\n- [Issue][AB-4321] - this is a PR 2 title message\n   - PR: #2\n\n`
  )
})

it('Extract label from title and body, combined regex', async () => {
  configuration.label_extractor = [
    {
      pattern: '.*(\\[Feature\\]|\\[Issue\\]).*',
      target: '$1',
      on_property: ['title', 'body']
    }
  ]

  let prs = Array.from(mergedPullRequests)
  prs.push(pullRequestWithLabelInBody)
  expect(buildChangelogTest(configuration, prs, repositoryUtils)).toStrictEqual(
    `## 🚀 Features\n\n- [Feature][AB-1234] - this is a PR 1 title message\n   - PR: #1\n- [Issue][Feature][AB-1234321] - this is a PR 3 title message\n   - PR: #3\n- label in body\n   - PR: #5\n\n## 🐛 Fixes\n\n- [Issue][AB-4321] - this is a PR 2 title message\n   - PR: #2\n\n`
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
  expect(buildChangelogTest(configuration, mergedPullRequests, repositoryUtils)).toStrictEqual(
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
  expect(buildChangelogTest(configuration, mergedPullRequests, repositoryUtils)).toStrictEqual(
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
  expect(buildChangelogTest(configuration, mergedPullRequests, repositoryUtils)).toStrictEqual(
    `## 🚀 Features\n\n- [Feature][AB-1234] - this is a PR 1 title message\n   - PR: #1\n- [Issue][Feature][AB-1234321] - this is a PR 3 title message\n   - PR: #3\n\n## 🐛 Fixes\n\n- [Issue][AB-4321] - this is a PR 2 title message\n   - PR: #2\n- [Issue][Feature][AB-1234321] - this is a PR 3 title message\n   - PR: #3\n\n`
  )
})

it('Extract label from title, match multiple, custon non matching label', async () => {
  configuration.label_extractor = [
    {
      pattern: '\\[Feature\\]|\\[Issue\\]',
      on_property: 'title',
      method: 'match',
      on_empty: '[Other]'
    }
  ]
  expect(buildChangelogTest(configuration, mergedPullRequests, repositoryUtils)).toStrictEqual(
    `## 🚀 Features\n\n- [Feature][AB-1234] - this is a PR 1 title message\n   - PR: #1\n- [Issue][Feature][AB-1234321] - this is a PR 3 title message\n   - PR: #3\n\n## 🐛 Fixes\n\n- [Issue][AB-4321] - this is a PR 2 title message\n   - PR: #2\n- [Issue][Feature][AB-1234321] - this is a PR 3 title message\n   - PR: #3\n\n## 🧪 Others\n\n- [AB-404] - not found label\n   - PR: #4\n\n`
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
    createdAt: moment(),
    mergedAt: moment(),
    mergeCommitSha: 'sha1-1',
    author: 'Mike',
    authorName: 'Mike',
    repoName: 'test-repo',
    labels: ['feature'],
    milestone: '',
    body: 'no magic body for this matter',
    assignees: [],
    requestedReviewers: [],
    approvedReviewers: [],
    status: 'merged'
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
    authorName: 'Mike',
    repoName: 'test-repo',
    labels: ['issue', 'fix'],
    milestone: '',
    body: 'no magic body for this matter - #1',
    assignees: [],
    requestedReviewers: [],
    approvedReviewers: [],
    status: 'merged'
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
    authorName: 'Mike',
    repoName: 'test-repo',
    labels: ['issue', 'feature', 'fix'],
    milestone: '',
    body: 'no magic body for this matter',
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
    mergeCommitSha: 'sha1-4',
    author: 'Mike',
    authorName: 'Mike',
    repoName: 'test-repo',
    labels: [''],
    milestone: '',
    body: 'no magic body for this matter',
    assignees: [],
    requestedReviewers: [],
    approvedReviewers: [],
    status: 'merged'
  }
)

const openPullRequestsWithLabels: PullRequestInfo[] = []
openPullRequestsWithLabels.push(
  {
    number: 6,
    title: 'Still pending open pull request (Current)',
    htmlURL: '',
    baseBranch: '',
    createdAt: moment(),
    mergedAt: moment(),
    mergeCommitSha: 'sha1',
    author: 'Mike',
    authorName: 'Mike',
    repoName: 'test-repo',
    labels: ['feature'],
    milestone: '',
    body: 'Some fancy body message',
    assignees: [],
    requestedReviewers: [],
    approvedReviewers: [],
    status: 'open'
  },
  {
    number: 7,
    title: 'Still pending open pull request',
    htmlURL: '',
    baseBranch: '',
    createdAt: moment(),
    mergedAt: moment(),
    mergeCommitSha: 'sha1',
    author: 'Mike',
    authorName: 'Mike',
    repoName: 'test-repo',
    labels: [],
    milestone: '',
    body: 'Some fancy body message',
    assignees: [],
    requestedReviewers: [],
    approvedReviewers: [],
    status: 'open'
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
  expect(buildChangelogTest(customConfig, pullRequestsWithLabels, repositoryUtils)).toStrictEqual(
    `## 🚀 Features and 🐛 Issues\n\n- [ABC-1234] - this is a PR 3 title message\n   - PR: #3\n\n`
  )
})

it('Deduplicate duplicated PRs', async () => {
  const customConfig = Object.assign({}, DefaultConfiguration)
  customConfig.categories.pop() // drop `uncategorized` category
  customConfig.duplicate_filter = {
    pattern: '\\[ABC-....\\]',
    on_property: 'title',
    method: 'match'
  }
  expect(buildChangelogTest(customConfig, pullRequestsWithLabels, repositoryUtils)).toStrictEqual(
    `## 🚀 Features\n\n- [ABC-1234] - this is a PR 3 title message\n   - PR: #3\n\n## 🐛 Fixes\n\n- [ABC-4321] - this is a PR 2 title message\n   - PR: #2\n- [ABC-1234] - this is a PR 3 title message\n   - PR: #3\n\n`
  )
})

it('Deduplicate duplicated PRs DESC', async () => {
  const customConfig = Object.assign({}, DefaultConfiguration)
  customConfig.categories.pop() // drop `uncategorized` category
  customConfig.sort = 'DESC'
  customConfig.duplicate_filter = {
    pattern: '\\[ABC-....\\]',
    on_property: 'title',
    method: 'match'
  }
  expect(buildChangelogTest(customConfig, pullRequestsWithLabels, repositoryUtils)).toStrictEqual(
    `## 🚀 Features\n\n- [ABC-1234] - this is a PR 1 title message\n   - PR: #1\n\n## 🐛 Fixes\n\n- [ABC-4321] - this is a PR 2 title message\n   - PR: #2\n\n`
  )
})

it('Reference PRs', async () => {
  const customConfig = Object.assign({}, DefaultConfiguration)
  customConfig.categories = [
    {
      title: '',
      labels: []
    }
  ]
  customConfig.pr_template = '#{{NUMBER}} -- #{{REFERENCED[*].number}}'
  customConfig.reference = {
    pattern: '.* #(.).*', // matches the 1 from "abcdefg #1 adfasdf"
    on_property: 'body',
    method: 'replace',
    target: '$1'
  }
  expect(buildChangelogTest(customConfig, pullRequestsWithLabels, repositoryUtils)).toStrictEqual(`1 -- 2\n4 -- \n3 -- \n\n`)
})

it('Use empty_content for empty category', async () => {
  const customConfig = Object.assign({}, DefaultConfiguration)
  customConfig.categories = [
    {
      title: '## 🚀 Features and 🐛 Issues',
      labels: ['Never-Matching-Category'],
      empty_content: '- No PRs in this category'
    },
    {
      title: '## 🚀 Features',
      labels: ['Feature']
    }
  ]
  expect(buildChangelogTest(customConfig, pullRequestsWithLabels, repositoryUtils)).toStrictEqual(
    `## 🚀 Features and 🐛 Issues\n\n- No PRs in this category\n\n## 🚀 Features\n\n- [ABC-1234] - this is a PR 1 title message\n   - PR: #1\n- [ABC-1234] - this is a PR 3 title message\n   - PR: #3\n\n`
  )
})

const repositoryUtils = new GithubRepository(process.env.GITEA_TOKEN || '', undefined, '.')
it('Commit SHA-1 in commitMode', async () => {
  const customConfig = Object.assign({}, DefaultConfiguration)
  customConfig.sort = 'DESC'
  customConfig.pr_template = '#{{MERGE_SHA}}'

  const resultChangelog = buildChangelog(DefaultDiffInfo, pullRequestsWithLabels, {
    owner: 'mikepenz',
    repo: 'test-repo',
    fromTag: {name: '1.0.0'},
    toTag: {name: '2.0.0'},
    includeOpen: false,
    failOnError: false,
    fetchReviewers: false,
    fetchReleaseInformation: false,
    fetchReviews: false,
    mode: 'COMMIT',
    configuration: customConfig,
    repositoryUtils: repositoryUtils
  })

  expect(resultChangelog).toStrictEqual(`## 🚀 Features\n\nsha1-3\nsha1-1\n\n## 🐛 Fixes\n\nsha1-3\nsha1-2\n\n`)
})

it('Release Diff', async () => {
  const customConfig = Object.assign({}, DefaultConfiguration)
  customConfig.template = '#{{RELEASE_DIFF}}\n#{{DAYS_SINCE}}'

  const resultChangelog = buildChangelog(DefaultDiffInfo, pullRequestsWithLabels, {
    owner: 'mikepenz',
    repo: 'release-changelog-builder-action',
    fromTag: {name: 'v2.8.0'},
    toTag: {name: 'v2.8.1'},
    includeOpen: false,
    failOnError: false,
    fetchReviewers: false,
    fetchReleaseInformation: true,
    fetchReviews: false,
    mode: 'COMMIT',
    configuration: customConfig,
    repositoryUtils: repositoryUtils
  })

  expect(resultChangelog).toStrictEqual(`https://github.com/mikepenz/release-changelog-builder-action/compare/v2.8.0...v2.8.1\n`)
})

it('Use exclude labels to not include a PR within a category.', async () => {
  const customConfig = Object.assign({}, DefaultConfiguration)
  customConfig.categories = [
    {
      title: '## 🚀 Features and 🐛 Issues',
      labels: ['Feature', 'Issue'],
      exhaustive: true
    },
    {
      title: '## 🚀 Features and 🐛 Issues But No 🐛 Fixes',
      labels: ['Feature', 'Issue'],
      exclude_labels: ['Fix'],
      exhaustive: true
    },
    {
      title: '## 🚀 Features and/or 🐛 Issues But No 🐛 Fixes',
      labels: ['Feature', 'Issue'],
      exclude_labels: ['Fix']
    }
  ]
  expect(buildChangelogTest(customConfig, pullRequestsWithLabels, repositoryUtils)).toStrictEqual(
    `## 🚀 Features and 🐛 Issues\n\n- [ABC-1234] - this is a PR 3 title message\n   - PR: #3\n\n## 🚀 Features and/or 🐛 Issues But No 🐛 Fixes\n\n- [ABC-1234] - this is a PR 1 title message\n   - PR: #1\n\n`
  )
})

it('Extract custom placeholder from PR body and replace in global template', async () => {
  const customConfig = Object.assign({}, configuration)
  customConfig.custom_placeholders = [
    {
      name: 'C_PLACEHOLDER_1',
      source: 'BODY',
      transformer: {
        pattern: '.+ (b....).+',
        target: '- $1'
      }
    },
    {
      name: 'C_PLACEHOLER_2',
      source: 'BODY',
      transformer: {
        pattern: '.+ b(....).+',
        target: '\n- $1'
      }
    },
    {
      name: 'C_PLACEHOLER_3',
      source: 'BODY',
      transformer: {
        pattern: '.+(body1).+',
        target: '$1'
      }
    },
    {
      name: 'C_PLACEHOLER_4',
      source: 'BODY',
      transformer: {
        pattern: '.+(body-never-matches).+',
        target: '$1'
      }
    }
  ]
  customConfig.template =
    '#{{CHANGELOG}}\n\n#{{C_PLACEHOLER_2[2]}}\n\n#{{C_PLACEHOLER_2[*]}}#{{C_PLACEHOLDER_1[7]}}#{{C_PLACEHOLER_2[1493]}}#{{C_PLACEHOLER_4[*]}}#{{C_PLACEHOLER_4[0]}}#{{C_PLACEHOLER_3[1]}}'
  customConfig.pr_template = '#{{BODY}} ---->  #{{C_PLACEHOLDER_1}}#{{C_PLACEHOLER_3}}'

  expect(buildChangelogTest(customConfig, mergedPullRequests, repositoryUtils)).toStrictEqual(
    `## 🚀 Features\n\nno magic body1 for this matter ---->  - body1body1\nno magic body3 for this matter ---->  - body3\n\n## 🐛 Fixes\n\nno magic body2 for this matter ---->  - body2\nno magic body3 for this matter ---->  - body3\n\n## 🧪 Others\n\nno magic body4 for this matter ---->  - body4\n\n\n\n\n- ody3\n\n\n- ody1\n- ody2\n- ody3\n- ody4`
  )
})

it('Use Rules to include a PR within a Category.', async () => {
  const customConfig = Object.assign({}, DefaultConfiguration)
  customConfig.categories = [
    {
      title: '## 🚀 Features But No 🐛 Fixes and only merged with a title containing `[ABC-1234]`',
      labels: ['Feature'],
      exclude_labels: ['Fix'],
      rules: [
        {
          pattern: '\\[ABC-1234\\]',
          on_property: 'title'
        },
        {
          pattern: 'merged',
          on_property: 'status'
        }
      ],
      exhaustive: true
    }
  ]
  expect(buildChangelogTest(customConfig, pullRequestsWithLabels, repositoryUtils)).toStrictEqual(
    `## 🚀 Features But No 🐛 Fixes and only merged with a title containing \`[ABC-1234]\`\n\n- [ABC-1234] - this is a PR 1 title message\n   - PR: #1\n\n`
  )
})

it('Use Rules to get all open PRs in a Category.', async () => {
  let prs = Array.from(pullRequestsWithLabels)
  prs.push(openPullRequest)

  const customConfig = Object.assign({}, DefaultConfiguration)
  customConfig.categories = [
    {
      title: '## Open PRs only',
      rules: [
        {
          pattern: 'open',
          on_property: 'status'
        }
      ]
    }
  ]
  expect(buildChangelogTest(customConfig, prs, repositoryUtils)).toStrictEqual(
    `## Open PRs only\n\n- Still pending open pull request\n   - PR: #6\n\n`
  )
})

it('Use Rules to get current open PR and merged categorised.', async () => {
  let prs = Array.from(pullRequestsWithLabels)
  prs = prs.concat(Array.from(openPullRequestsWithLabels))

  const customConfig = Object.assign({}, DefaultConfiguration)
  customConfig.categories = [
    {
      title: '## 🚀 Features',
      labels: ['Feature'],
      rules: [
        {
          pattern: '6',
          on_property: 'number'
        },
        {
          pattern: 'merged',
          on_property: 'status'
        }
      ],
      exhaustive: true,
      exhaustive_rules: false
    },
    {
      title: '## 🐛 Issues',
      labels: ['Issue'],
      rules: [
        {
          pattern: 'merged',
          on_property: 'status'
        }
      ],
      exhaustive: true
    }
  ]

  expect(buildChangelogTest(customConfig, prs, repositoryUtils)).toStrictEqual(
    `## 🚀 Features\n\n- [ABC-1234] - this is a PR 1 title message\n   - PR: #1\n- Still pending open pull request (Current)\n   - PR: #6\n- [ABC-1234] - this is a PR 3 title message\n   - PR: #3\n\n## 🐛 Issues\n\n- [ABC-4321] - this is a PR 2 title message\n   - PR: #2\n- [ABC-1234] - this is a PR 3 title message\n   - PR: #3\n\n`
  )
})

it('Use Rules to get all open PRs in one Category and merged categorised.', async () => {
  let prs = Array.from(pullRequestsWithLabels)
  prs.push(openPullRequest)

  const customConfig = Object.assign({}, DefaultConfiguration)
  customConfig.categories = [
    {
      title: '## Open PRs only',
      rules: [
        {
          pattern: 'open',
          on_property: 'status'
        }
      ]
    },
    {
      title: '## 🚀 Features and 🐛 Issues',
      labels: ['Feature', 'Issue'],
      rules: [
        {
          pattern: 'merged',
          on_property: 'status'
        }
      ],
      exhaustive: true
    }
  ]
  expect(buildChangelogTest(customConfig, prs, repositoryUtils)).toStrictEqual(
    `## Open PRs only\n\n- Still pending open pull request\n   - PR: #6\n\n## 🚀 Features and 🐛 Issues\n\n- [ABC-1234] - this is a PR 3 title message\n   - PR: #3\n\n`
  )
})
