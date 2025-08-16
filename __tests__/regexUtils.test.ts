import {transformStringToValue, validateRegex} from '../src/pr-collector/regexUtils.js'
import {Regex} from '../src/pr-collector/types.js'
import {clear} from '../src/transform.js'
import {expect, test} from 'vitest'

clear()

test('Replace into target', async () => {
  const regex: Regex = {
    pattern: '.*(\\[Feature\\]|\\[Issue\\]).*',
    target: '$1'
  }
  const validatedRegex = validateRegex(regex)
  expect(validateRegex).not.toBeNull()
  expect(transformStringToValue('[Feature] TEST', validatedRegex!!)).toStrictEqual(`[Feature]`)
})

test('Replace all into target', async () => {
  const regex: Regex = {
    pattern: '.*(\\[Feature\\]|\\[Issue\\]).*',
    method: 'replaceAll',
    target: '$1'
  }
  const validatedRegex = validateRegex(regex)
  expect(validateRegex).not.toBeNull()
  expect(transformStringToValue('[Feature] TEST', validatedRegex!!)).toStrictEqual(`[Feature]`)
})

test('Match without target', async () => {
  const regex: Regex = {
    pattern: '\\[Feature\\]|\\[Issue\\]',
    method: 'match'
  }
  const validatedRegex = validateRegex(regex)
  expect(validateRegex).not.toBeNull()
  expect(transformStringToValue('[Feature] TEST', validatedRegex!!)).toStrictEqual(`[Feature]`)
})

test('Match into target', async () => {
  const regex: Regex = {
    pattern: '(?<label>\\[Feature\\]|\\[Issue\\])',
    method: 'match',
    target: '$1'
  }
  const validatedRegex = validateRegex(regex)
  expect(validateRegex).not.toBeNull()
  expect(transformStringToValue('[Feature] TEST', validatedRegex!!)).toStrictEqual(`[Feature]`)
})

test('Match into named group', async () => {
  const regex: Regex = {
    pattern: '(?<label>\\[Feature\\]|\\[Issue\\])',
    method: 'match',
    target: 'label'
  }
  const validatedRegex = validateRegex(regex)
  expect(validateRegex).not.toBeNull()
  expect(transformStringToValue('[Feature] TEST', validatedRegex!!)).toStrictEqual(`[Feature]`)
})
