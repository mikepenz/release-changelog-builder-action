
# release-changelog-builder-action

Builds the release notes between two tags (or refs) from pull requests merged.

## Action usage

Include this action in your build by defining the action in your workflow:

```yml
- name: "Build Changelog"
  id: build_changelog
  if: startsWith(github.ref, 'refs/tags/')
  uses: mikepenz/release-changelog-builder-action@{latest-release}
  env:
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

This will automatically pull the tag from the current commit (the latest tag), and try to resolve the tag before this.

## Action outputs

The result of this action is returned via the outputs, and can be retrieved via the `changelog` value in the step afterwards. See the `test.yml` for a sample.

```yml
${{steps.build_changelog.outputs.changelog}}
```

## Configuration

By default the action will look for a file called `configuration.json` within the root of the repository to load the config from. If this file does not exist, defaults are used.

```
{
    "categories": [
        {
            "title": "## 🚀 Features",
            "labels": ["feature"]
        },
        {
            "title": "## 🦄 Internal Features",
            "labels": ["internal"]
        },
        {
            "title": "## 🐛 Fixes",
            "labels": ["fix"]
        },
        {
            "title": "## 🧪 Tests",
            "labels": ["test"]
        }
    ],
    "sort": "ASC",
    "template": "${{CHANGELOG}}\n\n<details>\n<summary>Uncategorized</summary>\n\n${{UNCATEGORIZED}}\n</details>",
    "pr_template": "- ${{TITLE}}\n   - PR: #${{NUMBER}}",
    "empty_template": "- no changes",
    "transformers": [
        {
            "pattern": "[\\-\\*] (\\[(...|TEST|CI|SKIP)\\])( )?(.+?)\n(.+?[\\-\\*] )(.+)",
            "target": "- $4\n  - $6"
        }
    ],
    "max_tags_to_fetch": 200,
    "max_pull_requests": 200,
    "max_back_track_time_days": 90,
    "exclude_merge_branches": [
        "Owner/qa"
    ]
}
```

Any section of the configruation can be ommited, to have defaults apply
Defaults for the configuraiton can be found in the [configuration.ts](https://github.com/mikepenz/release-changelog-builder-action/blob/develop/src/configuration.ts)


## Advanced workflow specification

For advanced usecases additional settings can be provided to the action

```yml
- name: "Complex Configuration"
  id: build_changelog
  if: startsWith(github.ref, 'refs/tags/')
  uses: mikepenz/release-changelog-builder-action@{latest-release}
  with:
    configuration: "configuration_complex.json"
    owner: "mikepenz"
    repo: "release-changelog-builder-action"
    fromTag: "0.0.2"
    toTag: "0.0.3"
    token: ${{ secrets.GITHUB_TOKEN }} # the token to use, for a different repository a PAT is required (Personal access token)
```

## PR Template placeholders

| Variable  | Description      |
| --------- | -------------------------- |
| `${{NUMBER}}` | Pull request number  |
| `${{TITLE}}`  | The title of the pull request |
| `${{URL}}` | The URL linking to the pull request   |
| `${{MERGED_AT}}`   | The time this PR was merged   |
| `${{AUTHOR}}`    | The author of the pull request |
| `${{BODY}}`    | The body / description of the pull request |

## Template placeholdrs

| Variable  | Description      |
| --------- | -------------------------- |
| `${{CHANGELOG}}` | The contents of the main changelog, matching the labels as specified in the categories configuration  |
| `${{UNCATEGORIZED}}`  | All pull requests not matching a label |

# Developed By

* Mike Penz
 * [mikepenz.com](http://mikepenz.com) - <mikepenz@gmail.com>
 * [paypal.me/mikepenz](http://paypal.me/mikepenz)

# Credits

Core parts of the PR fetching logic, are based on [pull-release-notes](https://github.com/nblagoev/pull-release-notes)
- Nikolay Blagoev - [GitHub](https://github.com/nblagoev/)

# License

   Copyright for portions of pr-release-notes are held by Nikolay Blagoev, 2019-2020 as part of project pull-release-notes. All other copyright for project pr-release-notes are held by Mike Penz, 2020.

# Fork License

All patches and changes applied to the original source are licensed under the Apache 2.0 license.

    Copyright 2020 Mike Penz

    Licensed under the Apache License, Version 2.0 (the "License");
    you may not use this file except in compliance with the License.
    You may obtain a copy of the License at

       http://www.apache.org/licenses/LICENSE-2.0

    Unless required by applicable law or agreed to in writing, software
    distributed under the License is distributed on an "AS IS" BASIS,
    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
    See the License for the specific language governing permissions and
    limitations under the License.
