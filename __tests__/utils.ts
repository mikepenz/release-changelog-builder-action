import {Configuration} from '../src/configuration.js'
import {DefaultDiffInfo} from '../src/pr-collector/commits.js'
import {PullRequestInfo} from '../src/pr-collector/pullRequests.js'
import {buildChangelog} from '../src/transform.js'
import {BaseRepository} from '../src/repositories/BaseRepository.js'
import moment from 'moment'

export const buildChangelogTest = (config: Configuration, prs: PullRequestInfo[], repositoryUtils: BaseRepository): string => {
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

export const buildPullRequeset = (number: number, title: string, labels: string[] = ['feature']): PullRequestInfo => {
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
