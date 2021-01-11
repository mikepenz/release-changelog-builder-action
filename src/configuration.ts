export interface Configuration {
  max_tags_to_fetch: number
  max_pull_requests: number
  max_back_track_time_days: number
  exclude_merge_branches: string[]
  sort: string
  template: string
  pr_template: string
  empty_template: string
  categories: Category[]
  ignore_labels: string[]
  transformers: Transformer[]
  tag_resolver: TagResolver
}

export interface Category {
  title: string
  labels: string[]
}

export interface Transformer {
  pattern: string
  target: string
}

export interface TagResolver {
  method: string // semver, sort
}

export const DefaultConfiguration: Configuration = {
  max_tags_to_fetch: 200, // the amount of tags to fetch from the github API
  max_pull_requests: 200, // the amount of pull requests to process
  max_back_track_time_days: 365, // allow max of 365 days back to check up on pull requests
  exclude_merge_branches: [], // branches to exclude from counting as PRs (e.g. YourOrg/qa, YourOrg/main)
  sort: 'ASC', // sorting order for filling the changelog (ASC or DESC) supported
  template: '${{CHANGELOG}}', // the global template to host the changelog
  pr_template: '- ${{TITLE}}\n   - PR: #${{NUMBER}}', // the per PR template to pick
  empty_template: '- no changes', // the template to use if no pull requests are found
  categories: [
    {
      title: '## 🚀 Features',
      labels: ['feature']
    },
    {
      title: '## 🐛 Fixes',
      labels: ['fix']
    },
    {
      title: '## 🧪 Tests',
      labels: ['test']
    }
  ], // the categories to support for the ordering
  ignore_labels: ['ignore'], // list of lables being ignored from the changelog
  transformers: [], // transformers to apply on the PR description according to the `pr_template`
  tag_resolver: {
    // defines the logic on how to resolve the previous tag, only relevant if `fromTag` is not specified
    method: 'semver' // defines which method to use, by default it will use `semver` (dropping all non matching tags). Alternative `sort` is also available.
  }
}
