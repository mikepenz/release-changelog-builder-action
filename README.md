<div align="center">
  :octocat:
</div>
<h1 align="center">
  release-changelog-builder-action
</h1>

<p align="center">
    ... a github action that builds your release notes, fast, easy and exactly the way you want.
</p>

<div align="center">
  <a href="https://github.com/mikepenz/release-changelog-builder-action/actions">
		<img src="https://github.com/mikepenz/release-changelog-builder-action/workflows/CI/badge.svg"/>
	</a>
</div>
<br />

-------

<p align="center">
    <a href="#whats-included-">What's included 🚀</a> &bull;
    <a href="#setup">Setup 🛠️</a> &bull;
    <a href="#customization-">Customization 🖍️</a> &bull;
    <a href="#contribute-">Contribute 🧬</a> &bull;
    <a href="#license">License 📓</a> &bull;
</p>

-------

### What's included 🚀

- Super simple integration
  - even on huge repositories with hundreds of tags
- Parallel releases support
- Blazing fast execution
- Suports any git project
- Highly flexible configuration
- Lightweight
- Supports any branch

# Setup

## Configure the workflow

Specify the action as part of your GitHub actions workflow:

```yml
- name: "Build Changelog"
  id: build_changelog
  if: startsWith(github.ref, 'refs/tags/')
  uses: mikepenz/release-changelog-builder-action@{latest-release}
  env:
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

By default the action will try to automatically retrieve the `tag` from the current commit, and automtacally resolve the `tag` before. Read more about this here.

## Action outputs

The action will succeed and return the `changelog` as a step output. Use it in any follow up step, by referencing via its id. For example `build_changelog`.

```yml
# ${{steps.{CHANGELOG_STEP_ID}.outputs.changelog}}
${{steps.build_changelog.outputs.changelog}}
```

# Customization 🖍️

## Changelog Configuration

By default the action will look for a file called `configuration.json` within the root of the repository to load the config from. If this file does not exist, defaults are used.

```
{
    "categories": [
        {
            "title": "## 🚀 Features",
            "labels": ["feature"]
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
    ignorePreReleases: "false"
    fromTag: "0.0.2"
    toTag: "0.0.3"
    token: ${{ secrets.PAT }}
```

💡 `ignorePreReleases` will be ignored, if `fromTag` is specified. `${{ secrets.GITHUB_TOKEN }}` only grants rights to the current repository, for other repos please use a PAT.

## PR Template placeholders

Table of supported placeholders allowed to be used in the `template` configuration.

| **Placeholder**  | **Description**                                             |
|------------------|-------------------------------------------------------------|
| `${{NUMBER}}`    | The number referencing this pull request. E.g. 13           |
| `${{TITLE}}`     | Specified title of the merged pull request                  |
| `${{URL}}`       | Url linking to the pull request on GitHub                   |
| `${{MERGED_AT}}` | The ISO time, the pull request was merged at                |
| `${{AUTHOR}}`    | Author creating and opening the pull request                |
| `${{BODY}}`      | Description/Body of the pull request as specified on GitHub |

## Template placeholders

Table of supported placeholders allowed to be used in the `pr_template` configuration.

| **Placeholder**      | **Description**                                                                                 |
|----------------------|-------------------------------------------------------------------------------------------------|
| `${{CHANGELOG}}`     | The contents of the changelog, matching the labels as specified in the categories configuration |
| `${{UNCATEGORIZED}}` | All pull requests not matching a specified label in categories                                  |


# Contribute 🧬

```bash
# Install the dependencies  
$ npm install

# Build the typescript and package it for distribution
$ npm run build && npm run package

# Run the tests, use to debug, and test it out
$ npm test

# Verify lint is happy
$ npm run lint -- --fix
```

It's suggested to export the token to your path, before running the tests, so API calls can be done to github.

```bash
export GITHUB_TOKEN=your_personal_github_pat
```

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
