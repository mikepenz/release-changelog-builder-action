import * as core from '@actions/core'
import {Category, Configuration, DefaultConfiguration, Extractor, Placeholder, Transformer} from './configuration'
import {CommentInfo, EMPTY_COMMENT_INFO, PullRequestInfo, sortPullRequests} from './pullRequests'
import {ReleaseNotesOptions} from './releaseNotes'
import {DiffInfo} from './commits'
import {createOrSet, haveCommonElements, haveEveryElements} from './utils'

export interface RegexTransformer {
  pattern: RegExp | null
  target: string
  onProperty?: ('title' | 'author' | 'milestone' | 'body' | 'status' | 'branch')[] | undefined
  method?: 'replace' | 'match' | undefined
  onEmpty?: string | undefined
}

const EMPTY_MAP = new Map<string, string>()

export function buildChangelog(diffInfo: DiffInfo, prs: PullRequestInfo[], options: ReleaseNotesOptions): string {
  // sort to target order
  const config = options.configuration
  const sort = config.sort || DefaultConfiguration.sort
  prs = sortPullRequests(prs, sort)
  core.info(`ℹ️ Sorted all pull requests ascending: ${JSON.stringify(sort)}`)

  // drop duplicate pull requests
  if (config.duplicate_filter !== undefined) {
    const extractor = validateTransformer(config.duplicate_filter)
    if (extractor != null) {
      core.info(`ℹ️ Remove duplicated pull requests using \`duplicate_filter\``)

      const deduplicatedMap = new Map<string, PullRequestInfo>()
      const unmatched: PullRequestInfo[] = []
      for (const pr of prs) {
        const extracted = extractValues(pr, extractor, 'dupliate_filter')
        if (extracted !== null && extracted.length > 0) {
          deduplicatedMap.set(extracted[0], pr)
        } else {
          core.info(`  PR (${pr.number}) did not resolve an ID using the \`duplicate_filter\``)
          unmatched.push(pr)
        }
      }
      const deduplicatedPRs = Array.from(deduplicatedMap.values())
      deduplicatedPRs.push(...unmatched) // add all unmatched PRs to map
      const removedElements = prs.length - deduplicatedPRs.length
      core.info(`ℹ️ Removed ${removedElements} pull requests during deduplication`)
      prs = sortPullRequests(deduplicatedPRs, sort) // resort deduplicatedPRs
    } else {
      core.warning(`⚠️ Configured \`duplicate_filter\` invalid.`)
    }
  }

  // extract additional labels from the commit message
  const labelExtractors = validateTransformers(config.label_extractor)
  for (const extractor of labelExtractors) {
    for (const pr of prs) {
      const extracted = extractValues(pr, extractor, 'label_extractor')
      if (extracted !== null) {
        for (const label of extracted) {
          pr.labels.add(label)
        }
      }
    }
  }

  // keep reference for the placeholder values
  const placeholders = new Map<string, Placeholder[]>()
  for (const ph of config.custom_placeholders || []) {
    createOrSet(placeholders, ph.source, ph)
  }
  const placeholderPrMap = new Map<string, string[]>()

  const validatedTransformers = validateTransformers(config.transformers)
  const transformedMap = new Map<PullRequestInfo, string>()
  // convert PRs to their text representation
  for (const pr of prs) {
    transformedMap.set(
      pr,
      transform(
        fillPrTemplate(pr, config.pr_template || DefaultConfiguration.pr_template, placeholders, placeholderPrMap, config),
        validatedTransformers
      )
    )
  }
  core.info(`ℹ️ Used ${validatedTransformers.length} transformers to adjust message`)
  core.info(`✒️ Wrote messages for ${prs.length} pull requests`)

  // bring PRs into the order of categories
  const categorized = new Map<Category, string[]>()
  const categories = config.categories || DefaultConfiguration.categories
  const ignoredLabels = config.ignore_labels || DefaultConfiguration.ignore_labels

  for (const category of categories) {
    categorized.set(category, [])
  }

  const categorizedPrs: string[] = []
  const ignoredPrs: string[] = []
  const openPrs: string[] = []
  const uncategorizedPrs: string[] = []

  // bring elements in order
  for (const [pr, body] of transformedMap) {
    if (
      haveCommonElements(
        ignoredLabels.map(lbl => lbl.toLocaleLowerCase('en')),
        pr.labels
      )
    ) {
      ignoredPrs.push(body)
      continue
    }

    if (pr.status === 'open') {
      openPrs.push(body)
    }

    let matched = false
    for (const [category, pullRequests] of categorized) {
      // check if any exclude label matches
      if (category.exclude_labels !== undefined) {
        if (
          haveCommonElements(
            category.exclude_labels.map(lbl => lbl.toLocaleLowerCase('en')),
            pr.labels
          )
        ) {
          if (core.isDebug()) {
            const prNum = pr.number
            const prLabels = pr.labels
            const excludeLabels = JSON.stringify(category.exclude_labels)
            core.debug(`PR ${prNum} with labels: ${prLabels} excluded from category via exclude label: ${excludeLabels}`)
          }
          continue // one of the exclude labels matched, skip the PR for this category
        }
      }

      if (category.exhaustive === true) {
        if (
          haveEveryElements(
            category.labels.map(lbl => lbl.toLocaleLowerCase('en')),
            pr.labels
          )
        ) {
          pullRequests.push(body)
          matched = true
        }
      } else {
        if (
          haveCommonElements(
            category.labels.map(lbl => lbl.toLocaleLowerCase('en')),
            pr.labels
          )
        ) {
          pullRequests.push(body)
          matched = true
        }
      }
    }

    if (!matched) {
      // we allow to have pull requests included in an "uncategorized" category
      for (const [category, pullRequests] of categorized) {
        if (category.labels.length === 0) {
          pullRequests.push(body)
          break
        }
      }

      uncategorizedPrs.push(body)
    } else {
      categorizedPrs.push(body)
    }
  }
  core.info(`ℹ️ Ordered all pull requests into ${categories.length} categories`)

  // construct final changelog
  let changelog = ''
  for (const [category, pullRequests] of categorized) {
    if (pullRequests.length > 0) {
      changelog = `${changelog + category.title}\n\n`

      for (const pr of pullRequests) {
        changelog = `${changelog + pr}\n`
      }
      changelog = `${changelog}\n` // add space between sections
    } else if (category.empty_content !== undefined) {
      changelog = `${changelog + category.title}\n\n`
      changelog = `${changelog + category.empty_content}\n\n`
    }
  }
  core.info(`✒️ Wrote ${categorizedPrs.length} categorized pull requests down`)
  if (core.isDebug()) {
    for (const pr of categorizedPrs) {
      core.debug(`    ${pr}`)
    }
  }
  core.setOutput('categorized_prs', categorizedPrs.length)

  let changelogUncategorized = ''
  for (const pr of uncategorizedPrs) {
    changelogUncategorized = `${changelogUncategorized + pr}\n`
  }
  core.info(`✒️ Wrote ${uncategorizedPrs.length} non categorized pull requests down`)
  if (core.isDebug()) {
    for (const pr of uncategorizedPrs) {
      core.debug(`    ${pr}`)
    }
  }
  core.setOutput('uncategorized_prs', uncategorizedPrs.length)

  let changelogOpen = ''
  if (openPrs.length > 0) {
    for (const pr of openPrs) {
      changelogOpen = `${changelogOpen + pr}\n`
    }
    core.info(`✒️ Wrote ${openPrs.length} open pull requests down`)
    if (core.isDebug()) {
      for (const pr of openPrs) {
        core.debug(`    ${pr}`)
      }
    }
    core.setOutput('open_prs', openPrs.length)
  }

  let changelogIgnored = ''
  for (const pr of ignoredPrs) {
    changelogIgnored = `${changelogIgnored + pr}\n`
  }
  if (core.isDebug()) {
    for (const pr of ignoredPrs) {
      core.debug(`    ${pr}`)
    }
  }
  core.info(`✒️ Wrote ${ignoredPrs.length} ignored pull requests down`)

  // fill template
  const placeholderMap = new Map<string, string>()
  placeholderMap.set('CHANGELOG', changelog)
  placeholderMap.set('UNCATEGORIZED', changelogUncategorized)
  placeholderMap.set('OPEN', changelogOpen)
  placeholderMap.set('IGNORED', changelogIgnored)
  // fill other placeholders
  placeholderMap.set('CATEGORIZED_COUNT', categorizedPrs.length.toString())
  placeholderMap.set('UNCATEGORIZED_COUNT', uncategorizedPrs.length.toString())
  placeholderMap.set('OPEN_COUNT', openPrs.length.toString())
  placeholderMap.set('IGNORED_COUNT', ignoredPrs.length.toString())
  // code change placeholders
  placeholderMap.set('CHANGED_FILES', diffInfo.changedFiles.toString())
  placeholderMap.set('ADDITIONS', diffInfo.additions.toString())
  placeholderMap.set('DELETIONS', diffInfo.deletions.toString())
  placeholderMap.set('CHANGES', diffInfo.changes.toString())
  placeholderMap.set('COMMITS', diffInfo.commits.toString())
  fillAdditionalPlaceholders(options, placeholderMap)

  let transformedChangelog = config.template || DefaultConfiguration.template
  transformedChangelog = replacePlaceholders(transformedChangelog, EMPTY_MAP, placeholderMap, placeholders, placeholderPrMap, config)
  transformedChangelog = replacePrPlaceholders(transformedChangelog, placeholderPrMap, config)
  transformedChangelog = cleanupPrPlaceholders(transformedChangelog, placeholders)
  core.info(`ℹ️ Filled template`)
  return transformedChangelog
}

