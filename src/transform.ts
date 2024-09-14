import * as core from '@actions/core'
import {Category, Configuration, Placeholder, PlaceholderGroup, Property} from './configuration'
import {createOrSet, groupPlaceholders, haveCommonElementsArr, haveEveryElementsArr, mergeMaps} from './utils'
import {
  CommentInfo,
  EMPTY_COMMENT_INFO,
  EMPTY_PULL_REQUEST_INFO,
  PullRequestData,
  PullRequestInfo,
  retrieveProperty,
  sortPullRequests
} from './pr-collector/pullRequests'
import {DiffInfo} from './pr-collector/commits'
import {transformStringToOptionalValue, transformStringToValues, validateRegex} from './pr-collector/regexUtils'
import {ChangelogStrings, GroupedTemplateContext, PrStrings, Regex, RegexTransformer, TemplateContext} from './pr-collector/types'
import {ReleaseNotesOptions} from './releaseNotesBuilder'
import {matchesRules} from './regexUtils'

let CLEAR = false

export function clear(): void {
  CLEAR = true
}

export function buildChangelog(diffInfo: DiffInfo, origPrs: PullRequestInfo[], options: ReleaseNotesOptions): string {
  core.startGroup('📦 Build changelog')

  let prs: PullRequestData[] = origPrs
  if (prs.length === 0) {
    core.warning(`⚠️ No pull requests found`)
    const result = renderEmptyChangelogTemplate(options.configuration.empty_template, options)
    core.endGroup()
    return result
  }

  // sort to target order
  const config = options.configuration
  const sort = config.sort
  prs = sortPullRequests(prs, sort)
  core.info(`ℹ️ Sorted all pull requests ascending: ${JSON.stringify(sort)}`)

  // establish parent child PR relations
  if (config.reference !== undefined) {
    const reference = validateRegex(config.reference)
    if (reference !== null) {
      core.info(`ℹ️ Identifying PR references using \`reference\``)

      const mapped = new Map<number, PullRequestData>()
      for (const pr of prs) {
        mapped.set(pr.number, pr)
      }

      const remappedPrs: PullRequestData[] = []
      for (const pr of prs) {
        const extracted = extractValues(pr, reference, 'reference')
        if (extracted !== null && extracted.length > 0) {
          const foundNumber = parseInt(extracted[0])
          const valid = !isNaN(foundNumber)
          const parent = mapped.get(foundNumber)
          if (valid && parent !== undefined) {
            if (parent.childPrs === undefined) {
              parent.childPrs = []
            }
            parent.childPrs.push(pr)
          } else {
            if (!valid) core.debug(`⚠️ Extracted reference 'isNaN': ${extracted}`)
            remappedPrs.push(pr)
          }
        } else {
          remappedPrs.push(pr)
        }
      }
      prs = remappedPrs
    } else {
      core.warning(`⚠️ Configured \`reference\` invalid.`)
    }
  }

  // drop duplicate pull requests
  if (config.duplicate_filter !== undefined) {
    const extractor = validateRegex(config.duplicate_filter)
    if (extractor !== null) {
      core.info(`ℹ️ Remove duplicated pull requests using \`duplicate_filter\``)

      const deduplicatedMap = new Map<string, PullRequestInfo>()
      const unmatched: PullRequestInfo[] = []
      for (const pr of prs) {
        const extracted = extractValues(pr, extractor, 'duplicate_filter')
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
          pr.labels.push(label)
        }
        if (core.isDebug()) {
          core.debug(`    Extracted the following labels (${JSON.stringify(extracted)}) for PR ${pr.number}`)
        }
      }
    }
  }

  const groupedPlaceholders = groupPlaceholders(config.custom_placeholders || [])

  const customPlaceholdersTemplateContext = new GroupedTemplateContext()

  const validatedTransformers = validateTransformers(config.transformers)

  core.info(`ℹ️ Used ${validatedTransformers.length} transformers to adjust message`)

  for (const pr of prs) {
    const prAsObject = pr as unknown as Record<string, unknown>
    transformObject(prAsObject, validatedTransformers)
  }

  const includePrs = options.mode === 'PR' || options.mode === 'HYBRID'
  const includeCommits = options.mode === 'COMMIT' || options.mode === 'HYBRID'

  // convert PRs to their text representation
  const realPrs = includePrs ? prs.filter(x => !x.isConvertedFromCommit) : []
  const commitPrs = includeCommits ? prs.filter(x => x.isConvertedFromCommit) : []

  if (includePrs) {
    core.info(`✒️ Wrote messages for ${prs.length} pull requests`)
  }

  if (includeCommits) {
    core.info(`✒️ Wrote messages for ${commitPrs.length} commits`)
  }

  const prInfoMap = buildInfoMapAndCollectPlaceholderContext(
    realPrs,
    config.pr_template,
    groupedPlaceholders,
    customPlaceholdersTemplateContext,
    config
  )

  const commitInfoMap = buildInfoMapAndCollectPlaceholderContext(
    commitPrs,
    config.commit_template,
    groupedPlaceholders,
    customPlaceholdersTemplateContext,
    config
  )

  // If the mode is not HYBRID, the map will contain only one or the other map
  const combinedInfoMap = mergeMaps(prInfoMap, commitInfoMap)

  // bring PRs into the order of categories
  const categories = config.categories
  const flatCategories = flatten(config.categories)

  // set-up the category object
  for (const category of flatCategories) {
    if (CLEAR || !category.entries) {
      category.entries = []
    }
  }

  const prStrings = buildPrStringsAndFillCategoryEntires(combinedInfoMap, config.ignore_labels, categories, flatCategories)
  core.info(`ℹ️ Ordered all pull requests into ${categories.length} categories`)

  // serialize and provide the categorized content as json
  const transformedCategorized = buildCategorizedOutput(flatCategories, config)
  core.setOutput('categorized', JSON.stringify(transformedCategorized))

  // construct final changelog
  const changelogStrings = buildChangelogStrings(flatCategories, prStrings)

  core.info(`✒️ Wrote ${changelogStrings.categorized.length} categorized pull requests down`)
  core.info(`✒️ Wrote ${changelogStrings.uncategorized.length} non categorized pull requests down`)
  core.info(`✒️ Wrote ${changelogStrings.open.length} open pull requests down`)
  core.info(`✒️ Wrote ${changelogStrings.ignored.length} ignored pull requests down`)

  core.setOutput('categorized_prs', changelogStrings.categorized.length)
  core.setOutput('uncategorized_prs', changelogStrings.uncategorized.length)
  core.setOutput('open_prs', changelogStrings.open.length)
  core.setOutput('ignored_prs', changelogStrings.ignored.length)

  // collect all contributors
  const contributorsSet: Set<string> = new Set(prs.map(pr => `@${pr.author}`))
  const contributorsArray = Array.from(contributorsSet)
  const contributorsString = contributorsArray.join(', ')
  const externalContributorString = contributorsArray.filter(value => value !== options.owner).join(', ')
  core.setOutput('contributors', JSON.stringify(contributorsSet))

  const releaseNotesTemplateContext = buildReleaseNotesTemplateContext(
    changelogStrings,
    contributorsString,
    externalContributorString,
    prStrings,
    diffInfo,
    options
  )

  let renderedReleaseNotesTemplate = renderTemplateAndCollectPlaceholderContext(
    config.template,
    releaseNotesTemplateContext,
    groupedPlaceholders,
    customPlaceholdersTemplateContext,
    config
  )

  renderedReleaseNotesTemplate = renderTemplateWithContext(renderedReleaseNotesTemplate, customPlaceholdersTemplateContext, config)
  renderedReleaseNotesTemplate = cleanupPrPlaceholders(renderedReleaseNotesTemplate, groupedPlaceholders)
  renderedReleaseNotesTemplate = cleanupPlaceholders(renderedReleaseNotesTemplate)

  core.info(`ℹ️ Filled template`)
  core.endGroup()

  return renderedReleaseNotesTemplate
}

