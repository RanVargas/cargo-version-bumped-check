import { getInput, info, setFailed } from "@actions/core";
import { context, getOctokit } from "@actions/github";
import { ExecOptions } from "@actions/exec";


export async function run() {
  const token = getInput("gh-token");
  const label = getInput("label");

  try {
    const skipLabel = getInput("skipLabel");
    info(`Skip label: ${skipLabel}`);

    const pullRequest = context.payload;
    const labelNames = pullRequest

  } catch (err) {
    setFailed((err as Error)?.message ?? "Unknown error")
  }

  const octokit = getOctokit(token);
  const pullRequest = context.payload.pull_request;

  try {
    if (!pullRequest) {
      throw new Error("This action can only be run on Pull Requests");
    }

    await octokit.rest.issues.addLabels({
      owner: context.repo.owner,
      repo: context.repo.repo,
      issue_number: pullRequest.number,
      labels: [label],
    });
  } catch (error) {
    setFailed((error as Error)?.message ?? "Unknown error");
  }
}

function createPoster() {
    const githubToken = getInput("github-token")
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

async function runCommand(
  command: string,
  args?: string[],
  options?: ExecOptions & { ignoreReturnCode?: boolean }
): Promise<ExecResult> {
  const result = await exec.getExecOutput(command, args, {
    ignoreReturnCode: true,   // ← very important
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

/*if (!process.env.JEST_WORKER_ID) {
  run();
}*/