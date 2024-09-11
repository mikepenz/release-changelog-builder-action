<div align="center">
  :octocat:📄🔖📦
</div>
<h1 align="center">
  release-changelog-builder-action
</h1>

<p align="center">
    ... a GitHub action that builds your release notes / changelog fast simple and exactly the way you want.
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

## Full Sample 🖥️

Below is a complete example showcasing how to define a build, which is executed when tagging the project. It consists of:
- Prepare tag, via the GITHUB_REF environment variable
- Build changelog, given the tag
- Create a release on GitHub - specifying body with a constructed changelog

> [!NOTE]  
> Pre v4 PRs will only show up in the changelog if assigned one of the default label categories "feature", "fix" or "test". Starting with v4 these PRs will be in the `Uncategorized` section.

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
        uses: mikepenz/release-changelog-builder-action@v5
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
        uses: mikepenz/release-changelog-builder-action@v5
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


<details><summary><b>Example Commit Mode w/ Configuration</b></summary>
<p>

```yml
jobs:
  release:
    if: startsWith(github.ref, 'refs/tags/')
    runs-on: ubuntu-latest
    steps:
      - name: Build Changelog
        uses: mikepenz/release-changelog-builder-action@v5
        with:
          mode: "COMMIT"
          configurationJson: |
            {
              "template": "#{{CHANGELOG}}",
              "categories": [
                {
                    "title": "## Feature",
                    "labels": ["feat", "feature"]
                },
                {
                    "title": "## Fix",
                    "labels": ["fix", "bug"]
                },
                {
                    "title": "## Other",
                    "labels": []
                }
              ],
              "label_extractor": [
                {
                  "pattern": "^(build|chore|ci|docs|feat|fix|perf|refactor|revert|style|test){1}(\\([\\w\\-\\.]+\\))?(!)?: ([\\w ])+([\\s\\S]*)",
                  "target": "$1"
                }
              ],
            }
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

This example defines a regex to extract the label from the commit message. Handling flags from the [Conventional Commit Standards](https://www.conventionalcommits.org/en/v1.0.0/).

</p>
</details>

## Action Inputs/Outputs

### Action inputs

Depending on the use-case additional settings can be provided to the action

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

> [!NOTE]  
> All input values are optional. It is only required to provide the `token` either via the input, or as `env` variable.

| **Input**                 | **Description**                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
|---------------------------|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `configurationJson`       | Provide the configuration directly via the build `yml` file. Please note that `${{}}`  has to be written as `#{{}}` within the `yml` file.                                                                                                                                                                                                                                                                                                                                                                                  |
| `configuration`           | Relative path, to the `configuration.json` file, providing additional configurations                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| `outputFile`              | Optional relative path to a file to store the resulting changelog in.                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `owner`                   | The owner of the repository to generate the changelog for                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| `repo`                    | Name of the repository we want to process                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| `fromTag`                 | Defines the 'start' from where the changelog will consider merged pull requests (can be a tag or a valid git ref)                                                                                                                                                                                                                                                                                                                                                                                                           |
| `toTag`                   | Defines until which tag the changelog will consider merged pull requests  (can be a tag or a valid git ref)                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `path`                    | Allows to specify an alternative sub directory, to use as base                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| `token`                   | Alternative config to specify token. You should prefer `env.GITHUB_TOKEN` instead though                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| `baseUrl`                 | Alternative config to specify base url for GitHub Enterprise authentication. Default value set to `https://api.github.com`                                                                                                                                                                                                                                                                                                                                                                                                  |
| `includeOpen`             | Enables to also fetch currently open PRs. Default: false                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| `ignorePreReleases`       | Allows to ignore pre-releases for changelog generation (E.g. for 1.0.1... 1.0.0-rc02 <- ignore, 1.0.0 <- pick). Only used if `fromTag` was not specified. Default: false                                                                                                                                                                                                                                                                                                                                                    |
| `failOnError`             | Defines if the action will result in a build failure if problems occurred. Default: false                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| `fetchViaCommits`         | Enables PRs to get fetched via the commits identified between from->to tag. This will do 1 API request per commit -> Best for scenarios with squash merges                                                                                                                                                                                                                                                                                                                                                                  | Or shorter from->to diffs (< 10 commits) | Also effective for shorters diffs for very old PRs. Default: false                                                                                                |
| `fetchReviewers`          | Will enable fetching the users/reviewers who approved the PR. Default: false                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| `fetchReleaseInformation` | Will enable fetching additional release information from tags. Default: false                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| `fetchReviews`            | Will enable fetching the reviews on of the PR. Default: false                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| `mode`                    | Defines the mode used to retrieve the information. Available options: [`PR`, `COMMIT`, `HYBRID`]. Defaults to `PR`. Hybrid mode treats commits like pull requests.  Commit mode is a special configuration for projects which work without PRs. Uses commit messages as changelog. This mode looses access to information only available for PRs. Formerly set as `commitMode: true`, this setting is now deprecated and should be converted to `mode: "COMMIT"`. Note: the commit or hybrid modes are not fully supported. |
| `exportCache`             | Will enable exporting the fetched PR information to a cache, which can be re-used by later runs. Default: false                                                                                                                                                                                                                                                                                                                                                                                                             |
| `exportOnly`              | When enabled, will result in only exporting the cache, without generating a changelog. Default: false (Requires `exportCache` to be enabled)                                                                                                                                                                                                                                                                                                                                                                                |
| `cache`                   | The file path to write/read the cache to/from.                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |

