import { PullRequestInfo } from "./pullRequests"

const RELEASE_NOTES_LINE_PATTERN = /^\s*#{3}\s+Release\s+Notes\s*([\s\S]+?)\s*$/im

export function defaultPullRequestNotableFormatter(pullRequest?: PullRequestInfo): string {
    if (!pullRequest) {
        return ""
    }

    const matches = RELEASE_NOTES_LINE_PATTERN.exec(pullRequest.body || "")
    if (matches && matches.length > 0) {
        const message = matches[1].trim()
        return message === "<!--" ? "" : `* ${message} ([#${pullRequest.number}](${pullRequest.htmlURL}))`
    }

    return ""
}

export function defaultNotableChangesFormatter(notableChanges?: string): string {
    return `## Notable Changes\n${notableChanges || "**TODO**: Pull relevant changes here!"}`
}

export function defaultPullRequestTitleFormatter(pullRequest?: PullRequestInfo): string {
    return pullRequest ? `* [#${pullRequest.number}](${pullRequest.htmlURL}) - ${pullRequest.title}` : ""
}

export function defaultAllChangesFormatter(allChanges?: string): string {
    return allChanges ? `\n<details>\n<summary>All Changes</summary>\n\n${allChanges}\n</details>` : ""
}
