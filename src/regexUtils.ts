import * as core from '@actions/core'
import {Extractor, Property, Regex, Rule, Transformer} from './configuration'
import {PullRequestInfo, retrieveProperty} from './pullRequests'

/**
 * Checks if any of the rules match the given PR
 */
export function matchesRules(rules: Rule[], pr: PullRequestInfo, exhaustive: Boolean): Boolean {
  const transformers: RegexTransformer[] = rules.map(rule => validateTransformer(rule)).filter(t => t !== null) as RegexTransformer[]
  if (exhaustive) {
    return transformers.every(transformer => {
      return matches(pr, transformer, 'rule')
    })
  } else {
    return transformers.some(transformer => {
      return matches(pr, transformer, 'rule')
    })
  }
}

/**
 * Checks if the configured property results in a positive `test` with the regex.
 */
function matches(pr: PullRequestInfo, extractor: RegexTransformer, extractor_usecase: string): boolean {
  if (extractor.pattern == null) {
    return false
  }

  if (extractor.onProperty !== undefined && extractor.onProperty.length === 1) {
    const prop = extractor.onProperty[0]
    const value = retrieveProperty(pr, prop, extractor_usecase)
    return extractor.pattern.test(value)
  }
  return false
}

export function validateTransformer(transformer?: Regex): RegexTransformer | null {
  if (transformer === undefined) {
    return null
  }
  try {
    let target = undefined
    if (transformer.hasOwnProperty('target')) {
      target = (transformer as Transformer).target
    }

    let onProperty = undefined
    let method = undefined
    let onEmpty = undefined
    if (transformer.hasOwnProperty('method')) {
      method = (transformer as Extractor).method
      onEmpty = (transformer as Extractor).on_empty
      onProperty = (transformer as Extractor).on_property
    } else if (transformer.hasOwnProperty('on_property')) {
      onProperty = (transformer as Extractor).on_property
    }
    // legacy handling, transform single value input to array
    if (!Array.isArray(onProperty)) {
      if (onProperty !== undefined) {
        onProperty = [onProperty]
      }
    }

    return buildRegex(transformer, target, onProperty, method, onEmpty)
  } catch (e) {
    core.warning(`⚠️ Failed to validate transformer: ${transformer.pattern}`)
    return null
  }
}

/**
 * Constructs the RegExp, providing the configured Regex and additional values
 */
export function buildRegex(
  regex: Regex,
  target: string | undefined,
  onProperty?: Property[] | undefined,
  method?: 'replace' | 'match' | undefined,
  onEmpty?: string | undefined
): RegexTransformer | null {
  try {
    return {
      pattern: new RegExp(regex.pattern.replace('\\\\', '\\'), regex.flags ?? 'gu'),
      target: target || '',
      onProperty,
      method,
      onEmpty
    }
  } catch (e) {
    core.warning(`⚠️ Bad replacer regex: ${regex.pattern}`)
    return null
  }
}

export interface RegexTransformer {
  pattern: RegExp | null
  target: string
  onProperty?: Property[]
  method?: 'replace' | 'match'
  onEmpty?: string
}