> [!WARNING]  
> `${{ secrets.GITHUB_TOKEN }}` only grants rights to the current repository, for other repositories please use a PAT (Personal Access Token).


### Action outputs

After action execution it will return the `changelog` and additional information as step output. You can use it in any follow-up step by referencing the output by referencing it via the id of the step. For example `build_changelog`.

```yml
# ${{steps.{CHANGELOG_STEP_ID}.outputs.changelog}}
${{steps.build_changelog.outputs.changelog}}
```

A full set list of possible output values for this action.

| **Output**                  | **Description**                                                                                                           |
|-----------------------------|---------------------------------------------------------------------------------------------------------------------------|
| `outputs.changelog`         | The built release changelog built from the merged pull requests                                                           |
| `outputs.owner`             | Specifies the owner of the repository processed                                                                           |
| `outputs.repo`              | Describes the repository name, which was processed                                                                        |
| `outputs.fromTag`           | Defines the `fromTag` which describes the lower bound to process pull requests for                                        |
| `outputs.toTag`             | Defines the `toTag` which describes the upper bound to process pull request for                                           |
| `outputs.failed`            | Defines if there was an issue with the action run, and the changelog may not have been generated correctly. [true, false] |
| `outputs.pull_requests`     | Defines a `,` joined array with all PR IDs associated with the generated changelog.                                       |
| `outputs.categorized_prs`   | Count of PRs which were successfully categorized as part of the action.                                                   |
| `outputs.open_prs`          | Count of open PRs. Only fetched if `includeOpen` is enabled.                                                              |
| `outputs.uncategorized_prs` | Count of PRs which were not categorized as part of the action.                                                            |
| `outputs.changed_files`     | Count of changed files in this release.                                                                                   |
| `outputs.additions`         | Count of code additions in this release (lines).                                                                          |
| `outputs.deletions`         | Count of code deletions in this release (lines).                                                                          |
| `outputs.changes`           | Total count of changes in this release (lines).                                                                           |
| `outputs.commits`           | Count of commits which have been added in this release.                                                                   |
| `outputs.contributors`      | The contributors of this release. Based on PR authors only.                                                               |
| `outputs.categorized`       | The categorized pull requests used to build the changelog as serialized JSON.                                             |
| `outputs.cache`             | The file pointing to the cache for the current fetched data. Can be provided to another action step.                      |

## Customization 🖍️

### Note

> [!IMPORTANT]  
> When running this action for non tags trigger the `toTag` will be automatically resolved using the latest tag as retrieved by the git API.

