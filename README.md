<div align="center">
  :octocat:📄🔖📦
</div>
<h1 align="center">
  release-changelog-builder-action
</h1>

<p align="center">
    ... a GitHub action that builds your release notes / changelog fast, easy and exactly the way you want.
</p>

<div align="center">
  <img src="https://raw.githubusercontent.com/mikepenz/release-changelog-builder-action/develop/.github/images/release_changelog_builder_collapsed.png"/>
</div>

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
    <a href="#full-sample-%EF%B8%8F">Sample 🖥️</a> &bull;
    <a href="#customization-%EF%B8%8F">Customization 🖍️</a> &bull;
    <a href="#contribute-">Contribute 🧬</a> &bull;
    <a href="#local-testing-">Local Testing 🧪</a> &bull;
    <a href="#license">License 📓</a>
</p>

-------

### What's included 🚀

- Super simple integration
  - ...even on huge repositories with hundreds of tags
- Parallel releases support
- Rich changelogs based on PRs
  - Alternative commit based mode
- Blazingly fast execution
- Supports any git project
- Highly flexible configuration
- Lightweight
- Supports any branch
- Rich build log output

-------

## Setup

### Configure the workflow

Specify the action as part of your GitHub actions workflow:

```yml
- name: "Build Changelog"
  id: build_changelog
  uses: mikepenz/release-changelog-builder-action@{latest-release}
```

### Action outputs

After action execution it will return the `changelog` and additional information as step output. You can use it in any follow-up step by referencing the output by referencing it via the id of the step. For example `build_changelog`.

```yml
# ${{steps.{CHANGELOG_STEP_ID}.outputs.changelog}}
${{steps.build_changelog.outputs.changelog}}
```

A full set list of possible output values for this action.

| **Output**            | **Description**                                                                                                           |
|-----------------------|---------------------------------------------------------------------------------------------------------------------------|
| `outputs.changelog`         | The built release changelog built from the merged pull requests                                                           |
| `outputs.owner`             | Specifies the owner of the repository processed                                                                           |
| `outputs.repo`              | Describes the repository name, which was processed                                                                        |
| `outputs.fromTag`           | Defines the `fromTag` which describes the lower bound to process pull requests for                                        |
| `outputs.toTag`             | Defines the `toTag` which describes the upper bound to process pull request for                                           |
| `outputs.failed`            | Defines if there was an issue with the action run, and the changelog may not have been generated correctly. [true, false] |
| `outputs.pull_requests`     | Defines a `,` joined array with all PR IDs associated with the generated changelog.                                       |
| `outputs.categorized_prs`   | Count of PRs which were successfully categorized as part of the action.                                                   |
| `outputs.open_prs` | Count of open PRs. Only fetched if `includeOpen` is enabled.                                                                       |
| `outputs.uncategorized_prs` | Count of PRs which were not categorized as part of the action.                                                            |
| `outputs.changed_files`     | Count of changed files in this release.                                                                                   |
| `outputs.additions`         | Count of code additions in this release (lines).                                                                          |
| `outputs.deletions`         | Count of code deletions in this release (lines).                                                                          |
| `outputs.changes`           | Total count of changes in this release (lines).                                                                           |
| `outputs.commits`           | Count of commits which have been added in this release.                                                                   |


## Full Sample 🖥️

Below is a complete example showcasing how to define a build, which is executed when tagging the project. It consists of:
- Prepare tag, via the GITHUB_REF environment variable
- Build changelog, given the tag
- Create release on GitHub - specifying body with constructed changelog

> Note: PRs will only show up in the changelog if assigned one of the default label categories "feature", "fix" or "test"

<details><summary><b>Example</b></summary>
<p>

```yml
name: 'CI'
on:
  push:
    tags:
      - '*'

jobs:
  release:
    if: startsWith(github.ref, 'refs/tags/')
    runs-on: ubuntu-latest
    steps:
      - name: Build Changelog
        id: github_release
        uses: mikepenz/release-changelog-builder-action@v3
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}

      - name: Create Release
        uses: mikepenz/action-gh-release@v0.2.0-a03 #softprops/action-gh-release
        with:
          body: ${{steps.github_release.outputs.changelog}}
```

</p>
</details>

