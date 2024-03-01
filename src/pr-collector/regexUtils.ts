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
  method?: 'replace' | 'replaceAll' | 'match' | 'exec' | 'execAll' | undefined,
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

// eslint-disable-next-line no-undef
export function applyCaptureGroup(value: RegExpMatchArray, target: string): string | null {
  const groups = value['groups']
  if (groups) {
    const matched = groups[target]
    if (matched) {
      // if we had a perfect group match return that.
      return matched
    }
  }

  if (target.startsWith('$') && !target.startsWith('$$')) {
    // if we start with $ offer support for matching index based capture groups
    const index = Number(target.substring(1))
    if (!isNaN(index) && index < value.length) {
      return value[index]
    }
  }

  return null
}

export function transformStringToValues(value: string, extractor: RegexTransformer): string[] | null {
  if (extractor.pattern == null) {
    return null
  }

  if (extractor.method === 'exec' || extractor.method === 'execAll') {
    // eslint-disable-next-line no-undef
    let matches: RegExpMatchArray | null
    const result: Set<string> = new Set()
    // match regex to all occurrences in the string if we run `execAll`
    // otherwise just do the first match with exec
    do {
      matches = extractor.pattern.exec(value)
      if (matches) {
        if (extractor.target) {
          const matchedGroup = applyCaptureGroup(matches, extractor.target)
          if (matchedGroup) {
            result.add(matchedGroup)
          }
        } else {
          for (const match of matches) {
            result.add(match)
          }
        }
      }
    } while (matches && extractor.method === 'execAll')
    if (result.size > 0) {
      return [...result]
    }
  } else if (extractor.method === 'match') {
    const matches = value.match(extractor.pattern)
    if (matches !== null && matches.length > 0) {
      if (extractor.target) {
        const matchedGroup = applyCaptureGroup(matches, extractor.target)
        if (matchedGroup) {
          return [matchedGroup]
        }
      }
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
