import {transformStringToValue, validateRegex} from '../src/pr-collector/regexUtils'
import {Regex} from '../src/pr-collector/types'
import {clear} from '../src/transform'

jest.setTimeout(180000)
clear()

it('Replace into target', async () => {
  const regex: Regex = {
    pattern: '.*(\\[Feature\\]|\\[Issue\\]).*',
    target: '$1'
  }
  const validatedRegex = validateRegex(regex)
  expect(validateRegex).not.toBeNull()
  expect(transformStringToValue('[Feature] TEST', validatedRegex!!)).toStrictEqual(`[Feature]`)
})

it('Replace all into target', async () => {
  const regex: Regex = {
    pattern: '.*(\\[Feature\\]|\\[Issue\\]).*',
    method: 'replaceAll',
    target: '$1'
  }
  const validatedRegex = validateRegex(regex)
  expect(validateRegex).not.toBeNull()
  expect(transformStringToValue('[Feature] TEST', validatedRegex!!)).toStrictEqual(`[Feature]`)
})

it('Match without target', async () => {
  const regex: Regex = {
    pattern: '\\[Feature\\]|\\[Issue\\]',
    method: 'match'
  }
  const validatedRegex = validateRegex(regex)
  expect(validateRegex).not.toBeNull()
  expect(transformStringToValue('[Feature] TEST', validatedRegex!!)).toStrictEqual(`[Feature]`)
})

it('Match into target', async () => {
  const regex: Regex = {
    pattern: '(?<label>\\[Feature\\]|\\[Issue\\])',
    method: 'match',
    target: '$1'
  }
  const validatedRegex = validateRegex(regex)
  expect(validateRegex).not.toBeNull()
  expect(transformStringToValue('[Feature] TEST', validatedRegex!!)).toStrictEqual(`[Feature]`)
})

it('Match into named group', async () => {
  const regex: Regex = {
    pattern: '(?<label>\\[Feature\\]|\\[Issue\\])',
    method: 'match',
    target: 'label'
  }
  const validatedRegex = validateRegex(regex)
  expect(validateRegex).not.toBeNull()
  expect(transformStringToValue('[Feature] TEST', validatedRegex!!)).toStrictEqual(`[Feature]`)
})