<details><summary><b>Example w/ Configuration</b></summary>
<p>

```yml
jobs:
  release:
    if: startsWith(github.ref, 'refs/tags/')
    runs-on: ubuntu-latest
    steps:
      - name: Build Changelog
        uses: mikepenz/release-changelog-builder-action@v3
        with:
          configurationJson: |
            {
              "template": "#{{CHANGELOG}}\n\n<details>\n<summary>Uncategorized</summary>\n\n#{{UNCATEGORIZED}}\n</details>",
              "categories": [
                {
                    "title": "## 💬 Other",
                    "labels": ["other"]
                },
                {
                    "title": "## 📦 Dependencies",
                    "labels": ["dependencies"]
                }
              ]
            }
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

</p>
</details>

## Customization 🖍️

### Note

> **Warning**: When running this action for non tags trigger the `toTag` will be automatically resolved using the latest tag as retrieved by the git API.

> **Note**: The first release tag is a special case since there is no previous release the action can reference to. For this case, there are 2 options:
> 1. When checking out the source via `git` (E.g.: `actions/checkout`), the action will use the first commit.
> 2. Create a initial tag on the commit you want to begin a changelog from (for example `v0.0.1`).

> **Note**: By default not specifying `fromTag` or `toTag` will resolve `toTag` from either the `ref` or alternatively fallback to the latest tag from the git API. `fromTag` is resolved by sorting tags using [semver](https://semver.org/). Check the [configuration](#configuration-specification) for alternatives.

> **Note**: If you are behind a corporate HTTP proxy, you can set the `https_proxy` environment variable to the proxy URL. For reference, please see the Octokit [documentation](https://github.com/octokit/octokit.js/#proxy-servers-nodejs-only).

### Configuration

The action supports flexible configuration options to modify vast areas of its behavior. To do so, provide the configuration file to the workflow using the `configuration` setting.

```yml
- name: "Build Changelog"
  uses: mikepenz/release-changelog-builder-action@{latest-release}
  with:
    configuration: "configuration.json"
  env:
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

