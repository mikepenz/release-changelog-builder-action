import {TagResolver} from '../src/configuration.js'
import {validateRegex} from '../src/pr-collector/regexUtils.js'
import {filterTags, prepareAndSortTags, TagInfo, Tags, transformTags} from '../src/pr-collector/tags.js'
import {BaseRepository} from '../src/repositories/BaseRepository.js'
import {clear} from '../src/transform.js'
import * as core from '@actions/core'
import * as github from '@actions/github'
import {createCommandManager} from '../src/pr-collector/gitHelper.js'
import {describe, expect, test, vi} from 'vitest'

vi.mock('@actions/core', async importOriginal => ({...(await importOriginal<typeof import('@actions/core')>()), warning: vi.fn()}))

vi.mock('../src/pr-collector/gitHelper.js', () => ({
  createCommandManager: vi.fn(async () => ({initialCommit: async () => 'c'.repeat(40), latestTag: async () => '0.191.0'}))
}))

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

const SHA_A = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'
const SHA_B = 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb'
const INITIAL = 'cccccccccccccccccccccccccccccccccccccccc'

describe('findPredecessorTag', () => {
  const tagsHelper = new Tags({} as BaseRepository)
  const initial = {name: INITIAL, commit: INITIAL}

  test('single tag differing from the current tag is the predecessor', async () => {
    const tags: TagInfo[] = [{name: '0.191.0', commit: SHA_A}]
    expect(await tagsHelper.findPredecessorTag(tags, '.', SHA_B, false)).toStrictEqual(tags[0])
  })

  test('single tag matching the current tag by name, commit or short sha falls back to the initial commit', async () => {
    const tags: TagInfo[] = [{name: '0.191.0', commit: SHA_A}]
    for (const current of ['0.191.0', '0.191.0'.toUpperCase(), SHA_A, SHA_A.toUpperCase(), SHA_A.substring(0, 7)]) {
      expect(await tagsHelper.findPredecessorTag(tags, '.', current, false)).toStrictEqual(initial)
    }
  })

  test('short sha below 7 chars is not treated as a commit match', async () => {
    const tags: TagInfo[] = [{name: '0.191.0', commit: SHA_A}]
    expect(await tagsHelper.findPredecessorTag(tags, '.', 'aaaaaa', false)).toStrictEqual(tags[0])
  })

  test('tag without commit only matches by name', async () => {
    const tags: TagInfo[] = [{name: '1.0.0'}]
    expect(await tagsHelper.findPredecessorTag(tags, '.', SHA_A, false)).toStrictEqual(tags[0])
  })

  test('no tags falls back to the initial commit', async () => {
    expect(await tagsHelper.findPredecessorTag([], '.', SHA_A, false)).toStrictEqual(initial)
  })

  test('single pre-release tag is skipped with ignorePreReleases', async () => {
    const tags: TagInfo[] = [{name: '1.0.0-rc1', commit: SHA_A, preRelease: true}]
    expect(await tagsHelper.findPredecessorTag(tags, '.', SHA_B, true)).toStrictEqual(initial)
    expect(await tagsHelper.findPredecessorTag(tags, '.', SHA_B, false)).toStrictEqual(tags[0])
  })

  const multi: TagInfo[] = [
    {name: '2.0.0', commit: SHA_A},
    {name: '1.1.0-rc1', commit: SHA_B, preRelease: true},
    {name: '1.0.0', commit: 'dddddddddddddddddddddddddddddddddddddddd'}
  ]

  test('multiple tags: match by name returns the next tag', async () => {
    expect(await tagsHelper.findPredecessorTag(multi, '.', '2.0.0', false)).toStrictEqual(multi[1])
  })

  test('multiple tags: match by commit sha returns the next tag', async () => {
    expect(await tagsHelper.findPredecessorTag(multi, '.', SHA_A, false)).toStrictEqual(multi[1])
  })

  test('multiple tags: ignorePreReleases skips pre-releases', async () => {
    expect(await tagsHelper.findPredecessorTag(multi, '.', '2.0.0', true)).toStrictEqual(multi[2])
  })

  test('multiple tags: unmatched tag returns the newest tag', async () => {
    expect(await tagsHelper.findPredecessorTag(multi, '.', 'eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee', false)).toStrictEqual(multi[0])
  })

  test('multiple tags: unmatched tag with ignorePreReleases returns the newest release', async () => {
    const tags: TagInfo[] = [{name: '3.0.0-rc1', preRelease: true}, multi[0]]
    expect(await tagsHelper.findPredecessorTag(tags, '.', SHA_B, true)).toStrictEqual(multi[0])
  })

  test('multiple tags: oldest tag fails with a warning instead of assuming the initial commit', async () => {
    expect(await tagsHelper.findPredecessorTag(multi, '.', '1.0.0', false)).toBeNull()
    expect(core.warning).toHaveBeenCalledWith(expect.stringContaining("No tag found before '1.0.0'"))
  })

  test('multiple tags: matched tag with only older pre-releases keeps using the next tag', async () => {
    const tags: TagInfo[] = [multi[0], multi[1]]
    expect(await tagsHelper.findPredecessorTag(tags, '.', '2.0.0', true)).toStrictEqual(multi[1])
  })

  test('multiple tags: unmatched tag with only pre-releases falls back to the initial commit', async () => {
    const tags: TagInfo[] = [{name: '3.0.0-rc1', preRelease: true}, multi[1]]
    expect(await tagsHelper.findPredecessorTag(tags, '.', SHA_A, true)).toStrictEqual(initial)
  })

  test('returns null when resolving the initial commit fails', async () => {
    vi.mocked(createCommandManager).mockRejectedValueOnce(new Error('no git'))
    expect(await tagsHelper.findPredecessorTag([], '.', SHA_A, false)).toBeNull()
  })
})

