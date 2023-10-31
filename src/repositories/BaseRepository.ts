import {TagInfo} from "../pr-collector/tags";
import {DiffInfo} from "../pr-collector/commits";
import {Options} from "../pr-collector/prCollector";
import moment from "moment/moment";
import {PullRequestInfo} from "../pr-collector/pullRequests";

export abstract class BaseRepository {
    proxy?: string;
    noProxyArray: string[]

    // Define an abstract getter for the default URL
    abstract get defaultUrl(): string;

    protected constructor(protected token: string, protected url?: string) {
        this.proxy = process.env.https_proxy || process.env.HTTPS_PROXY
        const noProxy = process.env.no_proxy || process.env.NO_PROXY
        this.noProxyArray = []
        if (noProxy) {
            this.noProxyArray = noProxy.split(',')
        }
    }

    abstract getTags(owner: string, repo: string, maxTagsToFetch: number): Promise<TagInfo[]>

    abstract fillTagInformation(repositoryPath: string, owner: string, repo: string, tagInfo: TagInfo): Promise<TagInfo>

    abstract getDiffRemote(owner: string, repo: string, base: string, head: string): Promise<DiffInfo>


    abstract getForCommitHash(owner: string, repo: string, commit_sha: string, maxPullRequests: number): Promise<PullRequestInfo[]>

    abstract getBetweenDates(owner: string, repo: string, fromDate: moment.Moment, toDate: moment.Moment, maxPullRequests: number): Promise<PullRequestInfo[]>

    abstract getOpen(owner: string, repo: string, maxPullRequests: number): Promise<PullRequestInfo[]>

    abstract getReviews(owner: string, repo: string, pr: PullRequestInfo): Promise<void>
}