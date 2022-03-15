import {resolveConfiguration} from '../src/utils'
import {ReleaseNotesBuilder} from '../src/releaseNotesBuilder'

jest.setTimeout(180000)

it('Verify commit based changelog, with emoji categorisation', async () => {
    const configuration = resolveConfiguration(
        '',
        'configs_test/configuration_commits_emoji.json'
    )
    const releaseNotesBuilder = new ReleaseNotesBuilder(
        null,
        null,
        '.',
        'ThePieMonster',
        'HideMockLocation',
        '2.0.4',
        '2.0.5',
        false,
        false,
        false,
        configuration
    )

    const changeLog = await releaseNotesBuilder.build()
    console.log(changeLog)
    expect(changeLog).toStrictEqual(
        ``
    )
})