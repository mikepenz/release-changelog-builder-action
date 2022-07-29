import * as core from '@actions/core'
import {Category, DefaultConfiguration, Extractor, Transformer} from './configuration'
import {PullRequestInfo, sortPullRequests} from './pullRequests'
import {ReleaseNotesOptions} from './releaseNotes'
import {DiffInfo} from './commits'

export function buildChangelog(diffInfo: DiffInfo, prs: PullRequestInfo[], options: ReleaseNotesOptions): string {
  // sort to target order
  const config = options.configuration
  const sort = config.sort || DefaultConfiguration.sort
  prs = sortPullRequests(prs, sort)
  core.info(`ℹ️ Sorted all pull requests ascending: ${sort}`)

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

  const validatedTransformers = validateTransformers(config.transformers)
  const transformedMap = new Map<PullRequestInfo, string>()
  // convert PRs to their text representation
  for (const pr of prs) {
    transformedMap.set(
      pr,
      transform(fillTemplate(pr, config.pr_template || DefaultConfiguration.pr_template), validatedTransformers)
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
            core.debug(
              `PR ${prNum} with labels: ${prLabels} excluded from category via exclude label: ${excludeLabels}`
            )
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
  let transformedChangelog = config.template || DefaultConfiguration.template
  transformedChangelog = transformedChangelog.replace(/\${{CHANGELOG}}/g, changelog)
  transformedChangelog = transformedChangelog.replace(/\${{UNCATEGORIZED}}/g, changelogUncategorized)
  transformedChangelog = transformedChangelog.replace(/\${{OPEN}}/g, changelogOpen)
  transformedChangelog = transformedChangelog.replace(/\${{IGNORED}}/g, changelogIgnored)

  // fill other placeholders
  transformedChangelog = transformedChangelog.replace(/\${{CATEGORIZED_COUNT}}/g, categorizedPrs.length.toString())
  transformedChangelog = transformedChangelog.replace(/\${{UNCATEGORIZED_COUNT}}/g, uncategorizedPrs.length.toString())
  transformedChangelog = transformedChangelog.replace(/\${{OPEN_COUNT}}/g, openPrs.length.toString())
  transformedChangelog = transformedChangelog.replace(/\${{IGNORED_COUNT}}/g, ignoredPrs.length.toString())
  // code change placeholders
  transformedChangelog = transformedChangelog.replace(/\${{CHANGED_FILES}}/g, diffInfo.changedFiles.toString())
  transformedChangelog = transformedChangelog.replace(/\${{ADDITIONS}}/g, diffInfo.additions.toString())
  transformedChangelog = transformedChangelog.replace(/\${{DELETIONS}}/g, diffInfo.deletions.toString())
  transformedChangelog = transformedChangelog.replace(/\${{CHANGES}}/g, diffInfo.changes.toString())
  transformedChangelog = transformedChangelog.replace(/\${{COMMITS}}/g, diffInfo.commits.toString())
  transformedChangelog = fillAdditionalPlaceholders(transformedChangelog, options)

  core.info(`ℹ️ Filled template`)
  return transformedChangelog
}

export function fillAdditionalPlaceholders(text: string, options: ReleaseNotesOptions): string {
  let transformed = text
  // repository placeholders
  transformed = transformed.replace(/\${{OWNER}}/g, options.owner)
  transformed = transformed.replace(/\${{REPO}}/g, options.repo)
  transformed = transformed.replace(/\${{FROM_TAG}}/g, options.fromTag.name)
  transformed = transformed.replace(/\${{FROM_TAG_DATE}}/g, options.fromTag.date?.toISOString() || '')
  transformed = transformed.replace(/\${{TO_TAG}}/g, options.toTag.name)
  transformed = transformed.replace(/\${{TO_TAG_DATE}}/g, options.toTag.date?.toISOString() || '')
  const fromDate = options.fromTag.date
  const toDate = options.toTag.date
  if (fromDate !== undefined && toDate !== undefined) {
    transformed = transformed.replace(/\${{DAYS_SINCE}}/g, toDate.diff(fromDate, 'days').toString() || '')
  } else {
    transformed = transformed.replace(/\${{DAYS_SINCE}}/g, '')
  }
  transformed = transformed.replace(
    /\${{RELEASE_DIFF}}/g,
    `https://github.com/${options.owner}/${options.repo}/compare/${options.fromTag.name}...${options.toTag.name}`
  )
  return transformed
}

function haveCommonElements(arr1: string[], arr2: Set<string>): Boolean {
  return arr1.some(item => arr2.has(item))
}

function haveEveryElements(arr1: string[], arr2: Set<string>): Boolean {
  return arr1.every(item => arr2.has(item))
}

function fillTemplate(pr: PullRequestInfo, template: string): string {
  let transformed = template
  transformed = transformed.replace(/\${{NUMBER}}/g, pr.number.toString())
  transformed = transformed.replace(/\${{TITLE}}/g, pr.title)
  transformed = transformed.replace(/\${{URL}}/g, pr.htmlURL)
  transformed = transformed.replace(/\${{STATUS}}/g, pr.status)
  transformed = transformed.replace(/\${{CREATED_AT}}/g, pr.createdAt.toISOString())
  transformed = transformed.replace(/\${{MERGED_AT}}/g, pr.mergedAt?.toISOString() || '')
  transformed = transformed.replace(/\${{MERGE_SHA}}/g, pr.mergeCommitSha)
  transformed = transformed.replace(/\${{AUTHOR}}/g, pr.author)
  transformed = transformed.replace(
    /\${{LABELS}}/g,
    [...pr.labels]?.filter(l => !l.startsWith('--rcba-'))?.join(', ') || ''
  )
  transformed = transformed.replace(/\${{MILESTONE}}/g, pr.milestone || '')
  transformed = transformed.replace(/\${{BODY}}/g, pr.body)
  transformed = transformed.replace(/\${{ASSIGNEES}}/g, pr.assignees?.join(', ') || '')
  transformed = transformed.replace(/\${{REVIEWERS}}/g, pr.requestedReviewers?.join(', ') || '')
  transformed = transformed.replace(/\${{APPROVERS}}/g, pr.approvedReviewers?.join(', ') || '')
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
      return lables.map(label => label.toLocaleLowerCase('en'))
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

export interface RegexTransformer {
  pattern: RegExp | null
  target: string
  onProperty?: ('title' | 'author' | 'milestone' | 'body' | 'status' | 'branch')[] | undefined
  method?: 'replace' | 'match' | undefined
  onEmpty?: string | undefined
}
