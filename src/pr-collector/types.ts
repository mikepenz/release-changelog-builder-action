export interface PullConfiguration {
  max_tags_to_fetch: number
  max_pull_requests: number
  max_back_track_time_days: number
  exclude_merge_branches: string[]
  sort: Sort | string // "ASC" or "DESC"
  tag_resolver: TagResolver
  base_branches: string[]
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

export interface Rule extends Regex {
  on_property?: Property // retrieve the property to apply the rule on
}

export interface Sort {
  order: 'ASC' | 'DESC' // the sorting order
  on_property: 'mergedAt' | 'title' // the property to sort on. (mergedAt falls back to createdAt)
}

export interface TagResolver {
  method: string // semver, sort
  filter?: Regex // the regex to filter the tags, prior to sorting
  transformer?: Regex | Regex[] // transforms the tag name using the regex, run after the filter
}

export interface Regex {
  pattern: string // the regex pattern to match
  flags?: string // the regex flag to use for RegExp
  target?: string // the target string to transform the source string using the regex to
  method?: 'replace' | 'replaceAll' | 'match' | 'regexr' | undefined // the method to use to extract the value, `match` will not use the `target` property
  on_empty?: string | undefined // in case the regex results in an empty string, this value is gonna be used instead (only for label_extractor currently)
}

export interface Extractor extends Regex {
  on_property?: Property[] | Property | undefined // retrieve the property to extract the value from
}

export interface RegexTransformer {
  pattern: RegExp | null
  target: string
  onProperty?: Property[]
  method?: 'replace' | 'replaceAll' | 'match' | 'regexr'
  onEmpty?: string
}
