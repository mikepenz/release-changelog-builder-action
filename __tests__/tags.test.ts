import {TagResolver} from '../src/configuration.js'
import {validateRegex} from '../src/pr-collector/regexUtils.js'
import {filterTags, prepareAndSortTags, TagInfo, Tags, transformTags} from '../src/pr-collector/tags.js'
import {BaseRepository} from '../src/repositories/BaseRepository.js'
import {clear} from '../src/transform.js'
import {describe, expect, test} from 'vitest'

clear()

test('Should order tags correctly using semver', async () => {
  const tags: TagInfo[] = [
    {name: '2020.4.0', commit: ''},
    {name: '2020.4.0-rc02', commit: ''},
    {name: '2020.3.2', commit: ''},
    {name: 'v2020.3.1', commit: ''},
    {name: '2020.3.1-rc03', commit: ''},
    {name: '2020.3.1-rc01', commit: ''},
    {name: '2020.3.1-b01', commit: ''},
    {name: 'v2020.3.0', commit: ''}
  ]

  const tagResolver = {
    method: 'semver'
  }
  const sorted = prepareAndSortTags(tags, tagResolver)
    .map(function (tag) {
      return tag.name
    })
    .join(',')

  expect(sorted).toStrictEqual(`2020.4.0,2020.4.0-rc02,2020.3.2,v2020.3.1,2020.3.1-rc03,2020.3.1-rc01,2020.3.1-b01,v2020.3.0`)
})

test('Should order tags correctly using semver', async () => {
  const tags: TagInfo[] = [
    {name: '0.0.1', commit: ''},
    {name: '0.0.1-rc01', commit: ''},
    {name: '0.1.0', commit: ''},
    {name: '0.1.0-b01', commit: ''},
    {name: '1.0.0', commit: ''},
    {name: '1.0.0-a01', commit: ''},
    {name: '2.0.0', commit: ''},
    {name: '10.0.0', commit: ''},
    {name: '10.1.0', commit: ''},
    {name: '10.1.0-2', commit: ''},
    {name: '20.0.2', commit: ''},
    {name: '100.0.0', commit: ''},
    {name: '1000.0.0', commit: ''}
  ]

  const tagResolver = {
    method: 'non-existing-method'
  }
  const sorted = prepareAndSortTags(tags, tagResolver)
    .map(function (tag) {
      return tag.name
    })
    .join(',')

  expect(sorted).toStrictEqual(`1000.0.0,100.0.0,20.0.2,10.1.0,10.1.0-2,10.0.0,2.0.0,1.0.0,1.0.0-a01,0.1.0,0.1.0-b01,0.0.1,0.0.1-rc01`)
})

test('Should order tags alphabetical', async () => {
  const tags: TagInfo[] = [
    {name: '0.0.1', commit: ''},
    {name: '0.0.1-rc01', commit: ''},
    {name: '0.1.0-b01', commit: ''},
    {name: '1.0.0', commit: ''},
    {name: 'a', commit: ''},
    {name: '1.0.0-a01', commit: ''},
    {name: '2.0.0', commit: ''},
    {name: '10.0.0', commit: ''},
    {name: 'v1', commit: ''},
    {name: '10.1.0', commit: ''},
    {name: '10.1.0-2', commit: ''},
    {name: '20.0.2', commit: ''},
    {name: '1000.0.0', commit: ''}
  ]

  const tagResolver = {
    method: 'sort'
  }
  const sorted = prepareAndSortTags(tags, tagResolver)
    .map(function (tag) {
      return tag.name
    })
    .join(',')

  expect(sorted).toStrictEqual(`a,20.0.2,2.0.0,1000.0.0,10.1.0,10.1.0-2,10.0.0,1.0.0,1.0.0-a01,v1,0.1.0-b01,0.0.1,0.0.1-rc01`)
})

test('Should filter tags correctly using the regex', async () => {
  const tags: TagInfo[] = [
    {name: 'api-0.0.1', commit: ''},
    {name: 'api-0.0.1-rc01', commit: ''},
    {name: 'config-0.1.0', commit: ''},
    {name: '0.1.0-b01', commit: ''},
    {name: '1.0.0', commit: ''},
    {name: '1.0.0-a01', commit: ''},
    {name: '2.0.0', commit: ''},
    {name: 'ap-10.0.0', commit: ''},
    {name: '10.1.0', commit: ''},
    {name: 'api-10.1.0-2', commit: ''},
    {name: '20.0.2', commit: ''}
  ]

  const tagResolver: TagResolver = {
    method: 'non-existing-method',
    filter: {
      pattern: 'api-(.+)',
      method: 'match',
      flags: 'gu'
    }
  }
  const filter = validateRegex(tagResolver.filter)
  const filtered = filterTags(tags, filter)
    .map(function (tag) {
      return tag.name
    })
    .join(',')

  expect(filtered).toStrictEqual(`api-0.0.1,api-0.0.1-rc01,api-10.1.0-2`)
})

