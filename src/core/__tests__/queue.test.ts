import { createPromptQueue } from '../queue';

const wait = (ms: number) =>
  new Promise<void>((r) => setTimeout(() => r(), ms));

describe('createPromptQueue', () => {
  it('runs tasks strictly one at a time, in order', async () => {
    const queue = createPromptQueue();
    let active = 0;
    let maxActive = 0;
    const order: number[] = [];

    const task = (id: number) => async () => {
      active += 1;
      maxActive = Math.max(maxActive, active);
      await wait(10);
      order.push(id);
      active -= 1;
      return id;
    };

    const results = await Promise.all([
      queue.enqueue(task(1)),
      queue.enqueue(task(2)),
      queue.enqueue(task(3)),
    ]);

    expect(maxActive).toBe(1);
    expect(order).toEqual([1, 2, 3]);
    expect(results).toEqual([1, 2, 3]);
  });

  it('keeps running after a task rejects', async () => {
    const queue = createPromptQueue();

    const failing = queue.enqueue(async () => {
      throw new Error('boom');
    });
    const following = queue.enqueue(async () => 'ok');

    await expect(failing).rejects.toThrow('boom');
    await expect(following).resolves.toBe('ok');
  });
});
