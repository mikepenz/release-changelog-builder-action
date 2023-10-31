import {BaseRepository} from "./BaseRepository";
import {TagInfo} from "../pr-collector/tags";
import {PullRequestInfo} from "../pr-collector/pullRequests";
import {DiffInfo} from "../pr-collector/commits";

export class GiteaRepository extends BaseRepository{
    get defaultUrl(): string {
        return "https://gitea.com/api/v1";
    }
    constructor(token: string, url?: string) {
        super(token, url);
        this.url = url || this.defaultUrl
    }

    fillTagInformation(repositoryPath: string, owner: string, repo: string, tagInfo: TagInfo): Promise<TagInfo> {
        return Promise.resolve(undefined);
    }

    getBetweenDates(owner: string, repo: string, fromDate: moment.Moment, toDate: moment.Moment, maxPullRequests: number): Promise<PullRequestInfo[]> {
        return Promise.resolve([]);
    }

    getDiffRemote(owner: string, repo: string, base: string, head: string): Promise<DiffInfo> {
        return Promise.resolve(undefined);
    }

    getForCommitHash(owner: string, repo: string, commit_sha: string, maxPullRequests: number): Promise<PullRequestInfo[]> {
        return Promise.resolve([]);
    }

    getOpen(owner: string, repo: string, maxPullRequests: number): Promise<PullRequestInfo[]> {
        return Promise.resolve([]);
    }

    getReviews(owner: string, repo: string, pr: PullRequestInfo): Promise<void> {
        return Promise.resolve(undefined);
    }

    getTags(owner: string, repo: string, maxTagsToFetch: number): Promise<TagInfo[]> {
        return Promise.resolve([]);
    }

}