test('Should filter tags correctly using the regex (inverse)', async () => {
  const tags: TagInfo[] = [
    {name: 'api-0.0.1', commit: ''},
    {name: 'api-0.0.1-rc01', commit: ''},
    {name: 'config-0.1.0', commit: ''},
    {name: '0.1.0-b01', commit: ''},
    {name: '1.0.0', commit: ''},
    {name: '1.0.0-a01', commit: ''},
    {name: '2.0.0', commit: ''},
    {name: 'ap-10.0.0', commit: ''},
    {name: '10.1.0', commit: ''},
    {name: 'api-10.1.0-2', commit: ''},
    {name: '20.0.2', commit: ''}
  ]

  const tagResolver: TagResolver = {
    method: 'non-existing-method',
    filter: {
      pattern: '^(?!\\w+-)(.+)',
      method: 'match',
      flags: 'gu'
    }
  }
  const filter = validateRegex(tagResolver.filter)
  const filtered = filterTags(tags, filter)
    .map(function (tag) {
      return tag.name
    })
    .join(',')

  expect(filtered).toStrictEqual(`0.1.0-b01,1.0.0,1.0.0-a01,2.0.0,10.1.0,20.0.2`)
})

test('Should transform tags correctly using the regex', async () => {
  const tags: TagInfo[] = [
    {name: 'api-0.0.1', commit: ''},
    {name: 'api-0.0.1-rc01', commit: ''},
    {name: 'config-0.1.0', commit: ''},
    {name: '0.1.0-b01', commit: ''},
    {name: '2.0.0', commit: ''},
    {name: '10.1.0', commit: ''},
    {name: 'api-10.1.0-2', commit: ''},
    {name: '20.0.2', commit: ''}
  ]

  const tagResolver: TagResolver = {
    method: 'non-existing-method',
    transformer: {
      pattern: '(api-)?(.+)',
      target: '$2'
    }
  }

  const transformer = validateRegex(tagResolver.transformer)
  if (transformer != null) {
    const transformed = transformTags(tags, transformer)
      .map(function (tag) {
        return tag.name
      })
      .join(',')

    expect(transformed).toStrictEqual(`0.0.1,0.0.1-rc01,config-0.1.0,0.1.0-b01,2.0.0,10.1.0,10.1.0-2,20.0.2`)
  }
})

describe('retrieveRange with a tag transformer', () => {
  const repo = (tags: TagInfo[]) => ({getTags: async () => tags}) as unknown as BaseRepository
  const strip = (pattern: string) => ({pattern, target: '$1'})

  test('keeps the sort order and restores the original names', async () => {
    const tags = [{name: 'api-1.5.0'}, {name: 'api-1.0.0'}, {name: 'api-2.0.0'}]
    const range = await new Tags(repo(tags)).retrieveRange('.', 'o', 'r', null, 'api-2.0.0', false, 1000, {
      method: 'semver',
      transformer: strip('api-(.+)')
    })
    expect(range.from?.name).toStrictEqual('api-1.5.0')
  })

  test('applies ignorePreReleases based on the transformed names', async () => {
    const tags = [{name: 'api-2.0.0'}, {name: 'api-1.1.0-rc1'}, {name: 'api-1.0.0'}]
    const range = await new Tags(repo(tags)).retrieveRange('.', 'o', 'r', null, 'api-2.0.0', true, 1000, {
      method: 'semver',
      transformer: strip('api-(.+)')
    })
    expect(range.from?.name).toStrictEqual('api-1.0.0')
  })

  test('restores the original names across chained transformers', async () => {
    const tags = [{name: 'api-v1.0.0'}, {name: 'api-v2.0.0'}]
    const range = await new Tags(repo(tags)).retrieveRange('.', 'o', 'r', null, 'api-v2.0.0', false, 1000, {
      method: 'semver',
      transformer: [strip('api-(.+)'), strip('v(.+)')]
    })
    expect(range.from?.name).toStrictEqual('api-v1.0.0')
  })

test('Should use the only existing tag as predecessor when building a newer release', async () => {
  const tagsHelper = new Tags({} as BaseRepository)
  const tags: TagInfo[] = [{name: '0.191.0', commit: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'}]

  // `toTag` is the commit sha of the upcoming release which has not been tagged yet
  const predecessor = await tagsHelper.findPredecessorTag(tags, '.', 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb', false)

  expect(predecessor).toStrictEqual(tags[0])
})

test('Should fall back to the initial commit when the only existing tag is the current release', async () => {
  const tagsHelper = new Tags({} as BaseRepository)
  const tags: TagInfo[] = [{name: '0.191.0', commit: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'}]

  const byName = await tagsHelper.findPredecessorTag(tags, '.', '0.191.0', false)
  expect(byName?.name).not.toStrictEqual('0.191.0')
  expect(byName?.name).toStrictEqual(byName?.commit)

  const byCommit = await tagsHelper.findPredecessorTag(tags, '.', 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', false)
  expect(byCommit).toStrictEqual(byName)
})
