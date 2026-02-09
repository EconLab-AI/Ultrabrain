/**
 * LoopExecutor - Executes loop iterations via Terminal.app or headless claude CLI
 *
 * On macOS: opens Terminal.app with `claude --dangerously-skip-permissions -p <prompt>`
 * On other platforms: spawns a headless detached process
 */

import { exec, spawn } from 'child_process';
import { platform } from 'os';
import { resolveProjectCwd } from '../utils/project-cwd.js';

export class LoopExecutor {
  private getDb: () => any;

  constructor(getDb: () => any) {
    this.getDb = getDb;
  }

  async execute(config: {
    project: string;
    taskDescription: string;
    iterationNumber: number;
    configId: number;
  }): Promise<void> {
    const db = this.getDb();
    const cwd = resolveProjectCwd(db, config.project);
    if (!cwd) {
      console.error(`[LOOP] Cannot resolve CWD for project: ${config.project}`);
      this.markIterationFailed(config.configId, config.iterationNumber, 'CWD resolution failed');
      return;
    }

    const prompt = `[UltraBrain Loop - Iteration ${config.iterationNumber}]\n\n${config.taskDescription}`;
    const escapedPrompt = prompt.replace(/'/g, "'\\''");
    const escapedCwd = cwd.replace(/'/g, "'\\''");

    if (platform() === 'darwin') {
      // macOS: Open Terminal.app with claude command
      // Use escaped double quotes inside AppleScript strings for safety
      const escapedCwdAS = cwd.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
      const escapedPromptAS = prompt.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
      const appleScript = `tell application "Terminal"
  activate
  do script "cd \\"${escapedCwdAS}\\" && claude --dangerously-skip-permissions -p \\"${escapedPromptAS}\\""
end tell`;

      // Pass AppleScript via stdin to avoid shell escaping issues
      const child = spawn('osascript', ['-'], { stdio: ['pipe', 'pipe', 'pipe'] });
      child.stdin.write(appleScript);
      child.stdin.end();

      child.on('exit', (code) => {
        if (code !== 0) {
          console.error(`[LOOP] Failed to open Terminal.app (exit ${code})`);
          this.spawnHeadless(cwd, prompt, config);
        } else {
          console.log(`[LOOP] Terminal.app opened for iteration ${config.iterationNumber}`);
        }
      });
    } else {
      this.spawnHeadless(cwd, prompt, config);
    }
  }

  private spawnHeadless(cwd: string, prompt: string, config: any): void {
    const child = spawn('claude', ['--dangerously-skip-permissions', '-p', prompt], {
      cwd,
      stdio: 'pipe',
      detached: true,
    });

    child.on('exit', (code) => {
      console.log(`[LOOP] Headless iteration ${config.iterationNumber} exited with code ${code}`);
    });

    child.unref();
  }

  private markIterationFailed(configId: number, iterationNumber: number, reason: string): void {
    try {
      this.getDb().prepare(`
        UPDATE loop_iterations SET status = 'failed', completed_at_epoch = ?
        WHERE loop_config_id = ? AND iteration_number = ?
      `).run(Date.now(), configId, iterationNumber);
    } catch (e) {
      console.error(`[LOOP] Failed to mark iteration as failed: ${e}`);
    }
  }
}
