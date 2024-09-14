import {Configuration} from '../src/configuration'
import {clear} from '../src/transform'
import {mergeConfiguration, parseConfiguration, resolveConfiguration} from '../src/utils'

jest.setTimeout(180000)
clear()

it('Configurations are merged correctly', async () => {
  const configurationJson = parseConfiguration(`{
    "sort": "DESC",
    "empty_template": "- no magic changes",
    "trim_values": true
}`)
  const configurationFile = resolveConfiguration('', 'configs/configuration.json')

  const mergedConfiguration = mergeConfiguration(configurationJson, configurationFile)

  const expectedStringified = JSON.stringify(mergedConfiguration)

  expect(expectedStringified).toEqual(
    `{"max_tags_to_fetch":200,"max_pull_requests":1000,"max_back_track_time_days":1000,"exclude_merge_branches":[],"sort":"DESC","template":"#{{CHANGELOG}}","pr_template":"- #{{TITLE}}\\n   - PR: ##{{NUMBER}}","commit_template":"- #{{TITLE}}","empty_template":"- no magic changes","categories":[{"title":"## 🚀 Features","labels":["feature"]},{"title":"## 🐛 Fixes","labels":["fix"]},{"title":"## 🧪 Tests","labels":["test"]}],"ignore_labels":["ignore"],"label_extractor":[],"transformers":[],"tag_resolver":{"method":"semver"},"base_branches":[],"custom_placeholders":[],"trim_values":true,"categorized_include_empty_content":false}`
  )
})