export function replaceEmptyTemplate(template: string, options: ReleaseNotesOptions): string {
  const placeholders = new Map<string, Placeholder[]>()
  for (const ph of options.configuration.custom_placeholders || []) {
    createOrSet(placeholders, ph.source, ph)
  }
  const placeholderMap = new Map<string, string>()
  fillAdditionalPlaceholders(options, placeholderMap)
  return replacePlaceholders(template, new Map<string, string>(), placeholderMap, placeholders, undefined, options.configuration)
}

function fillAdditionalPlaceholders(
  options: ReleaseNotesOptions,
  placeholderMap: Map<string, string> /* placeholderKey and original value */
): void {
  placeholderMap.set('OWNER', options.owner)
  placeholderMap.set('REPO', options.repo)
  placeholderMap.set('FROM_TAG', options.fromTag.name)
  placeholderMap.set('FROM_TAG_DATE', options.fromTag.date?.toISOString() || '')
  placeholderMap.set('TO_TAG', options.toTag.name)
  placeholderMap.set('TO_TAG_DATE', options.toTag.date?.toISOString() || '')
  const fromDate = options.fromTag.date
  const toDate = options.toTag.date
  if (fromDate !== undefined && toDate !== undefined) {
    placeholderMap.set('DAYS_SINCE', toDate.diff(fromDate, 'days').toString() || '')
  } else {
    placeholderMap.set('DAYS_SINCE', '')
  }
  placeholderMap.set(
    'RELEASE_DIFF',
    `https://github.com/${options.owner}/${options.repo}/compare/${options.fromTag.name}...${options.toTag.name}`
  )
}

