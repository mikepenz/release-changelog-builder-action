import {resolveConfiguration} from '../src/utils'
import {ReleaseNotesBuilder} from '../src/releaseNotesBuilder'

jest.setTimeout(180000)

it('Should properly generate changelog', async () => {
  const configuration = resolveConfiguration('', 'configs_test/configuration_neo4j.json')
  const releaseNotesBuilder = new ReleaseNotesBuilder(
    null,
    '.',
    'neo4j',
    'graphql',
    null,
    '@neo4j/graphql@2.5.0',
    false,
    true,
    false,
    configuration
  )

  const changeLog = await releaseNotesBuilder.build()
  console.log(changeLog)
  expect(changeLog).toStrictEqual(`xyz`)
})
