import * as core from '@actions/core'
import {Rule} from 'github-pr-collector/lib/configuration'
import {PullRequestInfo, retrieveProperty} from 'github-pr-collector/lib/pullRequests'
import {validateTransformer} from 'github-pr-collector/lib/regexUtils'
import {RegexTransformer} from 'github-pr-collector/lib/types'

/**
 * Checks if any of the rules match the given PR
 */
export function matchesRules(rules: Rule[], pr: PullRequestInfo, exhaustive: Boolean): boolean {
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
    const matched = extractor.pattern.test(value)
    if (core.isDebug()) {
      core.debug(`    Pattern ${extractor.pattern} resulted in ${matched} for ${value}  on PR ${pr.number} (usecase: ${extractor_usecase})`)
    }
    return matched
  }
  return false
}