> [!NOTE]  
> The first release tag is a special case since there is no previous release the action can reference to. For this case, there are two options:
> 1. When checking out the source via `git` (E.g.: `actions/checkout`), the action will use the first commit.
> 2. Create an initial tag on the commit you want to begin a changelog from (for example `v0.0.1`).

> [!NOTE]  
> By default not specifying `fromTag` or `toTag` will resolve `toTag` from either the `ref` or alternatively fallback to the latest tag from the git API. `fromTag` is resolved by sorting tags using [semver](https://semver.org/). Check the [configuration](#configuration-specification) for alternatives.

> [!NOTE]  
> If you are behind a corporate HTTP proxy, you can set the `https_proxy` environment variable to the proxy URL. For reference, please see the Octokit [documentation](https://github.com/octokit/octokit.js/#proxy-servers-nodejs-only).

### Configuration

The action supports flexible and extensive configuration options to fine-tune it for the specific projects needs. To do so provide the configuration either directly to the step via `configurationJson` or as file via the `configuration`.

<details><summary><b>Configuration in .yml</b></summary>
<p>

```yml
- name: Build Changelog
  uses: mikepenz/release-changelog-builder-action@v5
  with:
    configurationJson: |
      {
        "template": "#{{CHANGELOG}}\n\n<details>\n<summary>Uncategorized</summary>\n\n#{{UNCATEGORIZED}}\n</details>",
        "categories": [
          {
              "title": "## 💬 Other",
              "labels": ["other"]
          }
        ]
      }
```

</p>
</details>

<details><summary><b>Configuration as json file</b></summary>
<p>

```yml
- name: "Build Changelog"
  uses: mikepenz/release-changelog-builder-action@{latest-release}
  with:
    configuration: "configuration.json"
```

> [!WARNING]  
> It is required to have a `checkout` step prior to the changelog step if `configuration` is used, to allow the action to discover the configuration file. Use `configurationJson` as alternative.

</p>
</details>

> [!NOTE]  
> Defaults for the configuration can be found in the [configuration.ts](https://github.com/mikepenz/release-changelog-builder-action/blob/develop/src/configuration.ts)

> [!NOTE]  
> It is possible to provide the configuration as file and as json via the yml file. The order of config values used: `configurationJson` > `configuration` > `DefaultConfiguration`.

The configuration is a `JSON` in the following format. (The below showcases *example* configurations for all possible options. In most scenarios most of the settings will not be needed, and the defaults will be appropriate.)

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
        "key": "tests",
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
    "template": "#{{CHANGELOG}}\n\n<details>\n<summary>Uncategorized</summary>\n\n#{{UNCATEGORIZED}}\n</details>",
    "pr_template": "- #{{TITLE}}\n   - PR: ##{{NUMBER}}",
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
    "reference": {
      "pattern": ".*\\ \\#(.).*",
      "on_property": "body",
      "method": "replace",
      "target": "$1"
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

> [!WARNING]  
> `ignore_labels` take precedence over category labels, allowing to specifically exclude certain PRs.

Please see the [Configuration Specification](#configuration-specification) for detailed descriptions on the offered configuration options.


### Template placeholders

Table of supported placeholders allowed to be used in the `template` and `empty_template` (only supports placeholder marked for empty) configuration, to give additional control on defining the contents of the release notes / changelog.

| **Placeholder**            | **Description**                                                                                    | **Empty** |
|----------------------------|----------------------------------------------------------------------------------------------------|:---------:|
| `#{{CHANGELOG}}`           | The contents of the changelog, matching the labels as specified in the categories configuration    |           |
| `#{{UNCATEGORIZED}}`       | All pull requests not matching a specified label in categories                                     |           |
| `#{{OPEN}}`                | All open pull requests. Will only be fetched if `includeOpen` is enabled.                          |           |
| `#{{IGNORED}}`             | All pull requests defining labels matching the `ignore_labels` configuration                       |           |
| `#{{OWNER}}`               | Describes the owner of the repository the changelog was generated for                              |     x     |
| `#{{REPO}}`                | The repository name of the repo the changelog was generated for                                    |     x     |
| `#{{FROM_TAG}}`            | Defines the 'start' from where the changelog did consider merged pull requests                     |     x     |
| `#{{FROM_TAG_DATE}}`       | Defines the date at which the 'start' tag was created. Requires `fetchReleaseInformation`.         |     x     |
| `#{{TO_TAG}}`              | Defines until which tag the changelog did consider merged pull requests                            |     x     |
| `#{{TO_TAG_DATE}}`         | Defines the date at which the 'until' tag was created. Requires `fetchReleaseInformation`.         |     x     |
| `#{{RELEASE_DIFF}}`        | Introduces a link to the full diff between from tag and to tag releases                            |     x     |
| `#{{CHANGED_FILES}}`       | The count of changed files.                                                                        |           |
| `#{{ADDITIONS}}`           | The count of code additions (lines).                                                               |           |
| `#{{DELETIONS}}`           | The count of code deletions (lines).                                                               |           |
| `#{{CHANGES}}`             | The count of total changes (lines).                                                                |           |
| `#{{COMMITS}}`             | The count of commits in this release.                                                              |           |
| `#{{CONTRIBUTORS}}`        | The contributors of this release. Based on PR Authors only.                                        |           |
| `#{{CATEGORIZED_COUNT}}`   | The count of PRs which were categorized                                                            |           |
| `#{{UNCATEGORIZED_COUNT}}` | The count of PRs and changes which were not categorized. No label overlapping with category labels |           |
| `#{{OPEN_COUNT}}`          | The count of open PRs. Will only be fetched if `includeOpen` is configured.                        |           |
| `#{{IGNORED_COUNT}}`       | The count of PRs and changes which were specifically ignored from the changelog.                   |           |
| `#{{DAYS_SINCE}}`          | Days between the 2 releases. Requires `fetchReleaseInformation` to be enabled.                     |     x     |

### PR Template placeholders

Table of supported placeholders allowed to be used in the `pr_template` configuration, which will be included in the release notes / changelog.

| **Placeholder**    | **Description**                                                                                    |
|--------------------|----------------------------------------------------------------------------------------------------|
| `#{{NUMBER}}`      | The number referencing this pull request. E.g. 13.                                                 |
| `#{{TITLE}}`       | Specified title of the merged pull request.                                                        |
| `#{{URL}}`         | Url linking to the pull request on GitHub.                                                         |
| `#{{STATUS}}`      | Status of the PR. Usually always `merged`. Possibly `Open` if `includeOpen` is configured.         |
| `#{{CREATED_AT}}`  | The ISO time, the pull request was created at.                                                     |
| `#{{MERGED_AT}}`   | The ISO time, the pull request was merged at.                                                      |
| `#{{MERGE_SHA}}`   | The commit SHA, the pull request was merged with.                                                  |
| `#{{AUTHOR}}`      | Author creating and opening the pull request.                                                      |
| `#{{AUTHOR_NAME}}` | The name of the Author creating and opening the pull request (Can be empty).                       |
| `#{{LABELS}}`      | The labels associated with this pull request, joined by `,`.                                       |
| `#{{MILESTONE}}`   | Milestone this PR was part of, as assigned on GitHub.                                              |
| `#{{BODY}}`        | Description/Body of the pull request as specified on GitHub.                                       |
| `#{{ASSIGNEES}}`   | Login names of assigned GitHub users, joined by `,`.                                               |
| `#{{REVIEWERS}}`   | GitHub Login names of specified reviewers, joined by `,`. Requires `fetchReviewers` to be enabled. |
| `#{{APPROVERS}}`   | GitHub Login names of users who approved the PR, joined by `,`.                                    |

> [!IMPORTANT]  
> `v4` updates the default placeholders format to `#{{}}`. The old format `${{}}` will be supported until v5 for backwards compatibility.

<details><summary><b>Array Placeholders</b></summary>
<p>

Table of special array placeholders allowed to be used in the `pr_template` configuration.

Array placeholders follow the following format: `(KEY)[(*/index)]` for example: `ASSIGNEES[*]` or `ASSIGNEES[0]`.
When using `*` values are joined by `,`.

| **Placeholder**     | **Description**                                                                     |
|---------------------|-------------------------------------------------------------------------------------|
| `#{{ASSIGNEES[*]}}` | Login names of assigned GitHub users.                                               |
| `#{{REVIEWERS[*]}}` | GitHub Login names of specified reviewers. Requires `fetchReviewers` to be enabled. |
| `#{{APPROVERS[*]}}` | GitHub Login names of users who approved the PR.                                    |

Additionally, there are special array placeholders like `REVIEWS` which allows access to it's properties via
`(KEY)[(*/index)].(property)`.

For example: `REVIEWS[*].author` or `REVIEWS[*].body`

| **Placeholder**               | **Description**                            |
|-------------------------------|--------------------------------------------|
| `#{{REVIEWS[*].author}}`      | GitHub Login names of specified reviewers. |
| `#{{REVIEWS[*].body}}`        | The body of the review.                    |
| `#{{REVIEWS[*].htmlURL}}`     | The URL to the given review.               |
| `#{{REVIEWS[*].submittedAt}}` | The date went he review was submitted.     |
| `#{{REVIEWS[*].state}}`       | The state of the given review.             |

Similar to `REVIEWS`, `REFERENCED` PRs also offer special placeholders.

| **Placeholder**               | **Description**                                                           |
|-------------------------------|---------------------------------------------------------------------------|
| `#{{REFERENCED[*].number}}`   | The PR number of the referenced PR.                                       |
| `#{{REFERENCED[*].title}}`    | The title of the referenced PR.                                           |
| `#{{REFERENCED[*]."..."}}`    | Allows to use most other PR properties as placeholder.                    |

</p>
</details>

### Configuration Specification

Table of descriptions for the `configuration.json` options to configure the resulting release notes / changelog.

| **Input**                            | **Description**                                                                                                                                                                                                                                                                                                                       |
|--------------------------------------|---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| categories                           | An array of `category` specifications, offering a flexible way to group changes into categories.                                                                                                                                                                                                                                      |
| category.key                         | Optional key used for the `categorized` json output.                                                                                                                                                                                                                                                                                  |
| category.title                       | The display name of a category in the changelog.                                                                                                                                                                                                                                                                                      |
| category.labels                      | An array of labels, to match pull request labels against. If any PR label matches any category label, the pull request will show up under this category. (See `exhaustive` to change this)                                                                                                                                            |
| category.exclude_labels              | Similar to `labels`, an array of labels to match PRs against, but if a match occurs the PR is excluded from this category.                                                                                                                                                                                                            |
| category.exhaustive                  | Will require all labels defined within this category to be present on the matching PR.                                                                                                                                                                                                                                                |
| category.exhaustive_rules            | Will require all rules defined within this category to be valid on the matching PR. If not defined, defaults to the value of `exhaustive`                                                                                                                                                                                             |
| category.empty_content               | If the category has no matching PRs, this content will be used. When not set, the category will be skipped in the changelog.                                                                                                                                                                                                          |
| category.rules                       | An array of `rules` used to match PRs against. Any match will include the PR. (See `exhaustive` to change this)                                                                                                                                                                                                                       |
| category.rules.pattern               | A `regex` pattern to match the property value towards. Uses `RegExp.test("val")`                                                                                                                                                                                                                                                      |
| category.rules.flags                 | Defines the regex flags specified for the pattern. Default: `gu`.                                                                                                                                                                                                                                                                     |
| category.rules.on_property           | The PR property to match against. [Possible values](https://github.com/mikepenz/release-changelog-builder-action/blob/develop/src/configuration.ts#L33-L43).                                                                                                                                                                          |
| ignore_labels                        | An array of labels, to match pull request labels against. If any PR label overlaps, the pull request will be ignored from the changelog. This takes precedence over category labels                                                                                                                                                   |
| sort                                 | A `sort` specification, offering the ability to define sort order and property.                                                                                                                                                                                                                                                       |
| sort.order                           | The sort order. Allowed values: `ASC`, `DESC`                                                                                                                                                                                                                                                                                         |
| sort.on_property                     | The property to sort on. Allowed values: `mergedAt`, `title`                                                                                                                                                                                                                                                                          |
| template                             | Specifies the global template to pick for creating the changelog. See [Template placeholders](#template-placeholders) for possible values                                                                                                                                                                                             |
| pr_template                          | Defines the per pull request template. See [PR Template placeholders](#pr-template-placeholders) for possible values                                                                                                                                                                                                                  |
| empty_template                       | Template to pick if no changes are detected. See [Template placeholders](#template-placeholders) for possible values                                                                                                                                                                                                                  |
| label_extractor.\[{\<EXTRACTOR\>}\]  | An array of `Extractor` specifications, offering a flexible API to extract additional labels from a PR. Please see the documentation related to [Regex Configuration](#regex-configuration) for more details.                                                                                                                         |
| duplicate_filter.{\<EXTRACTOR\>}     | Defines the `Extractor` to use for retrieving the identifier for a PR. In case of duplicates will keep the last matching pull request (depends on `sort`). Please see the documentation related to [Regex Configuration](#regex-configuration) for more details.                                                                      |
| reference.{\<EXTRACTOR\>}            | Defines the `Extractor` to use for resolving the "PR-number" for a parent PR. In case of a match, the child PR will not be included in the release notes. Please see the documentation related to [Regex Configuration](#regex-configuration) for more details.                                                                       |
| transformers.\[{\<REGEX\>}\]         | An array of `Regex` specifications, offering a flexible API to modify the text per pull request. This is applied on the change text created with `pr_template`. `transformers` are executed per change, in the order specified. Please see the documentation related to [Regex Configuration](#regex-configuration) for more details. |
| max_tags_to_fetch                    | The maximum amount of tags to load from the API to find the previous tag. Loaded paginated with 100 per page                                                                                                                                                                                                                          |
| max_pull_requests                    | The maximum amount of pull requests to load from the API. Loaded paginated with 30 per page                                                                                                                                                                                                                                           |
| max_back_track_time_days             | Defines the max amount of days to go back in time per changelog                                                                                                                                                                                                                                                                       |
| exclude_merge_branches               | An array of branches to be ignored from processing as merge commits                                                                                                                                                                                                                                                                   |
| tag_resolver                         | Section to provide configuration for the tag resolving logic. Used if no `fromTag` is provided                                                                                                                                                                                                                                        |
| tag_resolver.method                  | Defines the method to use. Current options are: `semver`, `sort`. Default: `semver`                                                                                                                                                                                                                                                   |
| tag_resolver.filter                  | Defines a regex object which is used to filter out tags not matching.                                                                                                                                                                                                                                                                 |
| tag_resolver.transformer.{\<REGEX\>} | Defines a regex transformer used to optionally transform the tag after the filter was applied. Allows to adjust the format to e.g. semver. Please see the documentation related to [Regex Configuration](#regex-configuration) for more details.                                                                                      |
| base_branches                        | The target branches for the merged PR, ignores PRs with different target branch. Values can be a `regex`. Default: allow all base branches                                                                                                                                                                                            |
| trim_values                          | Defines if all values inserted in templates are `trimmed`. Default: false                                                                                                                                                                                                                                                             |

### Regex Configuration

Since v5.x or newer, the regex configuration was unified to allow the same functionalities to be used for the various use-cases.
This applies to all configurations outlined in `Configuration Specification` and `Custom placeholders` that allow a regex object.

| **Input**            | **Description**                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
|----------------------|---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| <parent>.pattern     | The `regex` pattern to use                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| <parent>.target      | The result pattern. The result text will be used as label. If empty, no label is created. (Usage depends on the `method` used for the regex).<br/><br/>Javascript methods (`replace`, `replaceAll`, `match`) define the regex in JavaScript format (e.g. double backslash to escape a dot \\.). For example to include all matching tags and exclude the rest, use negative lookahead to exclude tags. For example, api.* will only include tags starting with "api", ^(?!alpha).* will exclude all tags starting with "alpha". |
| <parent>.method      | The extraction method used. Defaults to: `replace`. Alternative values: `replaceAll`, `match`. These methods specified references the JavaScript String method. And a special method  `regexr`, that functions similar to the `list` within the regexr tool.                                                                                                                                                                                                                                                                    |
| <parent>.flags       | Defines the regex flags specified for the pattern. Default: `gu`.                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| <parent>.on_empty    | Defines the placeholder to be filled in, if the regex does not lead to a result.                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| <parent>.on_property | This is available for `Extractor` type regex objects. With the property describing a field available in PRs. (e.g.: title, body, ...) Default: `body`.                                                                                                                                                                                                                                                                                                                                                                          |

<details><summary><b>Example regex configuration block</b></summary>
<p>

Sample extracts a ticket number from the title

Sample PR title input

```
[XYZ-1234] This is my PR title
```

Regex replace pattern

```
{
  "name": "TICKET",
  "source": "TITLE",
  "transformer": {
    "pattern": "\\s*\\[([A-Z].{2,4}-.{2,5})\\][\\S\\s]*",
    "target": "- [$1](https://corp.ticket-system.com/browse/$1)"
  }
}
```

Regexr style pattern (Use [regexr.com](https://regexr.com/) to test).
To test on Regexr inverse the escaping of `\\` to `\`

```
{
  "name": "TICKET",
  "source": "TITLE",
  "transformer": {
    "pattern": "\\[([A-Z]{2,4}-.{2,5})\\]",
    "method": "regexr",
    "target": '- [$1](https://corp.ticket-system.com/browse/$1)'
  }
}
```

</p>
</details>

> [!WARNING]  
> Usages of `\` in the json have to be escaped. E.g. `\` becomes `\\`.

### Custom placeholders

Starting with v3.2.0 the action provides a feature of defining `CUSTOM_PLACEHOLDERS`.

Custom placeholders allow to extract values from any existing placeholder and insert them into the target template.

<details><summary><b>Example</b></summary>
<p>

Custom placeholders can be defined via the `configuration.json` as `custom_placeholders`. See the below example json:

```json
{
  "template": "**Epics**\n#{{EPIC[*]}}\n\n#{{CHANGELOG}}",
  "pr_template": "- #{{TITLE}} - #{{URL}} #{{EPIC}}",
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

This example will look for JIRA tickets in the EPIC project, and extract all of these tickets. The exciting part for that case is, that the ticket is PR-bound but can be used in the global TEMPLATE, but equally also in the PR template. This is unique for CUSTOM PLACEHOLDERS as standard placeholders do not offer this functionality.

| **Input**                                   | **Description**                                                                                                                                                                                     |
|---------------------------------------------|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| custom_placeholders                         | An array of `Placeholder` specifications, offering a flexible API to extract custom placeholders from existing placeholders.                                                                        |
| custom_placeholders.name                    | The name of the custom placeholder. Will be used within the template.                                                                                                                               |
| custom_placeholders.source                  | The source PLACEHOLDER, requires to be one of the existing Template or PR Template placeholders.                                                                                                    |
| custom_placeholders.transformer.{\<REGEX\>} | The transformer specification used to extract the value from the original source PLACEHOLDER. Please see the documentation related to [Regex Configuration](#regex-configuration) for more details. |

A placeholder with the name as `CUSTOM_PLACEHOLDER` can be used as `#{{CUSTOM_PLACEHOLDER}}` in the target template.
By default the same restriction applies as for PR vs. template placeholder. E.g. a global placeholder can only be used in the global template (and not in the PR template).

Custom placeholders offer one new feature, though. PR-related placeholders can be used in the global template via the following syntax:

- `CUSTOM_PLACEHOLDER[*]` - Will join all found values and insert them at the given location in the global template
- `CUSTOM_PLACEHOLDER[0]` / `CUSTOM_PLACEHOLDER[index]` - Will insert the first found value (item at index) into the global template

</p>
</details>

### Gitea support 🧪

Starting with v4.1.0 the action is also compatible with [gitea](https://github.com/go-gitea/gitea).

> [!WARNING]  
> The API from gitea does not allow to retrieve the `diff` via its API, requiring the repo to be checked out

The API for gitea is equal to the one from GitHub, however it requires the `platform` to be specified.

```yml
- name: Build Changelog
  uses: https://github.com/mikepenz/release-changelog-builder-action@v5
  with:
    platform: "gitea" # gitea or GitHub, default is GitHub
    configuration: "configuration.json"
  env:
    token: ${{ secrets.GITEA_TOKEN }}
```

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

This GitHub action is fully developed in Typescript and can be run locally via `npm` or right from the browser using `GitHub Codespace`.

[![Open in GitHub Codespaces](https://github.com/codespaces/badge.svg)](https://codespaces.new/mikepenz/release-changelog-builder-action)

Doing so is a great way to test the action and/or your custom configurations locally, without the need to push and re-run GitHub actions over and over again.

To run locally, or to access private repositories (GitHub Codespaces has automatic access to public repos with the default token), you will require to provide a valid `GITHUB_TOKEN` with read-only permissions to access the repositories you want to run this action towards. (See more details in [Token Permission](#Token-Permission))

To test your own configuration and use-case, the project contains a [\_\_tests\_\_/demo/demo.test.ts](https://github.com/mikepenz/release-changelog-builder-action/blob/develop/__tests__/demo/demo.test.ts) file, modify this one to your needs. (e.g., change repo, change token, change settings, ...), and then run it via:

```bash
npm test -- demo.test.ts
```

<details><summary><b>Debugging with Breakpoints</b></summary>
<p>

One major benefit of setting up a custom test is that it will allow you to use JavaScripts full debugging support, including the option of breakpoints via (for example) Visual Code.

From GitHub codespaces, open the terminal panel -> Click the small arrow down beside `+` and pick `JavaScript Debug Terminal` (make sure to export the token again). Now execute the test with this terminal. (This is very similar to local Visual Code environments).

</p>
</details>

<details><summary><b>Run common tests</b></summary>
<p>

To run the common tests of the action, you require to export a valid GitHub token.

```
# Export the token in the CLI you use to execute.
export GITHUB_TOKEN=your_read_only_github_token
```

Afterwards it is possible to run any test included in the project:

```bash
npm test -- main.test.ts # modify the file name to run other testcases
```

</p>
</details>

## Token Permission

Permissions depend on the specific use-case, however this action only requires `read-only` permissions as it will not make modifications to the repository.

### GitHub actions

Depending on the given environment it may be required to define teh token scope for GitHub actions to `read` for `contents` and `pull-requests`.

```
permissions:
  contents: read
  pull-requests: read
```

[GitHub Actions token scope](https://docs.github.com/en/actions/using-jobs/assigning-permissions-to-jobs#defining-access-for-the-github_token-scopes).

### `Fine-grained personal access tokens`

For `Fine-grained personal access tokens` this means:

- `read` for [Pull requests](https://github.com/mikepenz/release-changelog-builder-action/blob/develop/pr-collector/src/pullRequests.ts#L124)
  - Covered by the `pull-requests` scope
- `read` for [Commits](https://github.com/mikepenz/release-changelog-builder-action/blob/develop/pr-collector/src/commits.ts#L54)
  - Covered by the `contents` scope
- `read` for [Tags](https://github.com/mikepenz/release-changelog-builder-action/blob/develop/pr-collector/src/tags.ts#L32) (if not available the `from` and `to` refs have to be provided)
  - Covered by the `contents` scope
- `read` to [list reviews](https://github.com/mikepenz/release-changelog-builder-action/blob/develop/pr-collector/src/pullRequests.ts#L186)
  - Covered by the `contents` scope

### Classic tokens

For Classic tokens you only have to create the token without special permissions.

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
    All other copyright for project pr-release-notes are held by Mike Penz, 2024.

## Fork License

All patches and changes applied to the original source are licensed under the Apache 2.0 license.

    Copyright 2024 Mike Penz

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
