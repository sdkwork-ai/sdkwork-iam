import process from "node:process";
import { spawnSync } from "node:child_process";

export function runCommandSequence({
  commands,
  cwd = process.cwd(),
  env = process.env,
} = {}) {
  for (const command of commands) {
    const result = spawnSync(command.command, command.args ?? [], {
      cwd: command.cwd ?? cwd,
      env,
      // Every command in these plans is an executable plus an argument array.
      // shell: true re-parses Windows paths such as "C:\\Program Files\\node.exe"
      // without quoting them and launches the wrong program.
      shell: false,
      stdio: "inherit",
    });

    if (typeof result.status === "number" && result.status !== 0) {
      return result.status;
    }

    if (result.error) {
      throw result.error;
    }

    if (result.signal) {
      return 1;
    }
  }

  return 0;
}