function fillPrTemplate(
  pr: PullRequestInfo,
  template: string,
  placeholders: Map<string, Placeholder[]> /* placeholders to apply */,
  placeholderPrMap: Map<string, string[]> /* map to keep replaced placeholder values with their key */,
  configuration: Configuration
): string {
  const arrayPlaceholderMap = new Map<string, string>()
  fillReviewPlaceholders(arrayPlaceholderMap, 'REVIEWS', pr.reviews || [])
  const placeholderMap = new Map<string, string>()
  placeholderMap.set('NUMBER', pr.number.toString())
  placeholderMap.set('TITLE', pr.title)
  placeholderMap.set('URL', pr.htmlURL)
  placeholderMap.set('STATUS', pr.status)
  placeholderMap.set('CREATED_AT', pr.createdAt.toISOString())
  placeholderMap.set('MERGED_AT', pr.mergedAt?.toISOString() || '')
  placeholderMap.set('MERGE_SHA', pr.mergeCommitSha)
  placeholderMap.set('AUTHOR', pr.author)
  placeholderMap.set('LABELS', [...pr.labels]?.filter(l => !l.startsWith('--rcba-'))?.join(', ') || '')
  placeholderMap.set('MILESTONE', pr.milestone || '')
  placeholderMap.set('BODY', pr.body)
  fillArrayPlaceholders(arrayPlaceholderMap, 'ASSIGNEES', pr.assignees || [])
  placeholderMap.set('ASSIGNEES', pr.assignees?.join(', ') || '')
  fillArrayPlaceholders(arrayPlaceholderMap, 'REVIEWERS', pr.requestedReviewers || [])
  placeholderMap.set('REVIEWERS', pr.requestedReviewers?.join(', ') || '')
  fillArrayPlaceholders(arrayPlaceholderMap, 'APPROVERS', pr.approvedReviewers || [])
  placeholderMap.set('APPROVERS', pr.approvedReviewers?.join(', ') || '')
  placeholderMap.set('BRANCH', pr.branch || '')
  placeholderMap.set('BASE_BRANCH', pr.baseBranch)
  return replacePlaceholders(template, arrayPlaceholderMap, placeholderMap, placeholders, placeholderPrMap, configuration)
}

