import * as exec from '@actions/exec'
import * as io from '@actions/io'
import {directoryExistsSync} from './utils.js'

export async function createCommandManager(workingDirectory: string): Promise<GitCommandManager> {
  return await GitCommandManager.createCommandManager(workingDirectory)
}

class GitCommandManager {
  private gitPath = ''
  private workingDirectory = ''

  // Private constructor; use createCommandManager()
  private constructor() {}

  getWorkingDirectory(): string {
    return this.workingDirectory
  }

  async latestTag(): Promise<string> {
    const revListOutput = await this.execGit(['rev-list', '--tags', '--skip=0', '--max-count=1'])
    const output = await this.execGit(['describe', '--abbrev=0', '--tags', revListOutput.stdout.trim()])
    return output.stdout.trim()
  }

  async initialCommit(): Promise<string> {
    const revListOutput = await this.execGit(['rev-list', '--max-parents=0', 'HEAD'])
    return revListOutput.stdout.trim()
  }

  async tagCreation(tagName: string): Promise<string> {
    const creationDate = await this.execGit(['for-each-ref', '--format="%(creatordate:rfc)"', `refs/tags/${tagName}`])
    return creationDate.stdout.trim().replace(/"/g, '')
  }

  async getAllTags(): Promise<string[]> {
    const tagsOutput = await this.execGit(['tag', '-l'])
    return tagsOutput.stdout.trim().split('\n').filter(tag => tag.trim() !== '')
  }

  async getTagCommit(tagName: string): Promise<string> {
    const commitOutput = await this.execGit(['rev-list', '-n', '1', tagName])
    return commitOutput.stdout.trim()
  }

  async getDiffStats(base: string, head: string): Promise<{
    changedFiles: number;
    additions: number;
    deletions: number;
    changes: number;
  }> {
    const diffOutput = await this.execGit(['diff', '--numstat', `${base}..${head}`])
    const lines = diffOutput.stdout.trim().split('\n').filter(line => line.trim() !== '')

    let additions = 0
    let deletions = 0

    for (const line of lines) {
      const parts = line.split('\t')
      if (parts.length >= 2) {
        additions += parseInt(parts[0], 10) || 0
        deletions += parseInt(parts[1], 10) || 0
      }
    }

    return {
      changedFiles: lines.length,
      additions,
      deletions,
      changes: additions + deletions
    }
  }

  async getCommitsBetween(base: string, head: string): Promise<{
    count: number;
    commits: {
      sha: string;
      subject: string
      message: string;
      author: string;
      authorName: string;
      authorDate: string;
    }[];
  }> {
    const logOutput = await this.execGit([
      'log',
      '--pretty=format:%H|%an|%ae|%aI|%s|%b',
      `${base}..${head}`
    ])

    const lines = logOutput.stdout.trim().split('\n').filter(line => line.trim() !== '')
    const commits = lines.map(line => {
      const [sha, authorName, authorEmail, authorDate, subject, body] = line.split('|')
      return {
        sha,
        subject,
        message: body,
        author: authorEmail,
        authorName,
        authorDate
      }
    })

    return {
      count: commits.length,
      commits
    }
  }

  static async createCommandManager(workingDirectory: string): Promise<GitCommandManager> {
    const result = new GitCommandManager()
    await result.initializeCommandManager(workingDirectory)
    return result
  }

  async execGit(args: string[], allowAllExitCodes = false, silent = false): Promise<GitOutput> {
    directoryExistsSync(this.workingDirectory, true)

    const result = new GitOutput()

    const stdout: string[] = []

    const options = {
      cwd: this.workingDirectory,
      silent,
      ignoreReturnCode: allowAllExitCodes,
      listeners: {
        stdout: (data: Buffer) => {
          stdout.push(data.toString())
        }
      }
    }

    result.exitCode = await exec.exec(`"${this.gitPath}"`, args, options)
    result.stdout = stdout.join('')
    return result
  }

  private async initializeCommandManager(workingDirectory: string): Promise<void> {
    this.workingDirectory = workingDirectory
    this.gitPath = await io.which('git', true)
  }
}

class GitOutput {
  stdout = ''
  exitCode = 0
}
