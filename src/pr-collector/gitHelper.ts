import * as exec from '@actions/exec'
import * as io from '@actions/io'
import {directoryExistsSync} from './utils'

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
