import {BaseRepository} from "./BaseRepository";
import {TagInfo} from "../pr-collector/tags";
import {
    CommentInfo,
    PullRequestInfo,
} from "../pr-collector/pullRequests";
import {DiffInfo} from "../pr-collector/commits";
import {Api, PullRequest, PullReview} from "gitea-js";
import moment from "moment";
import * as core from "@actions/core";
import {createCommandManager} from "../pr-collector/gitHelper";

export class GiteaRepository extends BaseRepository {
    private api: Api<unknown>

    get defaultUrl(): string {
        return "https://gitea.com";
    }

    constructor(token: string, url: string | undefined, repositoryPath: string) {
        super(token, url, repositoryPath);
        this.url = url || this.defaultUrl
        const fetch = require('cross-fetch');
        const {giteaApi} = require('gitea-js');
        this.api = new giteaApi('https://gitea.com/', {
            token: token, // generate one at https://gitea.example.com/user/settings/applications
            customFetch: fetch,
        });
    }

    async fillTagInformation(repositoryPath: string, owner: string, repo: string, tagInfo: TagInfo): Promise<TagInfo> {
        const response = await this.api.repos.repoGetTag(owner, repo, tagInfo.name)

        if (response.error === null) {

            if (response.data.commit) {
                tagInfo.date = moment(response.data.commit.created)
                core.info(`ℹ️ Retrieved information about the release associated with ${tagInfo.name} from the Gitea API`)
                return tagInfo
            }


        }
        return await this.getTagByCreateTime(repositoryPath, tagInfo)

    }

    async getBetweenDates(owner: string, repo: string, fromDate: moment.Moment, toDate: moment.Moment, maxPullRequests: number): Promise<PullRequestInfo[]> {

        const mergedPRs: PullRequestInfo[] = []

        const response = await this.api.repos.repoListPullRequests(owner, repo, {
            sort: 'recentupdate',
            state: 'closed',
            limit: Math.min(100, maxPullRequests),
        })

        if (response.error === null) {

            for (const pr of response.data.filter(p => !!p.merged_at)) {
                mergedPRs.push(this.mapPullRequest(pr, 'merged'))
            }
        }


        return mergedPRs;
    }

    private mapPullRequest(pr: PullRequest, status: 'open' | 'merged' = 'open'): PullRequestInfo {
        return {
            number: pr.number || 0,
            title: pr.title || "",
            htmlURL: pr.html_url || "",
            baseBranch: pr.base?.repo?.default_branch || "",
            branch: pr.merge_base || "",
            mergedAt: pr.merged_at ? moment(pr.merged_at) : undefined,
            mergeCommitSha: pr.merge_commit_sha || "",
            author: pr.user?.login || "",
            repoName: pr.base?.repo?.full_name || "",
            labels: pr.labels?.map((label) => label.name) as string[],
            milestone: pr.milestone?.title || "",
            body: pr.body || "",

            assignees: pr.assignees?.map((user) => user.full_name) as string[],
            requestedReviewers: pr.requested_reviewers?.map((user) => user.full_name) as string[],
            approvedReviewers: [],
            createdAt: moment(pr.created_at),
            status: status,
            reviews: undefined
        }
    }

