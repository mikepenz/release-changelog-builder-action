import {resolveConfiguration} from '../src/utils'
import {ReleaseNotesBuilder} from '../src/releaseNotesBuilder'
import { TagInfo, sortTags, filterTags } from '../src/tags';

jest.setTimeout(180000)

it('Should order tags correctly using semver', async () => {
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
  const sorted = sortTags(tags, tagResolver)
    .map(function (tag) {
      return tag.name
    })
    .join(',')

  expect(sorted).toStrictEqual(
    `2020.4.0,2020.4.0-rc02,2020.3.2,v2020.3.1,2020.3.1-rc03,2020.3.1-rc01,2020.3.1-b01,v2020.3.0`
  )
})

it('Should order tags correctly using semver', async () => {
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
  const sorted = sortTags(tags, tagResolver)
    .map(function (tag) {
      return tag.name
    })
    .join(',')

  expect(sorted).toStrictEqual(
    `1000.0.0,100.0.0,20.0.2,10.1.0,10.1.0-2,10.0.0,2.0.0,1.0.0,1.0.0-a01,0.1.0,0.1.0-b01,0.0.1,0.0.1-rc01`
  )
})

it('Should order tags alphabetical', async () => {
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
  const sorted = sortTags(tags, tagResolver)
    .map(function (tag) {
      return tag.name
    })
    .join(',')

  expect(sorted).toStrictEqual(
    `a,20.0.2,2.0.0,1000.0.0,10.1.0,10.1.0-2,10.0.0,1.0.0,1.0.0-a01,v1,0.1.0-b01,0.0.1,0.0.1-rc01`
  )
})

it('Should filter tags correctly using the regex', async () => {
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

  const tagResolver = {
    method: 'non-existing-method',
    filter: {
      "pattern": "api-(.+)",
      "flags": "gu"
    }
  }
  const filtered = filterTags(tags, tagResolver)
    .map(function (tag) {
      return tag.name
    })
    .join(',')

  expect(filtered).toStrictEqual(
    `api-0.0.1,api-0.0.1-rc01,api-10.1.0-2`
  )
})