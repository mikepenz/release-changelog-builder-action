import {buildChangelog} from '../src/transform'
import { PullRequestInfo } from '../src/pullRequests'
import moment from 'moment'
import { DefaultConfiguration } from '../src/configuration';

jest.setTimeout(180000)

let configuration = DefaultConfiguration
  configuration.categories = [
    {
      "title": "## 🚀 Features",
      "labels": ["[Feature]"]
    },
    {
      "title": "## 🐛 Fixes",
      "labels": ["[Bug]", "[Issue]"]
    },
    {
      "title": "## 🧪 Tests",
      "labels": ["[Test]"]
    }
  ]

  let mergedPullRequests: PullRequestInfo[] = []
  mergedPullRequests.push({
    number: 1,
    title: "[Feature][AB-1234] - this is a PR 1 title message",
    htmlURL: "",
    baseBranch: "",
    mergedAt: moment(),
    mergeCommitSha: "sha1",
    author: "Mike",
    repoName: "test-repo",
    labels: new Set<string>(),
    milestone: "",
    body: "no magic body for this matter",
    assignees: [],
    requestedReviewers: []
  }, {
    number: 2,
    title: "[Issue][AB-4321] - this is a PR 2 title message",
    htmlURL: "",
    baseBranch: "",
    mergedAt: moment(),
    mergeCommitSha: "sha1",
    author: "Mike",
    repoName: "test-repo",
    labels: new Set<string>(),
    milestone: "",
    body: "no magic body for this matter",
    assignees: [],
    requestedReviewers: []
  }, {
    number: 3,
    title: "[Issue][Feature][AB-1234321] - this is a PR 3 title message",
    htmlURL: "",
    baseBranch: "",
    mergedAt: moment(),
    mergeCommitSha: "sha1",
    author: "Mike",
    repoName: "test-repo",
    labels: new Set<string>(),
    milestone: "",
    body: "no magic body for this matter",
    assignees: [],
    requestedReviewers: []
  }, {
    number: 4,
    title: "[AB-404] - not found label",
    htmlURL: "",
    baseBranch: "",
    mergedAt: moment(),
    mergeCommitSha: "sha1",
    author: "Mike",
    repoName: "test-repo",
    labels: new Set<string>(),
    milestone: "",
    body: "no magic body for this matter",
    assignees: [],
    requestedReviewers: []
  })

it('Extract label from title, combined regex', async () => {
  configuration.label_extractor = [
    {
      "pattern": ".*(\\[Feature\\]|\\[Issue\\]).*",
      "target": "$1",
      "on_property": "title"
    }
  ]

  const resultChangelog = buildChangelog(
    mergedPullRequests,
    {
      owner: "mikepenz",
      repo: "test-repo",
      fromTag: "1.0.0",
      toTag: "2.0.0",
      failOnError: false,
      commitMode: false,
      configuration: configuration
    } 
  )

  expect(resultChangelog).toStrictEqual(`## 🚀 Features\n\n- [Feature][AB-1234] - this is a PR 1 title message\n   - PR: #1\n- [Issue][Feature][AB-1234321] - this is a PR 3 title message\n   - PR: #3\n\n## 🐛 Fixes\n\n- [Issue][AB-4321] - this is a PR 2 title message\n   - PR: #2\n\n`)
})

it('Extract label from title, split regex', async () => {
  configuration.label_extractor = [
    {
      "pattern": ".*(\\[Feature\\]).*",
      "target": "$1",
      "on_property": "title"
    },
    {
      "pattern": ".*(\\[Issue\\]).*",
      "target": "$1",
      "on_property": "title"
    }
  ]

  const resultChangelog = buildChangelog(
    mergedPullRequests,
    {
      owner: "mikepenz",
      repo: "test-repo",
      fromTag: "1.0.0",
      toTag: "2.0.0",
      failOnError: false,
      commitMode: false,
      configuration: configuration
    } 
  )

  expect(resultChangelog).toStrictEqual(`## 🚀 Features\n\n- [Feature][AB-1234] - this is a PR 1 title message\n   - PR: #1\n- [Issue][Feature][AB-1234321] - this is a PR 3 title message\n   - PR: #3\n\n## 🐛 Fixes\n\n- [Issue][AB-4321] - this is a PR 2 title message\n   - PR: #2\n- [Issue][Feature][AB-1234321] - this is a PR 3 title message\n   - PR: #3\n\n`)
})

it('Extract label from title, match', async () => {
  configuration.label_extractor = [
    {
      "pattern": "\\[Feature\\]",
      "on_property": "title",
      "method": "match"
    },
    {
      "pattern": "\\[Issue\\]",
      "on_property": "title",
      "method": "match"
    }
  ]

  const resultChangelog = buildChangelog(
    mergedPullRequests,
    {
      owner: "mikepenz",
      repo: "test-repo",
      fromTag: "1.0.0",
      toTag: "2.0.0",
      failOnError: false,
      commitMode: false,
      configuration: configuration
    } 
  )

  expect(resultChangelog).toStrictEqual(`## 🚀 Features\n\n- [Feature][AB-1234] - this is a PR 1 title message\n   - PR: #1\n- [Issue][Feature][AB-1234321] - this is a PR 3 title message\n   - PR: #3\n\n## 🐛 Fixes\n\n- [Issue][AB-4321] - this is a PR 2 title message\n   - PR: #2\n- [Issue][Feature][AB-1234321] - this is a PR 3 title message\n   - PR: #3\n\n`)
})

it('Extract label from title, match multiple', async () => {
  configuration.label_extractor = [
    {
      "pattern": "\\[Feature\\]|\\[Issue\\]",
      "on_property": "title",
      "method": "match"
    }
  ]

  const resultChangelog = buildChangelog(
    mergedPullRequests,
    {
      owner: "mikepenz",
      repo: "test-repo",
      fromTag: "1.0.0",
      toTag: "2.0.0",
      failOnError: false,
      commitMode: false,
      configuration: configuration
    } 
  )

  expect(resultChangelog).toStrictEqual(`## 🚀 Features\n\n- [Feature][AB-1234] - this is a PR 1 title message\n   - PR: #1\n- [Issue][Feature][AB-1234321] - this is a PR 3 title message\n   - PR: #3\n\n## 🐛 Fixes\n\n- [Issue][AB-4321] - this is a PR 2 title message\n   - PR: #2\n- [Issue][Feature][AB-1234321] - this is a PR 3 title message\n   - PR: #3\n\n`)
})