    async getDiffRemote(owner: string, repo: string, base: string, head: string): Promise<DiffInfo> {
        let changedFilesCount = 0;
        let additionCount = 0;
        let deletionCount = 0;
        let changeCount = 0;
        let commitCount = 0;

        const gitHelper = await createCommandManager(this.repositoryPath)

        // Get the diff stats between the two branches/commits
        const diffStat = await gitHelper.execGit(['diff', '--stat', `${base}...${head}`]);
        const diffStatLines = diffStat.stdout.split('\n');

        for (const line of diffStatLines) {
            // Extract the addition and deletion counts from each line of the git diff output
            const match = line.match(/(\d+) insertions?\(\+\), (\d+) deletions?\(\-\)/);
            if (match) {
                additionCount += parseInt(match[1], 10);
                deletionCount += parseInt(match[2], 10);
            }
        }

        // Get the list of changed files
        const diffNameOnly = await gitHelper.execGit(['diff', '--name-only', `${base}...${head}`]);
        const changedFiles = diffNameOnly.stdout.split('\n');
        changedFilesCount = changedFiles.length - 1; // Subtract one for the empty line at the end

        // Get the commit count between the two branches/commits
        const logCount = await gitHelper.execGit(['rev-list', '--count', `${base}...${head}`]);
        commitCount = parseInt(logCount.stdout.trim(), 10);

        // Now let's get the commit logs between the two branches/commits
        const log = await gitHelper.execGit(['log', '--pretty=format:%H||||%an||||%ae||||%ad||||%cn||||%ce||||%cd||||%s', `${base}...${head}`]);
        const commitLogs = log.stdout.trim().split('\n');

        // Process commit logs
        const commitInfo = commitLogs.map(log => {
            const [sha, authorName, authorEmail, authorDate, committerName, committerEmail, committerDate, subject] = log.split('||||');
            return {
                sha,
                summary: subject,
                message: '', // This would require another git command to get the full message if needed
                author: authorName,
                authorDate: moment(authorDate, "ddd MMM DD HH:mm:ss YYYY ZZ", false),
                committer: committerName,
                commitDate: moment(committerDate, "ddd MMM DD HH:mm:ss YYYY ZZ", false),
                prNumber: undefined // This is not available directly from git, would require additional logic to associate commits with PRs
            };
        });

        return {
            changedFiles: changedFilesCount,
            additions: additionCount,
            deletions: deletionCount,
            changes: changeCount,
            commits: commitCount,
            commitInfo: commitInfo
        };
    }


    async getForCommitHash(owner: string, repo: string, commit_sha: string, maxPullRequests: number): Promise<PullRequestInfo[]> {
        const mergedPRs: PullRequestInfo[] = []

        const response = await this.api.repos.repoListPullRequests(owner, repo, {
            sort: 'recentupdate',
            state: 'closed',
            limit: 1000,
        })



        if (response.error === null) {

            for (const pr of response.data) {
                if (pr.merge_commit_sha === commit_sha) {
                    mergedPRs.push(this.mapPullRequest(pr, pr.merged_at ? 'merged' : 'open'))
                }
            }
        }

        return mergedPRs


    }

    async getOpen(owner: string, repo: string, maxPullRequests: number): Promise<PullRequestInfo[]> {
        const openPrs: PullRequestInfo[] = []
        const response = await this.api.repos.repoListPullRequests(owner, repo, {
            sort: 'recentupdate',
            state: 'open',
            limit: Math.min(100, maxPullRequests),
        })
        if (response.error === null) {

            for (const pr of response.data) {
                openPrs.push(this.mapPullRequest(pr, 'open'))
            }
        }

        return openPrs
    }

    async getReviews(owner: string, repo: string, pr: PullRequestInfo): Promise<void> {

        const prReviews: CommentInfo[] = []
        const response = await this.api.repos.repoListPullReviews(owner, repo, pr.number, {})
        if (response.error === null) {

            for (const comment of response.data) {
                prReviews.push(this.mapComment(comment))
            }
        }
        pr.reviews = prReviews
    }

    private mapComment = (comment: PullReview): CommentInfo => ({
        id: comment.id || 0,
        htmlURL: comment.html_url || "",
        submittedAt: comment.submitted_at ? moment(comment.submitted_at) : undefined,
        author: comment.user?.login || '',
        body: comment.body || "",
        state: comment.state
    })

    async getTags(owner: string, repo: string, maxTagsToFetch: number): Promise<TagInfo[]> {
        const response = await this.api.repos.repoListTags(owner, repo, {
            limit: maxTagsToFetch
        })
        const tagsInfo: TagInfo[] = []
        if (response.error === null) {
            for (const tag of response.data) {
                tagsInfo.push({
                    name: tag.name || "",
                    commit: tag.commit?.sha
                })
            }

        }
        core.info(`ℹ️ Found ${tagsInfo.length} (fetching max: ${maxTagsToFetch}) tags from the GitHub API for ${owner}/${repo}`)
        return tagsInfo
    }

}