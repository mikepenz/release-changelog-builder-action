import {mergeConfiguration, parseConfiguration, resolveConfiguration} from '../src/utils.js'
import {clear} from '../src/transform.js'
import {expect, test} from 'vitest'

clear()

test('Configurations are merged correctly', async () => {
  const configurationJson = parseConfiguration(`{
    "sort": "DESC",
    "empty_template": "- no magic changes",
    "trim_values": true
}`)
  const configurationFile = resolveConfiguration('', 'configs/configuration.json')

  const mergedConfiguration = mergeConfiguration(configurationJson, configurationFile)

  const expectedStringified = JSON.stringify(mergedConfiguration, null, 2)

  expect(expectedStringified).toEqual(
    `{
  "max_tags_to_fetch": 200,
  "max_pull_requests": 1000,
  "max_back_track_time_days": 1000,
  "exclude_merge_branches": [],
  "sort": "DESC",
  "template": "#{{CHANGELOG}}",
  "pr_template": "- #{{TITLE}}\\n   - PR: ##{{NUMBER}}",
  "commit_template": "- #{{TITLE}}",
  "empty_template": "- no magic changes",
  "categories": [
    {
      "title": "## 🚀 Features",
      "labels": [
        "feature"
      ]
    },
    {
      "title": "## 🐛 Fixes",
      "labels": [
        "fix"
      ]
    },
    {
      "title": "## 🧪 Tests",
      "labels": [
        "test"
      ]
    }
  ],
  "ignore_labels": [
    "ignore"
  ],
  "label_extractor": [],
  "transformers": [],
  "tag_resolver": {
    "method": "semver"
  },
  "base_branches": [],
  "custom_placeholders": [],
  "trim_values": true
}`
  )
})

test('Configurations keep the reference extractor', async () => {
  const reference = {
    pattern: '.*\\ \\#(.).*',
    on_property: 'body',
    method: 'replace',
    target: '$1'
  }
  const withReference = parseConfiguration(JSON.stringify({reference}))
  const withoutReference = parseConfiguration(`{"empty_template": "- no magic changes"}`)
  const otherReference = parseConfiguration(JSON.stringify({reference: {...reference, on_property: 'title'}}))

  expect(mergeConfiguration(withReference, undefined).reference).toStrictEqual(reference)
  expect(mergeConfiguration(withoutReference, withReference).reference).toStrictEqual(reference)
  expect(mergeConfiguration(withReference, otherReference).reference).toStrictEqual(reference)
  expect(mergeConfiguration(withoutReference, undefined).reference).toBeUndefined()
})
