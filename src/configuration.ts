import {Extractor, PullConfiguration, Regex, Rule} from './pr-collector/types.js'

export interface Configuration extends PullConfiguration {
  template: string
  pr_template: string
  commit_template: string // (COMMIT and HYBRID mode only for PRs converted to commits)
  empty_template: string
  categories: Category[]
  ignore_labels: string[]
  label_extractor: Extractor[]
  duplicate_filter?: Extractor // extract an identifier from a PR used to detect duplicates, will keep the last match (depends on `sort`)
  reference?: Extractor // extracts a reference from a PR, used to establish parent child relations. This will remove the child from the main PR list.
  transformers: Regex[]
  custom_placeholders?: Placeholder[]
  trim_values: boolean
}

export interface Category {
  key?: string // a key for this category. This is currently only used for the json output
  title: string // the title of this category
  labels?: string[] // labels to associate PRs to this category
  exclude_labels?: string[] // if an exclude label is detected, the PR will be excluded from this category
  rules?: Rule[] // rules to associate PRs to this category
  exhaustive?: boolean // requires all labels to be present in the PR
  exhaustive_rules?: boolean // requires all rules to be present in the PR (if not set, defaults to exhaustive value)
  empty_content?: string // if the category has no matching PRs, this content will be used. If not set, the category will be skipped in the changelog.
  categories?: Category[] // allows for nested categories, items matched for a child category won't show up in the parent
  consume?: boolean // defines if the matched PR will be consumed by this category. Consumed PRs won't show up in any category *after*
  mode?: 'HYBRID' | 'COMMIT' | 'PR' // defines if this category applies to PRs, commits or both
  entries?: string[] // array of single changelog entries, used to construct the changelog. (this is filled during the build)
}

/**
 * Defines the properties of the PullRequestInfo useable in different configurations
 */
export type Property =
  | 'number'
  | 'title'
  | 'branch'
  | 'author'
  | 'labels'
  | 'milestone'
  | 'body'
  | 'assignees'
  | 'requestedReviewers'
  | 'approvedReviewers'
  | 'status'

export interface TagResolver {
  method: string // semver, sort
  filter?: Regex // the regex to filter the tags, prior to sorting
  transformer?: Regex // transforms the tag name using the regex, run after the filter
}

export interface Placeholder {
  name: string // the name of the new placeholder
  source: string // the src placeholder which will be used to apply the transformer on
  transformer: Regex // the transformer to use to transform the original placeholder into the custom placeheolder
}

export class PlaceholderGroup extends Map<string, Placeholder[]> {}

export const DefaultConfiguration: Configuration = {
  max_tags_to_fetch: 200, // the amount of tags to fetch from the github API
  max_pull_requests: 200, // the amount of pull requests to process
  max_back_track_time_days: 365, // allow max of 365 days back to check up on pull requests
  exclude_merge_branches: [], // branches to exclude from counting as PRs (e.g. YourOrg/qa, YourOrg/main)
  sort: {
    // defines the sorting logic for PRs
    order: 'ASC', // the sorting order
    on_property: 'mergedAt' // the property to sort on. (mergedAt falls back to createdAt)
  },
  template: '#{{CHANGELOG}}', // the global template to host the changelog
  pr_template: '- #{{TITLE}}\n   - PR: ##{{NUMBER}}', // the per PR template to pick
  commit_template: '- #{{TITLE}}', // the per PR template to pick for commit based mode
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
    },
    {
      title: '## 📦 Uncategorized',
      labels: []
    }
  ], // the categories to support for the ordering
  ignore_labels: ['ignore'], // list of labels being ignored from the changelog
  label_extractor: [], // extracts additional labels from the commit message given a regex
  duplicate_filter: undefined, // extract an identifier from a PR used to detect duplicates, will keep the last match (depends on `sort`)
  transformers: [], // transformers to apply on the PR description according to the `pr_template`
  tag_resolver: {
    // defines the logic on how to resolve the previous tag, only relevant if `fromTag` is not specified
    method: 'semver', // defines which method to use, by default it will use `semver` (dropping all non-matching tags). Alternative `sort` is also available.
    filter: undefined, // filter out all tags not matching the regex
    transformer: undefined // transforms the tag name using the regex, run after the filter
  },
  base_branches: [], // target branches for the merged PR ignoring PRs with different target branch, by default it will get all PRs
  custom_placeholders: [],
  trim_values: false, // defines if values are being trimmed prior to inserting
  offlineMode: false // defines if the action should run in offline mode, disabling API requests
}

export const DefaultCommitConfiguration: Configuration = {
  ...DefaultConfiguration,
  categories: [
    {
      title: '## 🚀 Features',
      labels: ['feature', 'feat']
    },
    {
      title: '## 🐛 Fixes',
      labels: ['fix', 'bug']
    },
    {
      title: '## 🧪 Tests',
      labels: ['test']
    },
    {
      title: '## 📦 Other',
      labels: []
    }
  ],
  label_extractor: [
    {
      pattern: '^(build|chore|ci|docs|feat|fix|perf|refactor|revert|style|test){1}(\\([\\w\\-\\.]+\\))?(!)?: ([\\w ])+([\\s\\S]*)',
      on_property: 'title',
      target: '$1'
    }
  ]
}
