import moment from 'moment'
import {DefaultConfiguration} from '../src/configuration'
import {PullRequestInfo} from '../src/pr-collector/pullRequests'
import {GithubRepository} from '../src/repositories/GithubRepository'
import {clear} from '../src/transform'
import {buildChangelogTest, buildPullRequeset} from './utils'

jest.setTimeout(180000)
clear()

const repositoryUtils = new GithubRepository(process.env.GITEA_TOKEN || '', undefined, '.')

// test set of PRs with lables predefined
const pullRequestsWithLabels: PullRequestInfo[] = []
pullRequestsWithLabels.push(
  buildPullRequeset(1, 'Core Feature Ticket', ['core', 'feature']),
  buildPullRequeset(2, 'Core Bug Ticket', ['core', 'bug']),
  buildPullRequeset(3, 'Mobile Feature Ticket', ['mobile', 'feature']),
  buildPullRequeset(4, 'Mobile Bug Ticket', ['mobile', 'bug']),
  buildPullRequeset(5, 'Mobile & Core Feature Ticket', ['core', 'mobile', 'feature']),
  buildPullRequeset(6, 'Mobile & Core Bug Ticket', ['core', 'mobile', 'bug']),
  buildPullRequeset(7, 'Mobile & Core Bug Bug Ticket', ['core', 'mobile', 'bug', 'fancy-bug'])
)

it('Match multiple labels exhaustive for category', async () => {
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

  expect(buildChangelogTest(customConfig, pullRequestsWithLabels, repositoryUtils)).toStrictEqual(``)
})
