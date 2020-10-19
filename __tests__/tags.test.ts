import { resolveConfiguration } from '../src/utils';
import { ReleaseNotesBuilder } from '../src/releaseNotesBuilder';
import { TagInfo, sortTags } from '../src/tags';

it('Should order tags correctly', async () => {
  jest.setTimeout(180000)

  const tags: TagInfo[] = [
    { name: "2020.4.0", commit: "" },
    { name: "2020.4.0-rc02", commit: "" },
    { name: "2020.3.2", commit: "" },
    { name: "v2020.3.1", commit: "" },
    { name: "2020.3.1-rc03", commit: "" },
    { name: "2020.3.1-rc01", commit: "" },
    { name: "2020.3.1-b01", commit: "" },
    { name: "v2020.3.0", commit: "" }
  ]

  const sorted = sortTags(tags).map(function (tag) {
    return tag.name
  }).join(",")

  expect(sorted).toStrictEqual(`2020.4.0,2020.4.0-rc02,2020.3.2,v2020.3.1,2020.3.1-rc03,2020.3.1-rc01,2020.3.1-b01,v2020.3.0`)
})