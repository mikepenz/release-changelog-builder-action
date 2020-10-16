import { Octokit } from "@octokit/rest"

import { Commits } from "./commits"
import * as formatters from "./formatters"
import { Logger } from "./logger"
import { PullRequestInfo, PullRequests } from "./pullRequests"

export interface ReleaseNotesOptions {
    owner: string
    repo: string
    fromTag: string
    toTag: string
    formatter: {
        pullRequestTitle: (pullRequest?: PullRequestInfo) => string
        pullRequestNotable: (pullRequest?: PullRequestInfo) => string
        notableChanges: (notableChanges?: string) => string
        allChanges: (allChanges?: string) => string
    }
}

export class ReleaseNotes {
    static get defaultFormatter() {
        return {
            pullRequestTitle: formatters.defaultPullRequestTitleFormatter,
            pullRequestNotable: formatters.defaultPullRequestNotableFormatter,
            notableChanges: formatters.defaultNotableChangesFormatter,
            allChanges: formatters.defaultAllChangesFormatter
        }
    }

    constructor(private options: ReleaseNotesOptions) {
        options.formatter = {
            ...ReleaseNotes.defaultFormatter,
            ...options.formatter
        }
    }

    async pull(token?: string): Promise<string> {
        const octokit = new Octokit({
            auth: `token ${token || process.env.GITHUB_TOKEN}`
        })

        const mergedPullRequests = await this.getMergedPullRequests(octokit)
        const notableChanges = this.getFormatedChanges(mergedPullRequests, this.options.formatter.pullRequestNotable)
        const allChanges = this.getFormatedChanges(mergedPullRequests, this.options.formatter.pullRequestTitle)
        const format = this.options.formatter

        return `${format.notableChanges(notableChanges)}${format.allChanges(allChanges)}`
    }

    private async getMergedPullRequests(octokit: Octokit): Promise<PullRequestInfo[]> {
        const { owner, repo, fromTag, toTag } = this.options
        Logger.log("Comparing", `${owner}/${repo}`, `${fromTag}...${toTag}`)

        const commitsApi = new Commits(octokit)
        const commits = await commitsApi.getDiff(owner, repo, fromTag, toTag)

        if (commits.length === 0) {
            return []
        }

        const firstCommit = commits[0]
        const lastCommit = commits[commits.length - 1]
        const fromDate = firstCommit.date
        const toDate = lastCommit.date

        Logger.log(`Fetching PRs between dates ${fromDate.toISOString()} ${toDate.toISOString()} for ${owner}/${repo}`)

        const pullRequestsApi = new PullRequests(octokit)
        const pullRequests = await pullRequestsApi.getBetweenDates(owner, repo, fromDate, toDate)

        Logger.log(`Found ${pullRequests.length} merged PRs for ${owner}/${repo}`)

        const prCommits = pullRequestsApi.filterCommits(commits)
        const filteredPullRequests = []
        const pullRequestsByNumber: { [key: number]: PullRequestInfo } = {}

        for (const pr of pullRequests) {
            pullRequestsByNumber[pr.number] = pr
        }

        for (const commit of prCommits) {
            if (!commit.prNumber) {
                continue
            }

            const prRef = `${owner}/${repo}#${commit.prNumber}`

            if (pullRequestsByNumber[commit.prNumber]) {
                filteredPullRequests.push(pullRequestsByNumber[commit.prNumber])
            } else if (fromDate.toISOString() === toDate.toISOString()) {
                Logger.log(`${prRef} not in date range, fetching explicitly`)
                const pullRequest = await pullRequestsApi.getSingle(owner, repo, commit.prNumber)

                if (pullRequest) {
                    filteredPullRequests.push(pullRequest)
                } else {
                    Logger.warn(`${prRef} not found! Commit text: ${commit.summary}`)
                }
            } else {
                Logger.log(`${prRef} not in date range, likely a merge commit from a fork-to-fork PR`)
            }
        }

        return pullRequests
    }

    private getFormatedChanges(pullRequests: PullRequestInfo[], formatter: (pr?: PullRequestInfo) => string): string {
        if (pullRequests.length) {
            return pullRequests.reduce((result, pr) => {
                let formated = formatter(pr)
                formated = !!formated ? `${formated}\n` : ""
                return `${result}${formated}`
            }, "")
        }
        return ""
    }
}
