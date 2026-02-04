import { getInput, info, setFailed } from "@actions/core";
import { context, getOctokit } from "@actions/github";
import { ExecOptions, getExecOutput } from "@actions/exec";
import { gte } from "semver";

export async function run() {
  const pullRequest = context.payload.pull_request;
  //const postComment = createPoster();

  try {
    if (!pullRequest) {
      console.log(`The pull request event is: ${pullRequest}`);
      setFailed("Not a Pull Request");
      throw new Error("This action can only be run on Pull Requests");
    }

    await runCommand("git", ["fetch", "--all"]);
    let mainVersion = await runCommand(
      "git",
      ["show", `origin/main:Cargo.toml`],
      { ignoreReturnCode: true },
    );
    if (
      !mainVersion.success ||
      mainVersion.stderr.includes("invalid") ||
      mainVersion.stdout.includes("fatal")
    ) {
      mainVersion = await runCommand(
        "git",
        ["show", "origin/master:Cargo.toml"],
        { ignoreReturnCode: true },
      );
      if (!mainVersion.success) {
        setFailed(
          mainVersion.stderr ??
            "Unknown error when retrieving main/master's version",
        );
        throw new Error("Failed to get main/master's version");
      }
    }

    let curVersion = await runCommand("cat", ["Cargo.toml"], {
      ignoreReturnCode: true,
    });
    if (!curVersion.success || curVersion.stdout.includes("fatal")) {
      setFailed(
        curVersion.stderr ?? "Unknown error trying to incoming version",
      );
    }
    const parsedMain = mainVersion.stdout.match(
      /version\s*=\s*["'](.*?)["']/,
    )![1];
    const parsedCur = curVersion.stdout.match(
      /version\s*=\s*["'](.*?)["']/,
    )![1];
    console.log("Master version: ", parsedMain);
    console.log("Incoming Current Version: ", parsedCur);
    if (gte(parsedMain, parsedCur)) {
      await commentOnPR(
        false,
        "Master's version is greater or equals to incoming version, please fix this.",
      );
      setFailed(
        `Master's Version is greater than incoming version, please bump the version before continuing`,
      );
      return;
    }

    await commentOnPR(true);
    return;
  } catch (error) {
    setFailed((error as Error)?.message ?? "Unknown error");
  }
}

function createPoster() {
  const githubToken = getInput("github_token");
  const pullRequestNumber = context.payload.pull_request?.number;
  const octkit = getOctokit(githubToken);

  return function postComment(msg: string) {
    octkit.rest.issues.createComment({
      ...context.repo,
      issue_number: pullRequestNumber!,
      body: msg,
    });
  };
}

async function commentOnPR(passStatus: boolean, msg: string | null = "") {
  const githubToken = getInput("github_token");
  const pullRequestNumber = context.payload.pull_request?.number;
  const octokit = getOctokit(githubToken);

  try {
    const { data: comments } = await octokit.rest.issues.listComments({
      ...context.repo,
      issue_number: pullRequestNumber!,
    });

    const botComment = comments.find(
      (comment) =>
        comment.user?.type === "Bot" &&
        (comment.body?.includes("Version check passed") ||
          comment.body?.includes("please fix this")),
    );

    if (passStatus == false) {
      if (botComment) {
        await octokit.rest.issues.updateComment({
          ...context.repo,
          comment_id: botComment.id,
          body: msg!,
        });
        info("Updated existing comment to reflect failure");
        return;
      } else {
        await octokit.rest.issues.createComment({
          ...context.repo,
          issue_number: pullRequestNumber!,
          body: msg!,
        });
        const commentexist = botComment == null;
        info(`Updated existing comment to reflect failure, is botComment null: ${commentexist}`);
        return;
      }
    } else if (passStatus == true) {
      if (botComment) {
        await octokit.rest.issues.updateComment({
          ...context.repo,
          comment_id: botComment.id,
          body: "✅ Version check passed! The incoming version is greater than main's version.",
        });
        info("Updated existing comment to reflect success");
        return;
      } else {
        await octokit.rest.issues.createComment({
          ...context.repo,
          issue_number: pullRequestNumber!,
          body: "✅ Version check passed! The incoming version is greater than main's version.",
        });
        info("Posted new success comment");
        return;
      }
    }
  } catch (error) {
    info(`Failed to update comment: ${(error as Error)?.message}`);
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
  options?: ExecOptions & { ignoreReturnCode?: boolean },
): Promise<ExecResult> {
  const result = await getExecOutput(command, args, {
    ignoreReturnCode: true,
    ...options,
  });

  const success = result.exitCode === 0 || !!options?.ignoreReturnCode;

  return {
    success,
    exitCode: result.exitCode,
    stdout: result.stdout,
    stderr: result.stderr,
  };
}

run();
