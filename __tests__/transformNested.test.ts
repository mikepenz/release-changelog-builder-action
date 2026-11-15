import moment from 'moment'
import {Configuration, DefaultConfiguration} from '../src/configuration.js'
import {PullRequestInfo} from '../src/pr-collector/pullRequests.js'
import {GithubRepository} from '../src/repositories/GithubRepository.js'
import {buildChangelog, clear} from '../src/transform.js'
import {expect, test} from 'vitest'
import {BaseRepository} from '../src/repositories/BaseRepository.js'
import {DefaultDiffInfo} from '../src/pr-collector/commits.js'

clear()

const repositoryUtils = new GithubRepository(process.env.GITEA_TOKEN || '', undefined, '.')
const buildChangelogTest = (config: Configuration, prs: PullRequestInfo[], repositoryUtils: BaseRepository): string => {
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

const buildPullRequeset = (number: number, title: string, labels: string[] = ['feature']): PullRequestInfo => {
  return {
    number,
    title,
    htmlURL: '',
    baseBranch: '',
    createdAt: moment(),
    mergedAt: moment(),
    mergeCommitSha: 'sha',
    author: 'Author',
    authorName: 'Author',
    repoName: 'test-repo',
    labels,
    milestone: '',
    body: '',
    assignees: [],
    requestedReviewers: [],
    approvedReviewers: [],
    status: 'merged'
  }
}
// test set of PRs with lables predefined
const pullRequestsWithLabels: PullRequestInfo[] = []
pullRequestsWithLabels.push(
  buildPullRequeset(1, 'Core Feature Ticket', ['core', 'feature']),
  buildPullRequeset(2, 'Core Bug Ticket', ['core', 'bug']),
  buildPullRequeset(3, 'Mobile Feature Ticket', ['mobile', 'feature']),
  buildPullRequeset(4, 'Mobile Bug Ticket', ['mobile', 'bug']),
  buildPullRequeset(5, 'Mobile & Core Feature Ticket', ['core', 'mobile', 'feature']),
  buildPullRequeset(6, 'Mobile & Core Bug Ticket', ['core', 'mobile', 'bug']),
  buildPullRequeset(7, 'Mobile & Core Bug Bug Ticket', ['core', 'mobile', 'bug', 'fancy-bug']),
  buildPullRequeset(8, 'Core Ticket', ['core'])
)

test('Match multiple labels exhaustive for category', async () => {
  const customConfig = Object.assign({}, DefaultConfiguration)
  customConfig.pr_template = '- #{{TITLE}}'
  customConfig.categories = [
    {
      title: '## Core',
      labels: ['core'],
      consume: true,
      categories: [
        {
          title: '### 🚀 Features',
          labels: ['feature']
        },
        {
          title: '### 🧪 Bug',
          labels: ['bug'],
          categories: [
            {
              title: '#### 🧪 Bug Bug',
              labels: ['fancy-bug']
            }
          ]
        }
      ]
    },
    {
      title: '## Mobile',
      labels: ['mobile'],
      consume: true,
      categories: [
        {
          title: '### 🚀 Features',
          labels: ['feature']
        },
        {
          title: '### 🧪 Bug',
          labels: ['bug']
        }
      ]
    },
    {
      title: '## Desktop',
      labels: ['desktop'],
      consume: true,
      categories: [
        {
          title: '### 🚀 Features',
          labels: ['feature']
        },
        {
          title: '### 🧪 Bug',
          labels: ['bug']
        }
      ]
    }
  ]

  const built = buildChangelogTest(customConfig, pullRequestsWithLabels, repositoryUtils)
  expect(built).toStrictEqual(
    `## Core\n\n- Core Ticket\n\n### 🚀 Features\n\n- Core Feature Ticket\n- Mobile & Core Feature Ticket\n\n### 🧪 Bug\n\n- Core Bug Ticket\n- Mobile & Core Bug Ticket\n\n#### 🧪 Bug Bug\n\n- Mobile & Core Bug Bug Ticket\n\n## Mobile\n\n\n### 🚀 Features\n\n- Mobile Feature Ticket\n\n### 🧪 Bug\n\n- Mobile Bug Ticket\n\n`
  )
})

test('Collapsed categories contain their entries and nested categories', () => {
  const customConfig = {...DefaultConfiguration, pr_template: '- #{{TITLE}}'}
  customConfig.categories = [
    {
      title: '## Dependencies',
      labels: ['dependency'],
      collapsed: true,
      categories: [{title: '### Runtime', labels: ['runtime']}]
    },
    {title: '## Features', labels: ['feature']},
    {title: '## Skipped', labels: ['missing'], collapsed: true},
    {title: '## Empty', labels: ['missing'], collapsed: true, empty_content: '- No changes'}
  ]

  const changelog = buildChangelogTest(
    customConfig,
    [
      buildPullRequeset(1, 'Runtime dependency', ['dependency', 'runtime']),
      buildPullRequeset(2, 'Direct dependency', ['dependency']),
      buildPullRequeset(3, 'New feature', ['feature'])
    ],
    repositoryUtils
  )

  expect(changelog).toStrictEqual(
    '<details>\n<summary>Dependencies</summary>\n\n- Direct dependency\n\n### Runtime\n\n- Runtime dependency\n\n</details>\n\n' +
      '## Features\n\n- New feature\n\n' +
      '<details>\n<summary>Empty</summary>\n\n- No changes\n\n</details>\n\n'
  )
})

test('Consuming child category keeps the PR out of following sibling and top level categories', () => {
  const customConfig = {...DefaultConfiguration, pr_template: '- #{{TITLE}}'}
  customConfig.categories = [
    {
      title: '## Core',
      labels: ['core'],
      categories: [
        {
          title: '### Breaking',
          labels: ['breaking'],
          categories: [{title: '#### API', labels: ['api'], consume: true}]
        },
        {title: '### Security', labels: ['security'], consume: true},
        {title: '### Features', labels: ['feature']}
      ]
    },
    {title: '## Features', labels: ['feature']}
  ]

  const changelog = buildChangelogTest(
    customConfig,
    [
      buildPullRequeset(1, 'Breaking API feature', ['core', 'breaking', 'api', 'feature']),
      buildPullRequeset(2, 'Security feature', ['core', 'security', 'feature']),
      buildPullRequeset(3, 'Breaking feature', ['core', 'breaking', 'feature']),
      buildPullRequeset(4, 'Core feature', ['core', 'feature'])
    ],
    repositoryUtils
  )

  expect(changelog).toStrictEqual(
    '## Core\n\n\n' +
      '### Breaking\n\n- Breaking feature\n\n' +
      '#### API\n\n- Breaking API feature\n\n' +
      '### Security\n\n- Security feature\n\n' +
      '### Features\n\n- Breaking feature\n- Core feature\n\n' +
      '## Features\n\n- Breaking feature\n- Core feature\n\n'
  )
})

test('Child categories respect the configured mode', () => {
  const customConfig = {...DefaultConfiguration, pr_template: '- #{{TITLE}}'}
  customConfig.categories = [
    {
      title: '## Core',
      labels: ['core'],
      categories: [
        {title: '### Commit Features', labels: ['feature'], mode: 'COMMIT'},
        {title: '### PR Features', labels: ['feature'], mode: 'PR'}
      ]
    },
    {
      title: '## Docs',
      labels: ['docs'],
      categories: [{title: '### Commit Docs', labels: ['docs'], mode: 'COMMIT'}]
    }
  ]

  const changelog = buildChangelogTest(
    customConfig,
    [buildPullRequeset(1, 'Core feature', ['core', 'feature']), buildPullRequeset(2, 'Docs update', ['docs'])],
    repositoryUtils
  )

  expect(changelog).toStrictEqual('## Core\n\n\n### PR Features\n\n- Core feature\n\n## Docs\n\n- Docs update\n\n')
})

test('Consumed PRs are counted as categorized', () => {
  const customConfig = {
    ...DefaultConfiguration,
    template: '#{{CHANGELOG}}categorized: #{{CATEGORIZED_COUNT}}, uncategorized: #{{UNCATEGORIZED_COUNT}}',
    pr_template: '- #{{TITLE}}'
  }
  customConfig.categories = [
    {
      title: '## Core',
      labels: ['core'],
      categories: [{title: '### Breaking', labels: ['breaking'], consume: true}]
    },
    {title: '## Mobile', labels: ['mobile'], consume: true},
    {title: '## Features', labels: ['feature']}
  ]

  const changelog = buildChangelogTest(
    customConfig,
    [
      buildPullRequeset(1, 'Breaking core feature', ['core', 'breaking', 'feature']),
      buildPullRequeset(2, 'Mobile feature', ['mobile', 'feature']),
      buildPullRequeset(3, 'Other', ['other'])
    ],
    repositoryUtils
  )

  expect(changelog).toStrictEqual(
    '## Core\n\n\n### Breaking\n\n- Breaking core feature\n\n## Mobile\n\n- Mobile feature\n\ncategorized: 2, uncategorized: 1'
  )
})