> **Note** Defaults for the configuration can be found in the [configuration.ts](https://github.com/mikepenz/release-changelog-builder-action/blob/develop/src/configuration.ts)

> **Warning** It is required to have a `checkout` step prior to the changelog step if `configuration` is used, to allow the action to discover the configuration file. Use `configurationJson` as alternative.

> **Note** It is possible to provide the configuration as file and as json via the yml file. The order of config values used: `configurationJson` > `configuration` > `DefaultConfiguration`. 

This configuration is a `JSON` in the following format. (The below showcases *example* configurations for all possible options. In most scenarios most of the settings will not be needed, and the defaults will be appropiate.)

```json
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
      },
      {
        "title": "## 🧪 Tests and some 🪄 Magic",
        "labels": ["test", "magic"],
        "exclude_labels": ["no-magic"],
        "exhaustive": true,
        "exhaustive_rules": "false",
        "empty_content": "- no matching PRs",
        "rules": [
          {
            "pattern": "open",
            "on_property": "status",
            "flags": "gu"
          }
        ]
      }
    ],
    "ignore_labels": [
      "ignore"
    ],
    "sort": {
      "order": "ASC",
      "on_property": "mergedAt"
    },
    "template": "${{CHANGELOG}}\n\n<details>\n<summary>Uncategorized</summary>\n\n${{UNCATEGORIZED}}\n</details>",
    "pr_template": "- ${{TITLE}}\n   - PR: #${{NUMBER}}",
    "empty_template": "- no changes",
    "label_extractor": [
      {
        "pattern": "(.) (.+)",
        "target": "$1",
        "flags": "gu"
      },
      {
        "pattern": "\\[Issue\\]",
        "on_property": "title",
        "method": "match"
      }
    ],
    "duplicate_filter": {
      "pattern": "\\[ABC-....\\]",
      "on_property": "title",
      "method": "match"
    },
    "transformers": [
      {
        "pattern": "[\\-\\*] (\\[(...|TEST|CI|SKIP)\\])( )?(.+?)\n(.+?[\\-\\*] )(.+)",
        "target": "- $4\n  - $6"
      }
    ],
    "trim_values": false,
    "max_tags_to_fetch": 200,
    "max_pull_requests": 200,
    "max_back_track_time_days": 365,
    "exclude_merge_branches": [
      "Owner/qa"
    ],
    "tag_resolver": {
      "method": "semver",
      "filter": {
        "pattern": "api-(.+)",
        "flags": "gu"
      }
    },
    "base_branches": [
      "dev"
    ]
}
```

Any section of the configuration can be omitted to have defaults apply.

> **Warning**: `ignore_labels` take precedence over category labels, allowing to specifically exclude certain PRs.

Please see the [Configuration Specification](#configuration-specification) for detailed descriptions on the offered configuration options.

### Advanced workflow specification

For advanced use cases additional settings can be provided to the action

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
    fromTag: "0.3.0"
    toTag: "0.5.0"
    token: ${{ secrets.PAT }}
```

> **Note**: All input values are optional. It is only required to provide the `token` either via the input, or as `env` variable.

| **Input**                 | **Description**                                                                                                                                                             |
|---------------------------|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `configurationJson`       | Provide the configuration directly via the build `yml` file. Please note that `${{}}`  has to be written as `#{{}}` within the `yml` file.                                  |
| `configuration`           | Relative path, to the `configuration.json` file, providing additional configurations                                                                                        |
| `outputFile`              | Optional relative path to a file to store the resulting changelog in.                                                                                                       |
| `owner`                   | The owner of the repository to generate the changelog for                                                                                                                   |
| `repo`                    | Name of the repository we want to process                                                                                                                                   |
| `fromTag`                 | Defines the 'start' from where the changelog will consider merged pull requests (can be a tag or a valid git ref)                                                           |
| `toTag`                   | Defines until which tag the changelog will consider merged pull requests  (can be a tag or a valid git ref)                                                                 |
| `path`                    | Allows to specify an alternative sub directory, to use as base                                                                                                              |
| `token`                   | Alternative config to specify token. You should prefer `env.GITHUB_TOKEN` instead though                                                                                    |
| `baseUrl`                 | Alternative config to specify base url for GitHub Enterprise authentication. Default value set to `https://api.github.com`                                                  |
| `includeOpen`             | Enables to also fetch currently open PRs. Default: false                                                                                                                    |
| `ignorePreReleases`       | Allows to ignore pre-releases for changelog generation (E.g. for 1.0.1... 1.0.0-rc02 <- ignore, 1.0.0 <- pick). Only used if `fromTag` was not specified. Default: false    |
| `failOnError`             | Defines if the action will result in a build failure if problems occurred. Default: false                                                                                   |
| `fetchReviewers`          | Will enable fetching the users/reviewers who approved the PR. Default: false                                                                                                |
| `fetchReleaseInformation` | Will enable fetching additional release information from tags. Default: false                                                                                               |
| `fetchReviews`            | Will enable fetching the reviews on of the PR. Default: false                                                                                                               |
| `commitMode`              | Special configuration for projects which work without PRs. Uses commit messages as changelog. This mode looses access to information only available for PRs. Default: false |

> **Warning**: `${{ secrets.GITHUB_TOKEN }}` only grants rights to the current repository, for other repositories please use a PAT (Personal Access Token).

### PR Template placeholders

Table of supported placeholders allowed to be used in the `pr_template` configuration, which will be included in the release notes / changelog.

| **Placeholder**   | **Description**                                                                                    |
|-------------------|----------------------------------------------------------------------------------------------------|
| `${{NUMBER}}`     | The number referencing this pull request. E.g. 13.                                                 |
| `${{TITLE}}`      | Specified title of the merged pull request.                                                        |
| `${{URL}}`        | Url linking to the pull request on GitHub.                                                         |
| `${{STATUS}}`     | Status of the PR. Usually always `merged`. Possibly `Open` if `includeOpen` is configured.         |
| `${{CREATED_AT}}` | The ISO time, the pull request was created at.                                                     |
| `${{MERGED_AT}}`  | The ISO time, the pull request was merged at.                                                      |
| `${{MERGE_SHA}}`  | The commit SHA, the pull request was merged with.                                                  |
| `${{AUTHOR}}`     | Author creating and opening the pull request.                                                      |
| `${{LABELS}}`     | The labels associated with this pull request, joined by `,`.                                       |
| `${{MILESTONE}}`  | Milestone this PR was part of, as assigned on GitHub.                                              |
| `${{BODY}}`       | Description/Body of the pull request as specified on GitHub.                                       |
| `${{ASSIGNEES}}`  | Login names of assigned GitHub users, joined by `,`.                                               |
| `${{REVIEWERS}}`  | GitHub Login names of specified reviewers, joined by `,`. Requires `fetchReviewers` to be enabled. |
| `${{APPROVERS}}`  | GitHub Login names of users who approved the PR, joined by `,`.                                    |


<details><summary><b>Array Placeholders</b></summary>
<p>

Table of special array placeholders allowed to be used in the `pr_template` configuration.

Array placeholders follow the following format: `(KEY)[(*/index)]` for example: `ASSIGNEES[*]` or `ASSIGNEES[0]`.
When using `*` values are joined by `,`.

| **Placeholder**     | **Description**                                                                     |
|---------------------|-------------------------------------------------------------------------------------|
| `${{ASSIGNEES[*]}}` | Login names of assigned GitHub users.                                               |
| `${{REVIEWERS[*]}}` | GitHub Login names of specified reviewers. Requires `fetchReviewers` to be enabled. |
| `${{APPROVERS[*]}}` | GitHub Login names of users who approved the PR.                                    |

Additionally there is a special array placeholder `REVIEWS` which allows access to it's properties:
`(KEY)[(*/index)].(property)` for example: `REVIEWS[*].author` or `REVIEWS[*].body`

| **Placeholder**               | **Description**                            |
|-------------------------------|--------------------------------------------|
| `${{REVIEWS[*].author}}`      | GitHub Login names of specified reviewers. |
| `${{REVIEWS[*].body}}`        | The body of the review.                    |
| `${{REVIEWS[*].htmlURL}}`     | The URL to the given review.               |
| `${{REVIEWS[*].submittedAt}}` | The date whent he review was submitted.    |
| `${{REVIEWS[*].state}}`       | The state of the given review.             |

</p>
</details>



### Template placeholders

Table of supported placeholders allowed to be used in the `template` and `empty_template` (only supports placeholder marked for empty) configuration, to give additional control on defining the contents of the release notes / changelog.

| **Placeholder**            | **Description**                                                                                    | **Empty** |
|----------------------------|----------------------------------------------------------------------------------------------------|:---------:|
| `${{CHANGELOG}}`           | The contents of the changelog, matching the labels as specified in the categories configuration    |           |
| `${{UNCATEGORIZED}}`       | All pull requests not matching a specified label in categories                                     |           |
| `${{OPEN}}`                | All open pull requests. Will only be fetched if `includeOpen` is enabled.                          |           |
| `${{IGNORED}}`             | All pull requests defining labels matching the `ignore_labels` configuration                       |           |
| `${{OWNER}}`               | Describes the owner of the repository the changelog was generated for                              | x         |
| `${{REPO}}`                | The repository name of the repo the changelog was generated for                                    | x         |
| `${{FROM_TAG}}`            | Defines the 'start' from where the changelog did consider merged pull requests                     | x         |
| `${{FROM_TAG_DATE}}`       | Defines the date at which the 'start' tag was created. Requires `fetchReleaseInformation`.         | x         |
| `${{TO_TAG}}`              | Defines until which tag the changelog did consider merged pull requests                            | x         |
| `${{TO_TAG_DATE}}`         | Defines the date at which the 'until' tag was created. Requires `fetchReleaseInformation`.         | x         |
| `${{RELEASE_DIFF}}`        | Introduces a link to the full diff between from tag and to tag releases                            | x         |
| `${{CHANGED_FILES}}`       | The count of changed files.                                                                        |           |
| `${{ADDITIONS}}`           | The count of code additions (lines).                                                               |           |
| `${{DELETIONS}}`           | The count of code deletions (lines).                                                               |           |
| `${{CHANGES}}`             | The count of total changes (lines).                                                                |           |
| `${{COMMITS}}`             | The count of commits in this release.                                                              |           |
| `${{CATEGORIZED_COUNT}}`   | The count of PRs which were categorized                                                            |           |
| `${{UNCATEGORIZED_COUNT}}` | The count of PRs and changes which were not categorized. No label overlapping with category labels |           |
| `${{OPEN_COUNT}}`          | The count of open PRs. Will only be fetched if `includeOpen` is configured.                        |           |
| `${{IGNORED_COUNT}}`       | The count of PRs and changes which were specifically ignored from the changelog.                   |           |
| `${{DAYS_SINCE}}`          | Days between the 2 releases. Requires `fetchReleaseInformation` to be enabled.                     | x         |

### Configuration Specification

Table of descriptions for the `configuration.json` options to configure the resulting release notes / changelog.

| **Input**                   | **Description**                                                                                                                                                                                                                    |
|-----------------------------|------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| categories                  | An array of `category` specifications, offering a flexible way to group changes into categories.                                                                                                                                   |
| category.title              | The display name of a category in the changelog.                                                                                                                                                                                   |
| category.labels             | An array of labels, to match pull request labels against. If any PR label matches any category label, the pull request will show up under this category. (See `exhaustive` to change this)                                         |
| category.exclude_labels     | Similar to `labels`, an array of labels to match PRs against, but if a match occurs the PR is excluded from this category.                                                                                                         |
| category.exhaustive         | Will require all labels defined within this category to be present on the matching PR.                                                                                                                                             |
| category.exhaustive_rules    | Will require all rules defined within this category to be valid on the matching PR. If not defined, defaults to the value of `exhaustive`                                                                                                                                             |
| category.empty_content      | If the category has no matching PRs, this content will be used. When not set, the category will be skipped in the changelog.                                                                                                       |
| category.rules              | An array of `rules` used to match PRs against. Any match will include the PR. (See `exhaustive` to change this)                                                                                                                    |
| category.rules.pattern      | A `regex` pattern to match the property value towards. Uses `RegExp.test("val")`                                                                                                                                                   |
| category.rules.flags        | Defines the regex flags specified for the pattern. Default: `gu`.                                                                                                                                                                  |
| category.rules.on_property  | The PR property to match against. [Possible values](https://github.com/mikepenz/release-changelog-builder-action/blob/develop/src/configuration.ts#L33-L43).                                                        |
| ignore_labels               | An array of labels, to match pull request labels against. If any PR label overlaps, the pull request will be ignored from the changelog. This takes precedence over category labels                                                |
| sort                        | A `sort` specification, offering the ability to define sort order and property.                                                                                                                                                    |
| sort.order                  | The sort order. Allowed values: `ASC`, `DESC`                                                                                                                                                                                      |
| sort.on_property            | The property to sort on. Allowed values: `mergedAt`, `title`                                                                                                                                                                       |
| template                    | Specifies the global template to pick for creating the changelog. See [Template placeholders](#template-placeholders) for possible values                                                                                          |
| pr_template                 | Defines the per pull request template. See [PR Template placeholders](#pr-template-placeholders) for possible values                                                                                                               |
| empty_template              | Template to pick if no changes are detected. See [Template placeholders](#template-placeholders) for possible values                                                                                                               |
| label_extractor             | An array of `Extractor` specifications, offering a flexible API to extract additinal labels from a PR (Default: `body`, Default in commit mode: `commit message`).                                                                 |
| label_extractor.pattern     | A `regex` pattern, extracting values of the change message.                                                                                                                                                                        |
| label_extractor.target      | The result pattern. The result text will be used as label. If empty, no label is created. (Unused for `match` method)                                                                                                              |
| label_extractor.on_property | The property to retrieve the text from. This is optional. Defaults to: `body`. Alternative values: `title`, `author`, `milestone`.                                                                                                 |
| label_extractor.method      | The extraction method used. Defaults to: `replace`. Alternative value: `match`. The method specified references the JavaScript String method.                                                                                      |
| label_extractor.flags       | Defines the regex flags specified for the pattern. Default: `gu`.                                                                                                                                                                  |
| label_extractor.on_empty    | Defines the placeholder to be filled in, if the regex does not lead to a result.                                                                                                                                                   |
| duplicate_filter            | Defines the `Extractor` to use for retrieving the identifier for a PR. In case of duplicates will keep the last matching pull request (depends on `sort`). See `label_extractor` for details on `Extractor` properties.            |
| transformers                | An array of `transform` specifications, offering a flexible API to modify the text per pull request. This is applied on the change text created with `pr_template`. `transformers` are executed per change, in the order specified |
| transformer.pattern         | A `regex` pattern, extracting values of the change message.                                                                                                                                                                        |
| transformer.target          | The result pattern, the regex groups will be filled into. Allows for full transformation of a pull request message. Including potentially specified texts                                                                          |
| max_tags_to_fetch           | The maximum amount of tags to load from the API to find the previous tag. Loaded paginated with 100 per page                                                                                                                       |
| max_pull_requests           | The maximum amount of pull requests to load from the API. Loaded paginated with 30 per page                                                                                                                                        |
| max_back_track_time_days    | Defines the max amount of days to go back in time per changelog                                                                                                                                                                    |
| exclude_merge_branches      | An array of branches to be ignored from processing as merge commits                                                                                                                                                                |
| tag_resolver                | Section to provide configuration for the tag resolving logic. Used if no `fromTag` is provided                                                                                                                                     |
| tag_resolver.method         | Defines the method to use. Current options are: `semver`, `sort`. Default: `semver`                                                                                                                                                |
| tag_resolver.filter         | Defines a regex which is used to filter out tags not matching.                                                                                                                                                                     |
| tag_resolver.transformer    | Defines a regex transformer used to optionally transform the tag after the filter was applied. Allows to adjust the format to e.g. semver.                                                                                         |
| base_branches               | The target branches for the merged PR, ingnores PRs with different target branch. Values can be a `regex`. Default: allow all base branches                                                                                        |
| trim_values                 | Defines if all values inserted in templates are `trimmed`. Default: false                                                                                                                                                          |

## Experimental 🧪

Starting with v3.2.0 the action provides an experimental feature of defining `CUSTOM_PLACEHOLDERS`. 
Custom placeholders allow to extract values from any existing placeholder and insert them into the target template.

<details><summary><b>Example</b></summary>
<p>

Custom placeholders can be defined via the `configuration.json` as `custom_placeholders`. See the below example json:

```json
{
  "template": "**Epics**\n${{EPIC[*]}}\n\n${{CHANGELOG}}",
  "pr_template": "- ${{TITLE}} - ${{URL}} ${{EPIC}}",
  "custom_placeholders": [
    {
      "name": "EPIC",
      "source": "BODY",
      "transformer": {
        "pattern": "[\\S\\s]*?(https:\\/\\/corp\\.atlassian\\.net\\/browse\\/EPIC-.{2,4})[\\S\\s]*",
        "target": "- $1"
      }
    }
  ]
}
```

This example will look for JIRA tickets in the EPIC project, and extract all of these tickets. The exciting part for that case is, that the ticket is PR bound, but can be used in the global TEMPLATE, but equally also in the PR template. This is unique for CUSTOM PLACEHOLDERS as standard palceholders do not offer this functionality. 

| **Input**                       | **Description**                                                                                                              |
|---------------------------------|------------------------------------------------------------------------------------------------------------------------------|
| custom_placeholders             | An array of `Placeholder` specifications, offering a flexible API to extract custom placeholders from existing placeholders. |
| custom_placeholders.name        | The name of the custom placeholder. Will be used within the template.                                                        |
| custom_placeholders.source      | The source PLACEHOLDER, requires to be one of the existing Template or PR Template placeholders.                             |
| custom_placeholders.transformer | The transformer specification used to extract the value from the original source PLACEHOLDER.                                |

A placeholder with the name as `CUSTOM_PLACEHOLDER` can be used as `${{CUSTOM_PLACEHOLDER}}` in the target template. 
By default the same restriction applies as for PR vs template placeholder. E.g. a global placeholder can only be used in the global template (and not in the PR template).

Custom placeholders offer one new feature though. PR related placeholders can be used in the global template via the following syntax:

- `CUSTOM_PLACEHOLDER[*]` - Will join all found values and insert them at the given location in the global template
- `CUSTOM_PLACEHOLDER[0]` / `CUSTOM_PLACEHOLDER[index]` - Will insert the first found value (item at index) into the global template

</p>
</details>

## Contribute 🧬

```bash
# Install the dependencies
$ npm install

# Verify lint is happy
$ npm run lint -- --fix

# Build the typescript and package it for distribution
$ npm run build && npm run package

# Run the tests, use to debug, and test it out
$ npm test
```

It's suggested to export the token to your path before running the tests so that API calls can be done to GitHub.

```bash
export GITHUB_TOKEN=your_personal_github_pat
```

## Local Testing 🧪

This GitHub action is fully developed in Typescript and can be run locally via npm. Doing so is a great way to test the action and/or your custom configurations locally, without the need to push and re-run GitHub actions over and over again.

To run this action locally, first make sure you provide a `GITHUB_TOKEN` with enough permissions to access the repository. 

```
# GitHub token for the action
export GITHUB_TOKEN=your_read_only_github_token
```

Afterwards run the testcases with:

```bash
npm test -- custom.test.ts
```

<details><summary><b>custom.test.ts</b></summary>
<p>

```typescript
import {resolveConfiguration} from '../src/utils'
import {ReleaseNotesBuilder} from '../src/releaseNotesBuilder'

jest.setTimeout(180000)

it('Test custom changelog builder', async () => {
  const configuration = resolveConfiguration(
    '',
    'configs_test/configuration_approvers.json'
  )
  const releaseNotesBuilder = new ReleaseNotesBuilder(
    null, // baseUrl
    null, // token
    '.',  // repoPath
    'mikepenz',                                         // user
    'release-changelog-builder-action-playground',      // repo
    '1.5.0',         // fromTag
    '2.0.0',         // toTag
    true,   // includeOpen
    false, // failOnError
    false, // ignorePrePrelease
    true,  // enable to fetch reviewers
    false, // enable to fetch release information
    false, // enable to fetch reviews
    false, // commitMode
    configuration  // configuration
  )

  const changeLog = await releaseNotesBuilder.build()
  console.log(changeLog)
  expect(changeLog).toStrictEqual(``)
})
```

</p>
</details>

Additionally it is possible to do full debugging including the option of breakpoints via (for example) Visual Code. 
Open the project in Visual code -> open the terminal -> use the `+` and start a new `JavaScript Debug Terminal`. Afterwards run the tests as described above. 

## Developed By

* Mike Penz
 * [mikepenz.com](http://mikepenz.com) - <mikepenz@gmail.com>
 * [paypal.me/mikepenz](http://paypal.me/mikepenz)

## Credits

- Core parts of the PR fetching logic are based on [pull-release-notes](https://github.com/nblagoev/pull-release-notes)
  - Nikolay Blagoev - [GitHub](https://github.com/nblagoev/)
- [action-gh-release](https://github.com/softprops/action-gh-release) for a few great README ideas

## Other actions

- [xray-action](https://github.com/mikepenz/xray-action/)
- [action-junit-report](https://github.com/mikepenz/action-junit-report)
- [jira-release-composition-action](https://github.com/mikepenz/jira-release-composite-action)

## License

    Copyright for portions of pr-release-notes are held by Nikolay Blagoev, 2019-2020 as part of project pull-release-notes.
    All other copyright for project pr-release-notes are held by Mike Penz, 2021.

## Fork License

All patches and changes applied to the original source are licensed under the Apache 2.0 license.

    Copyright 2022 Mike Penz

    Licensed under the Apache License, Version 2.0 (the "License");
    you may not use this file except in compliance with the License.
    You may obtain a copy of the License at

       http://www.apache.org/licenses/LICENSE-2.0

    Unless required by applicable law or agreed to in writing, software
    distributed under the License is distributed on an "AS IS" BASIS,
    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
    See the License for the specific language governing permissions and
    limitations under the License.

## Sample result release notes / changelog

<div align="center">
  <a href="https://github.com/mikepenz/release-changelog-builder-action/runs/1270879787"><img src="https://raw.githubusercontent.com/mikepenz/release-changelog-builder-action/develop/.github/images/release_changelog_builder_expanded.png"/></a>
</div>

<div align="center">
  <a href="https://github.com/mikepenz/release-changelog-builder-action/releases/tag/v0.9.0"><img src="https://raw.githubusercontent.com/mikepenz/release-changelog-builder-action/develop/.github/images/release_changelog_result.png"/></a>
</div>
