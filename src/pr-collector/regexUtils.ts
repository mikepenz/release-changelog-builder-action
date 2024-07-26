import * as core from '@actions/core'
import {Extractor, Property, Regex, RegexTransformer} from './types'

export function validateRegex(regex?: Regex): RegexTransformer | null {
  if (regex === undefined) {
    return null
  }
  try {
    const target = regex.target
    const method = regex.method
    const onEmpty = regex.on_empty
    let onProperty = undefined
    if (regex.hasOwnProperty('on_property')) {
      onProperty = (regex as Extractor).on_property
    }
    // legacy handling, transform single value input to array
    if (!Array.isArray(onProperty)) {
      if (onProperty !== undefined) {
        onProperty = [onProperty]
      }
    }

    return buildRegex(regex, target, onProperty, method, onEmpty)
  } catch (e) {
    core.warning(`⚠️ Failed to validate transformer: ${regex.pattern}`)
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
  method?: 'replace' | 'replaceAll' | 'match' | 'regexr' | undefined,
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
    core.warning(`⚠️ Bad regex: ${regex.pattern} (${e})`)
    return null
  }
}

export function transformStringToValues(value: string, extractor: RegexTransformer): string[] | null {
  if (extractor.pattern == null) {
    return null
  }

  if (extractor.method === 'regexr') {
    const matches = transformRegexr(extractor.pattern, value, extractor.target)
    if (matches !== null && matches.size > 0) {
      return [...matches]
    }
  } else if (extractor.method === 'match') {
    const matches = value.match(extractor.pattern)
    if (matches !== null && matches.length > 0) {
      return matches.map(match => match || '')
    }
  } else if (extractor.method === 'replaceAll') {
    const match = value.replaceAll(extractor.pattern, extractor.target)
    if (match !== '') {
      return [match]
    }
  } else {
    const match = value.replace(extractor.pattern, extractor.target)
    if (match !== '') {
      return [match]
    }
  }
  if (extractor.onEmpty !== undefined) {
    return [extractor.onEmpty]
  }
  return null
}

export function transformStringToOptionalValue(value: string, extractor: RegexTransformer): string | null {
  const result = transformStringToValues(value, extractor)
  if (result != null && result.length > 0) {
    return result[0]
  } else {
    return null
  }
}

export function transformStringToValue(value: string, extractor: RegexTransformer): string {
  return transformStringToOptionalValue(value, extractor) || ''
}

function transformRegexr(regex: RegExp, source: string, target: string): Set<string> | null {
  /**
   * Util function extracted from regexr and is licensed under:
   *
   * RegExr: Learn, Build, & Test RegEx
   * Copyright (C) 2017  gskinner.com, inc.
   * https://github.com/gskinner/regexr/blob/master/dev/src/helpers/BrowserSolver.js#L111-L136
   */

  let repl
  let ref
  if (target.search(/\$[&1-9`']/) === -1) {
    target = `$&${target}`
  }

  const firstOnly = true // for now we don't support multi matches for PRs, future improvement
  const adaptedRegex = new RegExp(regex.source, regex.flags.replace('g', ''))
  const result = new Set<string>()
  do {
    ref = source.replace(adaptedRegex, '\b') // bell char - just a placeholder to find
    const index = ref.indexOf('\b')
    const empty = ref.length > source.length
    if (index === -1) {
      break
    }
    repl = source.replace(adaptedRegex, target)
    result.add(repl.substr(index, repl.length - ref.length + 1))
    source = ref.substr(index + (empty ? 2 : 1))
    if (firstOnly) {
      break
    }
  } while (source.length)
  return result
}
