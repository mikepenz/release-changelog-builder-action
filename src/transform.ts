import {PullRequestInfo, sortPullRequests} from './pullRequests'
import * as core from '@actions/core'
import {Category, Configuration, Transformer} from './configuration'

export function buildChangelog(
  prs: PullRequestInfo[],
  config: Configuration
): string {
  // sort to target order
  prs = sortPullRequests(prs, config.sort.toUpperCase() === 'ASC')

  const validatedTransformers = validateTransfomers(config.transformers)
  const transformedMap = new Map<PullRequestInfo, string>()
  // convert PRs to their text representation
  prs.forEach(pr => {
    transformedMap.set(
      pr,
      transform(fillTemplate(pr, config.pr_template), validatedTransformers)
    )
  })

  // bring PRs into the order of categories
  const categorized = new Map<Category, string[]>()
  config.categories.forEach(category => {
    categorized.set(category, [])
  })
  const uncategorized: string[] = []

  // bring elements in order
  transformedMap.forEach((body, pr) => {
    let matched = false

    categorized.forEach((pullRequests, category) => {
      if (haveCommonElements(category.labels, pr.labels)) {
        pullRequests.push(body)
        matched = true
      }
    })

    if (!matched) {
      uncategorized.push(body)
    }
  })

  // construct final changelog
  let changelog = ''
  categorized.forEach((pullRequests, category) => {
    if (pullRequests.length > 0) {
      changelog = `${changelog + category.title}\n\n`

      pullRequests.forEach(pr => {
        changelog = `${changelog + pr}\n`
      })

      // add space between
      changelog = `${changelog}\n`
    }
  })

  let changelogUncategorized = ''
  uncategorized.forEach(pr => {
    changelogUncategorized = `${changelogUncategorized + pr}\n`
  })

  // fill template
  let transformedChangelog = config.template
  transformedChangelog = transformedChangelog.replace(
    '${{CHANGELOG}}',
    changelog
  )
  transformedChangelog = transformedChangelog.replace(
    '${{UNCATEGORIZED}}',
    changelogUncategorized
  )
  return transformedChangelog
}

function haveCommonElements(arr1: string[], arr2: string[]): Boolean {
  return arr1.some(item => arr2.includes(item))
}

function fillTemplate(pr: PullRequestInfo, template: string): string {
  let transformed = template
  transformed = transformed.replace('${{NUMBER}}', pr.number.toString())
  transformed = transformed.replace('${{TITLE}}', pr.title)
  transformed = transformed.replace('${{URL}}', pr.htmlURL)
  transformed = transformed.replace('${{MERGED_AT}}', pr.mergedAt.toString())
  transformed = transformed.replace('${{AUTHOR}}', pr.author)
  transformed = transformed.replace('${{BODY}}', pr.body)
  return transformed
}

function transform(filled: string, transformers: RegexTransformer[]): string {
  if (transformers.length === 0) {
    return filled
  }
  let transformed = filled
  transformers.forEach(({pattern, target}) => {
    transformed = transformed.replace(pattern!!, target)
  })
  return transformed
}

function validateTransfomers(transformers: Transformer[]): RegexTransformer[] {
  return transformers
    .map(transformer => {
      try {
        return {
          pattern: new RegExp(transformer.pattern.replace('\\\\', '\\'), 'g'),
          target: transformer.target
        }
      } catch (e) {
        core.warning(`Bad replacer regex: ${transformer.pattern}`)
        return {
          pattern: null,
          target: ''
        }
      }
    })
    .filter(transformer => transformer.pattern != null)
}

interface RegexTransformer {
  pattern: RegExp | null
  target: string
}