function buildInfoMapAndCollectPlaceholderContext(
  prData: PullRequestData[],
  template: string,
  groupedPlaceholders: Map<string, Placeholder[]>,
  customPlaceholdersTemplateContext: GroupedTemplateContext,
  config: Configuration
): Map<PullRequestInfo, string> {
  const infoMap = new Map<PullRequestInfo, string>()

  for (const pr of prData) {
    const [prTemplateContext, prArrayTemplateContext] = buildPrTemplateContext(pr)

    let renderedPrTemplate = template

    renderedPrTemplate = renderTemplateAndCollectPlaceholderContext(
      renderedPrTemplate,
      prArrayTemplateContext,
      groupedPlaceholders,
      customPlaceholdersTemplateContext,
      config
    )

    renderedPrTemplate = renderTemplateAndCollectPlaceholderContext(
      renderedPrTemplate,
      prTemplateContext,
      groupedPlaceholders,
      customPlaceholdersTemplateContext,
      config
    )

    infoMap.set(pr, renderedPrTemplate)
  }

  return infoMap
}

function buildPrStringsAndFillCategoryEntires(
  prInfoMap: Map<PullRequestInfo, string>,
  ignoredLabels: string[],
  categories: Category[],
  flatCategories: Category[]
): PrStrings {
  const categorizedPrs: string[] = []
  const ignoredPrs: string[] = []
  const openPrs: string[] = []
  const uncategorizedPrs: string[] = []

  // bring elements in order
  prLoop: for (const [pr, body] of prInfoMap) {
    if (
      haveCommonElementsArr(
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

    let matchedOnce = false // in case we matched once at least, the PR can't be uncategorized
    for (const category of categories) {
      const [matched, consumed] = recursiveCategorizePr(category, pr, body)
      if (consumed) {
        continue prLoop
      }
      matchedOnce = matchedOnce || matched
    }

    if (!matchedOnce) {
      // we allow to have pull requests included in an "uncategorized" category
      for (const category of flatCategories) {
        category.entries = category.entries || []
        if ((category.labels === undefined || category.labels.length === 0) && category.rules === undefined) {
          // check if any exclude label matches for the "uncategorized" category
          if (category.exclude_labels !== undefined) {
            if (
              !haveCommonElementsArr(
                category.exclude_labels.map(lbl => lbl.toLocaleLowerCase('en')),
                pr.labels
              )
            ) {
              category.entries.push(body)
            } else if (core.isDebug()) {
              const excludeLabels = JSON.stringify(category.exclude_labels)
              core.debug(
                `    PR ${pr.number} with labels: ${pr.labels} excluded from uncategorized category via exclude label: ${excludeLabels}`
              )
            }
          } else {
            category.entries.push(body)
          }

          break
        }
      }

      // note the `exclude label` configuration of categories will not apply to the legacy "UNCATEGORIZED" placeholder
      uncategorizedPrs.push(body)
    } else {
      categorizedPrs.push(body)
    }
  }

  const prStrings: PrStrings = {
    categorizedList: categorizedPrs,
    uncategorizedList: uncategorizedPrs,
    openList: openPrs,
    ignoredList: ignoredPrs
  }

  return prStrings
}

function buildChangelogStrings(flatCategories: Category[], prStrings: PrStrings): ChangelogStrings {
  const {categorizedList, uncategorizedList, openList, ignoredList} = prStrings

  let changelogCategorized = ''
  for (const category of flatCategories) {
    const pullRequests = category.entries || []
    changelogCategorized += buildCategorizedChangelogString(category, pullRequests)
  }
  if (core.isDebug()) {
    for (const pr of categorizedList) {
      core.debug(`    ${pr}`)
    }
  }

  let changelogUncategorized = ''
  for (const pr of uncategorizedList) {
    changelogUncategorized = `${changelogUncategorized + pr}\n`
  }
  if (core.isDebug()) {
    for (const pr of uncategorizedList) {
      core.debug(`    ${pr}`)
    }
  }

  let changelogOpen = ''
  if (openList.length > 0) {
    for (const pr of openList) {
      changelogOpen = `${changelogOpen + pr}\n`
    }
    if (core.isDebug()) {
      for (const pr of openList) {
        core.debug(`    ${pr}`)
      }
    }
  }

  let changelogIgnored = ''
  for (const pr of ignoredList) {
    changelogIgnored = `${changelogIgnored + pr}\n`
  }
  if (core.isDebug()) {
    for (const pr of ignoredList) {
      core.debug(`    ${pr}`)
    }
  }

  const changelogStrings: ChangelogStrings = {
    categorized: changelogCategorized,
    uncategorized: changelogUncategorized,
    open: changelogOpen,
    ignored: changelogIgnored
  }

  return changelogStrings
}

function buildReleaseNotesTemplateContext(
  changelogStrings: ChangelogStrings,
  contributorsString: string,
  externalContributorString: string,
  prStrings: PrStrings,
  diffInfo: DiffInfo,
  options: ReleaseNotesOptions
): TemplateContext {
  const {
    categorized: changelogCategorized,
    uncategorized: changelogUncategorized,
    open: changelogOpen,
    ignored: changelogIgnored
  } = changelogStrings

  const {categorizedList, uncategorizedList, openList, ignoredList} = prStrings

  let releaseNotesTemplateContext = new TemplateContext()

  releaseNotesTemplateContext.set('CHANGELOG', changelogCategorized)
  releaseNotesTemplateContext.set('UNCATEGORIZED', changelogUncategorized)
  releaseNotesTemplateContext.set('OPEN', changelogOpen)
  releaseNotesTemplateContext.set('IGNORED', changelogIgnored)
  // fill special collected contributors
  releaseNotesTemplateContext.set('CONTRIBUTORS', contributorsString)
  releaseNotesTemplateContext.set('EXTERNAL_CONTRIBUTORS', externalContributorString)
  // fill other placeholders
  releaseNotesTemplateContext.set('CATEGORIZED_COUNT', categorizedList.length.toString())
  releaseNotesTemplateContext.set('UNCATEGORIZED_COUNT', uncategorizedList.length.toString())
  releaseNotesTemplateContext.set('OPEN_COUNT', openList.length.toString())
  releaseNotesTemplateContext.set('IGNORED_COUNT', ignoredList.length.toString())
  // code change placeholders
  releaseNotesTemplateContext.set('CHANGED_FILES', diffInfo.changedFiles.toString())
  releaseNotesTemplateContext.set('ADDITIONS', diffInfo.additions.toString())
  releaseNotesTemplateContext.set('DELETIONS', diffInfo.deletions.toString())
  releaseNotesTemplateContext.set('CHANGES', diffInfo.changes.toString())
  releaseNotesTemplateContext.set('COMMITS', diffInfo.commits.toString())

  const coreReleasesNotesContext = buildCoreReleaseNotesTemplateContext(options)

  releaseNotesTemplateContext = mergeMaps(releaseNotesTemplateContext, coreReleasesNotesContext)

  return releaseNotesTemplateContext
}

function buildCategorizedOutput(flatCategories: Category[], config: Configuration): Record<string, string[]> {
  const transformedCategorized = {}

  for (const category of flatCategories) {
    let entries = category.entries

    if (entries?.length === 0) {
      const includeEmptyContent = config.categorized_include_empty_content && category.empty_content?.trim() !== ''

      if (includeEmptyContent) {
        entries = [category.empty_content ?? '']
      }
    }

    Object.assign(transformedCategorized, {[category.key || category.title]: category.entries})
  }

  return transformedCategorized
}

function recursiveCategorizePr(category: Category, pr: PullRequestInfo, body: string): boolean[] {
  let matched = false
  let consumed = false

  const matchesParent = categorizePr(category, pr)

  // only do children if parent also matches
  if (category.categories && matchesParent) {
    for (const childCategory of category.categories) {
      const [childMatched, childConsumed] = recursiveCategorizePr(childCategory, pr, body)
      matched = matched || childMatched // at least one time it matched
      consumed = childConsumed
    }
  }

  // if consumed we don't handle it anymore, as it was matched in a child, don't handle anymore
  if (!consumed && !matched) {
    category.entries = category.entries || []

    matched = matchesParent
    if (matched) {
      category.entries.push(body) // if matched add the PR to the list
    }
  }
  if (matched && category.consume) {
    consumed = true
  }
  return [matched, consumed]
}

function categorizePr(category: Category, pr: PullRequestInfo): boolean {
  let matched = false // check if we matched within the given category
  // check if any exclude label matches
  if (category.exclude_labels !== undefined) {
    if (
      haveCommonElementsArr(
        category.exclude_labels.map(lbl => lbl.toLocaleLowerCase('en')),
        pr.labels
      )
    ) {
      if (core.isDebug()) {
        const excludeLabels = JSON.stringify(category.exclude_labels)
        core.debug(`    PR ${pr.number} with labels: ${pr.labels} excluded from category via exclude label: ${excludeLabels}`)
      }
      return false // one of the exclude labels matched, skip the PR for this category
    }
  }

  // in case we have exhaustive matching enabled, and have labels and/or rules
  // validate for an exhaustive match (e.g. every provided rule applies)
  if (category.exhaustive === true && (category.labels !== undefined || category.rules !== undefined)) {
    if (category.labels !== undefined) {
      matched = haveEveryElementsArr(
        category.labels.map(lbl => lbl.toLocaleLowerCase('en')),
        pr.labels
      )
    }
    let exhaustive_rules = true
    if (category.exhaustive_rules !== undefined) {
      exhaustive_rules = category.exhaustive_rules
    }
    if ((matched || category.labels === undefined) && category.rules !== undefined) {
      matched = matchesRules(category.rules, pr, exhaustive_rules)
    }
  } else {
    // if not exhaustive, do individual matches
    if (category.labels !== undefined) {
      // check if either any of the labels applies
      matched = haveCommonElementsArr(
        category.labels.map(lbl => lbl.toLocaleLowerCase('en')),
        pr.labels
      )
    }
    let exhaustive_rules = false
    if (category.exhaustive_rules !== undefined) {
      exhaustive_rules = category.exhaustive_rules
    }
    if (!matched && category.rules !== undefined) {
      // if no label did apply, check if any rule applies
      matched = matchesRules(category.rules, pr, exhaustive_rules)
    }
  }
  return matched
}

function buildCategorizedChangelogString(category: Category, pullRequests: string[]): string {
  let categorizedString = ''

  if (pullRequests.length > 0 || hasChildWithEntries(category)) {
    if (category.title) {
      categorizedString = `${categorizedString + category.title}\n\n`
    }

    for (const pr of pullRequests) {
      categorizedString = `${categorizedString + pr}\n`
    }
    categorizedString = `${categorizedString}\n` // add space between sections
  } else if (category.empty_content !== undefined) {
    if (category.title) {
      categorizedString = `${categorizedString + category.title}\n\n`
    }
    categorizedString = `${categorizedString + category.empty_content}\n\n`
  }
  return categorizedString
}

export function renderEmptyChangelogTemplate(template: string, options: ReleaseNotesOptions): string {
  const placeholders = new Map<string, Placeholder[]>()
  for (const ph of options.configuration.custom_placeholders || []) {
    createOrSet(placeholders, ph.source, ph)
  }

  const releaseNotesTemplateContext = buildCoreReleaseNotesTemplateContext(options)

  const renderedEmptyChangelogTemplate = renderTemplateAndCollectPlaceholderContext(
    template,
    releaseNotesTemplateContext,
    placeholders,
    undefined,
    options.configuration
  )

  return renderedEmptyChangelogTemplate
}

function buildCoreReleaseNotesTemplateContext(options: ReleaseNotesOptions): TemplateContext {
  const templateContext = new TemplateContext()

  templateContext.set('OWNER', options.owner)
  templateContext.set('REPO', options.repo)
  templateContext.set('FROM_TAG', options.fromTag.name)
  templateContext.set('FROM_TAG_DATE', options.fromTag.date?.toISOString() || '')
  templateContext.set('TO_TAG', options.toTag.name)
  templateContext.set('TO_TAG_DATE', options.toTag.date?.toISOString() || '')
  const fromDate = options.fromTag.date
  const toDate = options.toTag.date
  if (fromDate !== undefined && toDate !== undefined) {
    templateContext.set('DAYS_SINCE', toDate.diff(fromDate, 'days').toString() || '')
  } else {
    templateContext.set('DAYS_SINCE', '')
  }
  templateContext.set(
    'RELEASE_DIFF',
    `${options.repositoryUtils.homeUrl}/${options.owner}/${options.repo}/compare/${options.fromTag.name}...${options.toTag.name}`
  )

  return templateContext
}

function buildPrTemplateContext(pr: PullRequestData): [TemplateContext, TemplateContext] {
  const prTemplateContext = new TemplateContext()

  prTemplateContext.set('NUMBER', pr.number.toString())
  prTemplateContext.set('TITLE', pr.title)
  prTemplateContext.set('URL', pr.htmlURL)
  prTemplateContext.set('STATUS', pr.status)
  prTemplateContext.set('CREATED_AT', pr.createdAt.toISOString())
  prTemplateContext.set('MERGED_AT', pr.mergedAt?.toISOString() || '')
  prTemplateContext.set('MERGE_SHA', pr.mergeCommitSha)
  prTemplateContext.set('AUTHOR', pr.author)
  prTemplateContext.set('AUTHOR_NAME', pr.authorName || '')
  prTemplateContext.set('LABELS', [...pr.labels]?.filter(l => !l.startsWith('--rcba-'))?.join(', ') || '')
  prTemplateContext.set('MILESTONE', pr.milestone || '')
  prTemplateContext.set('BODY', pr.body)
  prTemplateContext.set('ASSIGNEES', pr.assignees?.join(', ') || '')
  prTemplateContext.set('REVIEWERS', pr.requestedReviewers?.join(', ') || '')
  prTemplateContext.set('APPROVERS', pr.approvedReviewers?.join(', ') || '')
  prTemplateContext.set('BRANCH', pr.branch || '')
  prTemplateContext.set('BASE_BRANCH', pr.baseBranch)

  const prArrayTemplateContext = new TemplateContext()
  fillReviewPlaceholders(prArrayTemplateContext, 'REVIEWS', pr.reviews || [])
  fillChildPrPlaceholders(prArrayTemplateContext, 'REFERENCED', pr.childPrs || [])
  fillArrayPlaceholders(prArrayTemplateContext, 'ASSIGNEES', pr.assignees || [])
  fillArrayPlaceholders(prArrayTemplateContext, 'REVIEWERS', pr.requestedReviewers || [])
  fillArrayPlaceholders(prArrayTemplateContext, 'APPROVERS', pr.approvedReviewers || [])

  return [prTemplateContext, prArrayTemplateContext]
}

function renderTemplateAndCollectPlaceholderContext(
  template: string,
  templateContext: TemplateContext /* placeholderKey and original value */,
  customPlaceholders: PlaceholderGroup /* placeholders to apply */,
  customPlaceholdersTemplateContext: GroupedTemplateContext | undefined /* map to keep replaced placeholder values with their key */,
  configuration: Configuration
): string {
  let transformed = template

  const trimValues = configuration.trim_values
  // replace traditional placeholders
  for (const [key, value] of templateContext) {
    transformed = transformed.replaceAll(`#{{${key}}}`, trimValues ? value.trim() : value)

    const extractedValues = extractPlaceholderValuesAndCollectPlaceholderContext(
      key,
      value,
      customPlaceholders,
      customPlaceholdersTemplateContext
    )

    for (const [placeholderName, extractedValue] of extractedValues) {
      transformed = transformed.replaceAll(`#{{${placeholderName}}}`, trimValues ? extractedValue.trim() : extractedValue)
    }
  }

  return transformed
}

function extractPlaceholderValuesAndCollectPlaceholderContext(
  key: string,
  value: string,
  customPlaceholders: PlaceholderGroup,
  customPlaceholdersTemplateContext: GroupedTemplateContext | undefined
): TemplateContext {
  // Replace custom placeholders
  const placeholdersForKey = customPlaceholders.get(key)

  const extractedValues = new TemplateContext()

  if (!placeholdersForKey) {
    return extractedValues
  }

  for (const placeholder of placeholdersForKey) {
    const extractedValue = extractTransformedValue(value, placeholder)

    if (extractedValue) {
      extractedValues.set(placeholder.name, extractedValue)

      if (customPlaceholdersTemplateContext) {
        createOrSet(customPlaceholdersTemplateContext, placeholder.name, extractedValue)
      }
    }
  }

  return extractedValues
}

function extractTransformedValue(value: string, placeholder: Placeholder): string | undefined {
  const transformer = validateRegex(placeholder.transformer)

  if (!transformer?.pattern) {
    return undefined
  }

  const extractedValue = transformStringToOptionalValue(value, transformer)

  if (extractedValue && ((transformer.method && transformer.method !== 'replace') || extractedValue !== value)) {
    if (core.isDebug()) {
      core.debug(`    Custom Placeholder successfully matched data - ${extractedValue} (${placeholder.name})`)
    }
    return extractedValue
  }

  if (core.isDebug() && extractedValue === value) {
    core.debug(`    Custom Placeholder did result in the full original value returned. Skipping. (${placeholder.name})`)
  }

  return undefined
}

function fillArrayPlaceholders(
  placeholderMap: TemplateContext /* placeholderKey and original value */,
  key: string,
  values: string[]
): void {
  if (values.length === 0) return
  for (let i = 0; i < values.length; i++) {
    placeholderMap.set(`${key}[${i}]`, values[i])
  }
  placeholderMap.set(`${key}[*]`, values.join(', '))
}

function fillReviewPlaceholders(
  placeholderMap: TemplateContext /* placeholderKey and original value */,
  parentKey: string,
  values: CommentInfo[]
): void {
  if (values.length === 0) return
  // retrieve the keys from the CommentInfo object
  for (const childKey of Object.keys(EMPTY_COMMENT_INFO)) {
    for (let i = 0; i < values.length; i++) {
      placeholderMap.set(`${parentKey}[${i}].${childKey}`, values[i][childKey as keyof CommentInfo]?.toLocaleString('en') || '')
    }
    placeholderMap.set(
      `${parentKey}[*].${childKey}`,
      values.map(value => value[childKey as keyof CommentInfo]?.toLocaleString('en') || '').join(', ')
    )
  }
}

function fillChildPrPlaceholders(
  placeholderMap: TemplateContext /* placeholderKey and original value */,
  parentKey: string,
  values: PullRequestInfo[]
): void {
  if (values.length === 0) return
  // retrieve the keys from the PullRequestInfo object
  for (const childKey of Object.keys(EMPTY_PULL_REQUEST_INFO)) {
    for (let i = 0; i < values.length; i++) {
      placeholderMap.set(`${parentKey}[${i}].${childKey}`, values[i][childKey as keyof PullRequestInfo]?.toLocaleString('en') || '')
    }
    placeholderMap.set(
      `${parentKey}[*].${childKey}`,
      values.map(value => value[childKey as keyof PullRequestInfo]?.toLocaleString('en') || '').join(', ')
    )
  }
}

function renderTemplateWithContext(
  template: string,
  templateContext: GroupedTemplateContext /* map with all pr related custom placeholder values */,
  configuration: Configuration
): string {
  let transformed = template
  for (const [key, values] of templateContext) {
    for (let i = 0; i < values.length; i++) {
      transformed = transformed.replaceAll(`#{{${key}[${i}]}}`, configuration.trim_values ? values[i].trim() : values[i])
    }
    transformed = transformed.replaceAll(`#{{${key}[*]}}`, values.join(''))
  }
  return transformed
}

function cleanupPrPlaceholders(template: string, placeholders: PlaceholderGroup): string {
  let transformed = template
  for (const [, phs] of placeholders) {
    for (const ph of phs) {
      transformed = transformed.replaceAll(new RegExp(`#\\{\\{${ph.name}(?:\\[.+?\\])?\\}\\}`, 'gu'), '')
    }
  }
  return transformed
}

function cleanupPlaceholders(template: string): string {
  let transformed = template
  for (const phs of ['REVIEWS', 'REFERENCED', 'ASSIGNEES', 'REVIEWERS', 'APPROVERS']) {
    transformed = transformed.replaceAll(new RegExp(`#\\{\\{${phs}\\[.+?\\]\\..*?\\}\\}`, 'gu'), '')
  }
  return transformed
}

function transformObject(obj: Record<string, unknown>, transformers: RegexTransformer[]): void {
  for (const [key, value] of Object.entries(obj)) {
    if (value === undefined) {
      continue
    }
    if (Array.isArray(value)) {
      if (value.every(item => typeof item === 'string')) {
        // If the array contains only strings, apply the transformation to each string
        obj[key] = value.map(item => transform(item, transformers))
      } else {
        // If the array contains objects, recursively apply the transformation to each object
        for (const child of value) {
          transformObject(child as Record<string, unknown>, transformers)
        }
      }
    } else if (typeof value === 'string') {
      obj[key] = transform(value, transformers)
    }
  }
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

function validateTransformers(specifiedTransformers: Regex[]): RegexTransformer[] {
  const transformers = specifiedTransformers
  return transformers
    .map(transformer => {
      return validateRegex(transformer)
    })
    .filter(transformer => transformer?.pattern != null)
    .map(transformer => {
      return transformer as RegexTransformer
    })
}

function extractValues(pr: PullRequestInfo, extractor: RegexTransformer, extractor_usecase: string): string[] | null {
  if (extractor.pattern == null) {
    return null
  }

  if (extractor.onProperty !== undefined) {
    let results: string[] = []
    const list: Property[] = extractor.onProperty
    // eslint-disable-next-line @typescript-eslint/prefer-for-of
    for (let i = 0; i < list.length; i++) {
      const prop = list[i]
      const value = retrieveProperty(pr, prop, extractor_usecase)
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
  const transformed = transformStringToValues(value, extractor)
  if (transformed) {
    return transformed.map(val => val?.toLocaleLowerCase('en') || '')
  } else {
    return null
  }
}

function flatten(categories?: Category[]): Category[] {
  if (!categories) {
    return []
  }
  return categories.reduce(function (r: Category[], i) {
    return r.concat([i]).concat(flatten(i.categories))
  }, [])
}

function hasChildWithEntries(category: Category): boolean {
  const categories = category.categories
  if (!categories || categories.length === 0) {
    return (category.entries?.length || 0) > 0
  }
  let hasEntries = false
  for (const cat of categories) {
    hasEntries = hasEntries || hasChildWithEntries(cat)
  }
  return hasEntries
}
