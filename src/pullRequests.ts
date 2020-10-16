import { Octokit, RestEndpointMethodTypes } from "@octokit/rest"
import * as moment from "moment"

import { CommitInfo } from "./commits"
import { Logger } from "./logger"

export interface PullRequestInfo {
    number: number
    title: string
    htmlURL: string
    mergedAt: moment.Moment
    author: string
    repoName: string
    body: string
}

export class PullRequests {
    constructor(private octokit: Octokit) {}

    async getSingle(owner: string, repo: string, prNumber: number): Promise<PullRequestInfo | null> {
        try {
            const pr = await this.octokit.pulls.get({ owner, repo, pull_number: prNumber })

            return {
                number: pr.data.number,
                title: pr.data.title,
                htmlURL: pr.data.html_url,
                mergedAt: moment(pr.data.merged_at),
                author: pr.data.user.login,
                repoName: pr.data.base.repo.full_name,
                body: pr.data.body
            }
        } catch (e) {
            Logger.warn("Cannot find PR", `${owner}/${repo}#${prNumber}`, e.code, e.message)
            return null
        }
    }

    async getBetweenDates(
        owner: string,
        repo: string,
        fromDate: moment.Moment,
        toDate: moment.Moment
    ): Promise<PullRequestInfo[]> {
        const mergedPRs: PullRequestInfo[] = []
        const options = this.octokit.pulls.list.endpoint.merge({
            owner,
            repo,
            state: "closed",
            sort: "updated",
            direction: "desc"
        })

        for await (const response of this.octokit.paginate.iterator(options)) {
            type PullsListData = RestEndpointMethodTypes["pulls"]["list"]["response"]["data"]
            const prs: PullsListData = response.data as PullsListData
            prs.filter(
                pr =>
                    !!pr.merged_at &&
                    fromDate.isBefore(moment(pr.merged_at)) &&
                    toDate.isSameOrAfter(moment(pr.merged_at))
            ).forEach(pr => {
                mergedPRs.push({
                    number: pr.number,
                    title: pr.title,
                    htmlURL: pr.html_url,
                    mergedAt: moment(pr.merged_at),
                    author: pr.user.login,
                    repoName: pr.base.repo.full_name,
                    body: pr.body
                })
            })
        }

        return this.sortPullRequests(mergedPRs)
    }

    filterCommits(commits: CommitInfo[]): CommitInfo[] {
        const prRegex = /Merge pull request #(\d+)/
        const filteredCommits = []

        for (const commit of commits) {
            const match = commit.summary.match(prRegex)
            if (!match) {
                continue
            }
            commit.prNumber = Number.parseInt(match[1], 10)
            filteredCommits.push(commit)
        }

        return filteredCommits
    }

    private sortPullRequests(pullRequests: PullRequestInfo[]): PullRequestInfo[] {
        pullRequests.sort((a, b) => {
            if (a.mergedAt.isBefore(b.mergedAt)) {
                return -1
            } else if (b.mergedAt.isBefore(a.mergedAt)) {
                return 1
            }
            return 0
        })

        return pullRequests
    }
}
