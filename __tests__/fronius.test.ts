import {resolveConfiguration} from '../src/utils'
import {ReleaseNotesBuilder} from '../src/releaseNotesBuilder'

jest.setTimeout(180000)

it('Should properly generate changelog', async () => {
  const configuration = resolveConfiguration('', 'configs_test/configuration_fronius.json')
  const releaseNotesBuilder = new ReleaseNotesBuilder(
    null,
    '.',
    'ccremer',
    'charts',
    null,
    'fronius-stack-0.2.0',
    false,
    true,
    false,
    configuration
  )

  const changeLog = await releaseNotesBuilder.build()
  console.log(changeLog)
  expect(changeLog).toStrictEqual(`1 changes since fronius-stack-0.1.2\n\n## 📄 Documentation\n\n- [fronius-stack] Bogus change to test changelog generator (#93)\n\n`)
})