function replacePlaceholders(
  template: string,
  arrayPlaceholderMap: Map<string, string> /* arrayPlaceholderKey and original value */,
  placeholderMap: Map<string, string> /* placeholderKey and original value */,
  placeholders: Map<string, Placeholder[]> /* placeholders to apply */,
  placeholderPrMap: Map<string, string[]> | undefined /* map to keep replaced placeholder values with their key */,
  configuration: Configuration
): string {
  let transformed = template

  // replace array placeholders first
  for (const [key, value] of arrayPlaceholderMap) {
    transformed = handlePlaceholder(transformed, key, value, placeholders, placeholderPrMap, configuration)
  }

  // replace traditional placeholders
  for (const [key, value] of placeholderMap) {
    transformed = handlePlaceholder(transformed, key, value, placeholders, placeholderPrMap, configuration)
  }

  return transformed
}

function handlePlaceholder(
  template: string,
  key: string,
  value: string,
  placeholders: Map<string, Placeholder[]> /* placeholders to apply */,
  placeholderPrMap: Map<string, string[]> | undefined /* map to keep replaced placeholder values with their key */,
  configuration: Configuration
): string {
  let transformed = template.replaceAll(`\${{${key}}}`, configuration.trim_values ? value.trim() : value)
  // replace custom placeholders
  const phs = placeholders.get(key)
  if (phs) {
    for (const placeholder of phs) {
      const transformer = validateTransformer(placeholder.transformer)
      if (transformer?.pattern) {
        const extractedValue = value.replace(transformer.pattern, transformer.target)
        // note: `.replace` will return the full string again if there was no match
        if (extractedValue && (extractedValue !== value || (extractedValue === value && value.match(transformer.pattern)))) {
          if (placeholderPrMap) {
            createOrSet(placeholderPrMap, placeholder.name, extractedValue)
          }
          transformed = transformed.replaceAll(
            `\${{${placeholder.name}}}`,
            configuration.trim_values ? extractedValue.trim() : extractedValue
          )

          if (core.isDebug()) {
            core.debug(`    Custom Placeholder successfully matched data - ${extractValues} (${placeholder.name})`)
          }
        } else if (core.isDebug() && extractedValue === value) {
          core.debug(`    Custom Placeholder did result in the full original value returned. Skipping. (${placeholder.name})`)
        }
      }
    }
  }
  return transformed
}

function fillArrayPlaceholders(
  placeholderMap: Map<string, string> /* placeholderKey and original value */,
  key: string,
  values: string[]
): void {
  for (let i = 0; i < values.length; i++) {
    placeholderMap.set(`\${{${key}[${i}]}}`, values[i])
  }
  placeholderMap.set(`\${{${key}[*]}}`, values.join(', '))
}

function fillReviewPlaceholders(
  placeholderMap: Map<string, string> /* placeholderKey and original value */,
  parentKey: string,
  values: CommentInfo[]
): void {
  // retrieve the keys from the CommentInfo object
  for (const childKey of Object.keys(EMPTY_COMMENT_INFO)) {
    for (let i = 0; i < values.length; i++) {
      placeholderMap.set(`\${{${parentKey}[${i}].${childKey}}}`, values[i][childKey as keyof CommentInfo]?.toLocaleString('en') || '')
    }
    placeholderMap.set(
      `\${{${parentKey}[*].${childKey}}}`,
      values.map(value => value[childKey as keyof CommentInfo]?.toLocaleString('en') || '').join(', ')
    )
  }
}

