import { getInput, info, setFailed } from "@actions/core";
import { context, getOctokit } from "@actions/github";
import { ExecOptions, getExecOutput } from "@actions/exec";
import { gte } from 'semver';


export async function run() {
  const token = getInput("github_token");
  //const label = getInput("label");

  const octokit = getOctokit(token);
  const pullRequest = context.payload.pull_request;
  const postComment = createPoster();

  try {
    if (!pullRequest) {
      setFailed("Not a Pull Request");
      throw new Error("This action can only be run on Pull Requests");
      
    }
    //git show personal/master:Cargo.toml
    let mainVersion = await runCommand('git', ['show', `origin/main:Cargo.toml`], { ignoreReturnCode: true });
    if (!mainVersion.success || (mainVersion.stderr.includes('invalid')) || mainVersion.stdout.includes('fatal')) {
      mainVersion = await runCommand('git', ['show', 'origin/master:Cargo.toml'], { ignoreReturnCode: true});
      if (!mainVersion.success) {
        setFailed(mainVersion.stderr ?? "Unknown error when retrieving main/master's version");
      }
    }
    
    let curVersion = await runCommand('cat', ['Cargo.toml'], { ignoreReturnCode: true});
    if (!curVersion.success || curVersion.stdout.includes('fatal')) {
      setFailed(curVersion.stderr ?? "Unknown error trying to incoming version");
    }
    const parsedMain = mainVersion.stdout.match(/version\s*=\s*["'](.*?)["']/)![1];
    const parsedCur = curVersion.stdout.match(/version\s*=\s*["'](.*?)["']/)![1];
    console.log("Master version: ", parsedMain);
    console.log("Incoming Current Version: ", parsedCur);
    if (gte(parsedMain, parsedCur)) {
      postComment("Main/Master's version is greater or equals to incoming version, please fix this.");
      setFailed(`Main/Master's Version is greater than incoming version, please bump the version before continuing`);
    }

    /*await octokit.rest.issues.addLabels({
      owner: context.repo.owner,
      repo: context.repo.repo,
      issue_number: pullRequest.number,
      labels: [label],
    });*/
  } catch (error) {
    setFailed((error as Error)?.message ?? "Unknown error");
  }
}

function createPoster() {
    const githubToken = getInput("github_token")
    const pullRequestNumber = context.payload.pull_request?.number;
    const octkit = getOctokit(githubToken);

    return function postComment(msg: string) {
        octkit.rest.issues.createComment({
            ...context.repo,
            issue_number: pullRequestNumber!,
            body: msg
        })
    }
}

interface ExecResult {
  success: boolean;
  exitCode: number;
  stdout: string;
  stderr: string;
}

async function runCommand(
  command: string,
  args?: string[],
  options?: ExecOptions & { ignoreReturnCode?: boolean }
): Promise<ExecResult> {
  const result = await getExecOutput(command, args, {
    ignoreReturnCode: true,   
    ...options
  });

  const success = result.exitCode === 0 || !!options?.ignoreReturnCode;

  return {
    success,
    exitCode: result.exitCode,
    stdout: result.stdout,
    stderr: result.stderr
  };
}

function getVersion(inp: any) {
  //TODO
}

run();

/*if (!process.env.JEST_WORKER_ID) {
  run();
}*/