describe('retrieveRange with a single existing tag', () => {
  const repo = {getTags: async () => [{name: '0.191.0', commit: SHA_A}]} as unknown as BaseRepository
  const resolver: TagResolver = {method: 'semver'}

  test('explicit toTag (untagged sha) uses the existing tag as fromTag', async () => {
    const range = await new Tags(repo).retrieveRange('.', 'o', 'r', null, SHA_B, false, 1000, resolver)
    expect(range.from?.name).toStrictEqual('0.191.0')
    expect(range.to).toStrictEqual({name: SHA_B, commit: SHA_B})
  })

  test('explicit toTag equal to the existing tag falls back to the initial commit', async () => {
    const range = await new Tags(repo).retrieveRange('.', 'o', 'r', null, '0.191.0', false, 1000, resolver)
    expect(range.from).toStrictEqual({name: INITIAL, commit: INITIAL})
  })

  test('explicit fromTag is used as is', async () => {
    const range = await new Tags(repo).retrieveRange('.', 'o', 'r', 'x', SHA_B, false, 1000, resolver)
    expect(range.from).toStrictEqual({name: 'x', commit: 'x'})
  })
})

describe('retrieveRange tag resolution', () => {
  const resolver: TagResolver = {method: 'semver'}
  const repo = (tags: TagInfo[]) =>
    ({
      getTags: async () => tags,
      fillTagInformation: async (_p: string, _o: string, _r: string, t: TagInfo) => t
    }) as unknown as BaseRepository

  test('toTag resolved from the tag ref of the context', async () => {
    const ref = github.context.ref
    github.context.ref = 'refs/tags/2.0.0'
    try {
      const range = await new Tags(repo([{name: '2.0.0'}, {name: '1.0.0'}])).retrieveRange('.', 'o', 'r', null, null, false, 1000, resolver)
      expect(range.to).toStrictEqual({name: '2.0.0', commit: '2.0.0'})
      expect(range.from?.name).toStrictEqual('1.0.0')
    } finally {
      github.context.ref = ref
    }
  })

  test('toTag resolved from the newest tag when multiple tags exist', async () => {
    const range = await new Tags(repo([{name: '1.0.0'}, {name: '2.0.0'}])).retrieveRange('.', 'o', 'r', null, null, false, 1000, resolver)
    expect(range.to?.name).toStrictEqual('2.0.0')
    expect(range.from?.name).toStrictEqual('1.0.0')
  })

  test('toTag resolved from git when a single tag exists, then falls back to the initial commit', async () => {
    const range = await new Tags(repo([{name: '0.191.0', commit: SHA_A}])).retrieveRange('.', 'o', 'r', null, null, false, 1000, resolver)
    expect(range.to?.name).toStrictEqual('0.191.0')
    expect(range.from).toStrictEqual({name: INITIAL, commit: INITIAL})
  })

  test('filter and transformer path resolves a range with the original tag names', async () => {
    const tags = [{name: 'api-1.0.0'}, {name: 'api-2.0.0'}, {name: 'other-3.0.0'}]
    const range = await new Tags(repo(tags)).retrieveRange('.', 'o', 'r', null, 'api-2.0.0', false, 1000, {
      method: 'semver',
      filter: {pattern: '(api-.+)', target: '$1'},
      transformer: [{pattern: 'api-(.+)', target: '$1'}]
    })
    expect(range.to?.name).toStrictEqual('api-2.0.0')
    expect(range.from?.name).toStrictEqual('api-1.0.0')
  })

  test('fillTagInformation delegates to the repository', async () => {
    const tag = {name: '1.0.0'}
    expect(await new Tags(repo([])).fillTagInformation('.', 'o', 'r', tag)).toStrictEqual(tag)
  })
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
})
