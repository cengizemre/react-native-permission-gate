/**
 * Serializes native permission prompts. The OS can only present one permission
 * dialog at a time — when several hooks/gates request concurrently (e.g. two
 * `<PermissionGate requestOnMount>` mounted on the same screen), firing both
 * native requests at once loses or interleaves prompts. Every adapter
 * `request()` in this library is funneled through this queue so prompts are
 * shown one after another, app-wide.
 */
export interface PromptQueue {
  enqueue<T>(task: () => Promise<T>): Promise<T>;
}

export function createPromptQueue(): PromptQueue {
  let tail: Promise<unknown> = Promise.resolve();
  return {
    enqueue(task) {
      // Run after the previous task settles, whether it resolved or rejected.
      const run = tail.then(task, task);
      tail = run.then(
        () => undefined,
        () => undefined
      );
      return run;
    },
  };
}

/** App-wide queue used by `usePermission` / `usePermissions`. */
export const promptQueue = createPromptQueue();