function replacePrPlaceholders(
  template: string,
  placeholderPrMap: Map<string, string[]> /* map with all pr related custom placeholder values */,
  configuration: Configuration
): string {
  let transformed = template
  for (const [key, values] of placeholderPrMap) {
    for (let i = 0; i < values.length; i++) {
      transformed = transformed.replaceAll(`\${{${key}[${i}]}}`, configuration.trim_values ? values[i].trim() : values[i])
    }
    transformed = transformed.replaceAll(`\${{${key}[*]}}`, values.join(''))
  }
  return transformed
}

function cleanupPrPlaceholders(template: string, placeholders: Map<string, Placeholder[]>): string {
  let transformed = template
  for (const [, phs] of placeholders) {
    for (const ph of phs) {
      transformed = transformed.replaceAll(new RegExp(`\\$\\{\\{${ph.name}(?:\\[.+?\\])?\\}\\}`, 'gu'), '')
    }
  }
  return transformed
}

function transform(filled: string, transformers: RegexTransformer[]): string {
  if (transformers.length === 0) {
    return filled
  }
  let transformed = filled
  for (const {target, pattern} of transformers) {
    if (pattern) {
      transformed = transformed.replace(pattern, target)
    }
  }
  return transformed
}

function validateTransformers(specifiedTransformers: Transformer[]): RegexTransformer[] {
  const transformers = specifiedTransformers || DefaultConfiguration.transformers
  return transformers
    .map(transformer => {
      return validateTransformer(transformer)
    })
    .filter(transformer => transformer?.pattern != null)
    .map(transformer => {
      return transformer as RegexTransformer
    })
}

export function validateTransformer(transformer?: Transformer): RegexTransformer | null {
  if (transformer === undefined) {
    return null
  }
  try {
    let onProperty = undefined
    let method = undefined
    let onEmpty = undefined
    if (transformer.hasOwnProperty('on_property')) {
      onProperty = (transformer as Extractor).on_property
      method = (transformer as Extractor).method
      onEmpty = (transformer as Extractor).on_empty
    }

    // legacy handling, transform single value input to array
    if (!Array.isArray(onProperty)) {
      if (onProperty !== undefined) {
        onProperty = [onProperty]
      }
    }

    return {
      pattern: new RegExp(transformer.pattern.replace('\\\\', '\\'), transformer.flags ?? 'gu'),
      target: transformer.target || '',
      onProperty,
      method,
      onEmpty
    }
  } catch (e) {
    core.warning(`⚠️ Bad replacer regex: ${transformer.pattern}`)
    return null
  }
}

function extractValues(pr: PullRequestInfo, extractor: RegexTransformer, extractor_usecase: string): string[] | null {
  if (extractor.pattern == null) {
    return null
  }

  if (extractor.onProperty !== undefined) {
    let results: string[] = []
    const list: ('title' | 'author' | 'milestone' | 'body' | 'status' | 'branch')[] = extractor.onProperty
    // eslint-disable-next-line @typescript-eslint/prefer-for-of
    for (let i = 0; i < list.length; i++) {
      const prop = list[i]
      let value: string | undefined = pr[prop]
      if (value === undefined) {
        core.warning(`⚠️ the provided property '${extractor.onProperty}' for \`${extractor_usecase}\` is not valid`)
        value = pr['body']
      }

      const values = extractValuesFromString(value, extractor)
      if (values !== null) {
        results = results.concat(values)
      }
    }
    return results
  } else {
    return extractValuesFromString(pr.body, extractor)
  }
}

function extractValuesFromString(value: string, extractor: RegexTransformer): string[] | null {
  if (extractor.pattern == null) {
    return null
  }

  if (extractor.method === 'match') {
    const lables = value.match(extractor.pattern)
    if (lables !== null && lables.length > 0) {
      return lables.map(label => label?.toLocaleLowerCase('en') || '')
    }
  } else {
    const label = value.replace(extractor.pattern, extractor.target)
    if (label !== '') {
      return [label.toLocaleLowerCase('en')]
    }
  }
  if (extractor.onEmpty !== undefined) {
    return [extractor.onEmpty.toLocaleLowerCase('en')]
  }
  return null
}
