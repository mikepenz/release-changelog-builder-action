import * as core from "@actions/core";
import moment from "moment";
import { BaseRepository } from "./BaseRepository.js";
import { TagInfo } from "../pr-collector/tags.js";
import { DiffInfo } from "../pr-collector/commits.js";
import { PullRequestInfo } from "../pr-collector/pullRequests.js";
import { createCommandManager } from "../pr-collector/gitHelper.js";

export class OfflineRepository extends BaseRepository {

  constructor(repositoryPath: string) {
    super("", "offline", repositoryPath);
    this.url = this.defaultUrl;
  }

  get defaultUrl(): string {
    return "offline";
  }

  get homeUrl(): string {
    return "offline";
  }

  async getTags(owner: string, repo: string, maxTagsToFetch: number): Promise<TagInfo[]> {
    core.info(`ℹ️ Retrieving tags from local repository in offline mode`);
    const gitHelper = await createCommandManager(this.repositoryPath);
    const tags = await gitHelper.getAllTags();

    // Limit the number of tags to maxTagsToFetch
    const limitedTags = tags.slice(0, maxTagsToFetch);

    // Convert to TagInfo objects
    const tagInfos: TagInfo[] = [];
    for (const tag of limitedTags) {
      const commit = await gitHelper.getTagCommit(tag);
      tagInfos.push({
        name: tag,
        commit
      });
    }

    core.info(`ℹ️ Retrieved ${tagInfos.length} tags from local repository`);
    return tagInfos;
  }

  async fillTagInformation(repositoryPath: string, owner: string, repo: string, tagInfo: TagInfo): Promise<TagInfo> {
    return this.getTagByCreateTime(repositoryPath, tagInfo);
  }

  async getDiffRemote(owner: string, repo: string, base: string, head: string): Promise<DiffInfo> {
    core.info(`ℹ️ Getting diff information from local repository in offline mode`);
    const gitHelper = await createCommandManager(this.repositoryPath);

    // Get diff stats
    const diffStats = await gitHelper.getDiffStats(base, head);

    // Get commits
    const commitInfo = await gitHelper.getCommitsBetween(base, head);

    return {
      changedFiles: diffStats.changedFiles,
      additions: diffStats.additions,
      deletions: diffStats.deletions,
      changes: diffStats.changes,
      commits: commitInfo.count,
      commitInfo: commitInfo.commits.map(commit => ({
        sha: commit.sha,
        summary: commit.subject.split('\n')[0],
        message: commit.message,
        author: commit.author,
        authorName: commit.authorName,
        authorDate: moment(commit.authorDate),
        committer: "",
        committerName: "",
        commitDate: moment(commit.authorDate),
        prNumber: undefined
      }))
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async getForCommitHash(owner: string, repo: string, commit_sha: string, maxPullRequests: number): Promise<PullRequestInfo[]> {
    core.info(`⚠️ getForCommitHash not supported in offline mode`);
    return [];
  }

  async getBetweenDates(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    owner: string,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    repo: string,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    fromDate: moment.Moment,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    toDate: moment.Moment,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    maxPullRequests: number
  ): Promise<PullRequestInfo[]> {
    core.info(`⚠️ getBetweenDates not supported in offline mode`);
    return [];
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async getOpen(owner: string, repo: string, maxPullRequests: number): Promise<PullRequestInfo[]> {
    core.info(`⚠️ getOpen not supported in offline mode`);
    return [];
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async getReviews(owner: string, repo: string, pr: PullRequestInfo): Promise<void> {
    core.info(`⚠️ getReviews not supported in offline mode`);
  }
}
