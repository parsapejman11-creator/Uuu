import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createDebouncedCallback,
  createDebouncedStorageWriter,
  scheduleIdlePrefetch,
} from './perfHelpers';
import { computePreviewRenderSize } from '../game/sharedPreviewRenderer';

test('createDebouncedCallback coalesces rapid calls into one trailing invocation', async () => {
  let count = 0;
  let lastArg = '';
  const debounced = createDebouncedCallback((val: string) => {
    count += 1;
    lastArg = val;
  }, 25);

  debounced('a');
  debounced('b');
  debounced('c');
  assert.equal(count, 0);

  await new Promise((r) => setTimeout(r, 45));
  assert.equal(count, 1);
  assert.equal(lastArg, 'c');
});

test('createDebouncedCallback flush executes immediately and cancel aborts pending call', async () => {
  let count = 0;
  let lastVal = 0;
  const debounced = createDebouncedCallback((v: number) => {
    count += 1;
    lastVal = v;
  }, 50);

  debounced(7);
  debounced.flush();
  assert.equal(count, 1);
  assert.equal(lastVal, 7);

  debounced(99);
  debounced.cancel();
  await new Promise((r) => setTimeout(r, 70));
  assert.equal(count, 1);
  assert.equal(lastVal, 7);
});

test('createDebouncedStorageWriter batches rapid writes per key and flushes latest value', async () => {
  const writes: Array<{ k: string; v: string }> = [];
  const fakeStorage = {
    setItem: (k: string, v: string) => writes.push({ k, v }),
  };
  const writer = createDebouncedStorageWriter(30, () => fakeStorage);

  writer.setItem('sens', '1.0');
  writer.setItem('sens', '1.2');
  writer.setItem('sens', '1.5');
  writer.setItem('vol', '0.8');

  assert.equal(writes.length, 0);
  writer.flush();

  assert.equal(writes.length, 2);
  assert.deepEqual(writes, [
    { k: 'sens', v: '1.5' },
    { k: 'vol', v: '0.8' },
  ]);

  // Subsequent flush does nothing when queue is empty
  writer.flush();
  assert.equal(writes.length, 2);
});

test('scheduleIdlePrefetch runs loaders sequentially and stops when shouldContinue turns false', async () => {
  const ran: number[] = [];
  let allow = true;
  const cancel = scheduleIdlePrefetch(
    [
      () => {
        ran.push(1);
        return Promise.resolve();
      },
      () => {
        ran.push(2);
        allow = false;
        return Promise.resolve();
      },
      () => {
        ran.push(3);
        return Promise.resolve();
      },
    ],
    {
      initialDelayMs: 5,
      stepDelayMs: 5,
      shouldContinue: () => allow,
    }
  );

  await new Promise((r) => setTimeout(r, 80));
  cancel();
  assert.deepEqual(ran, [1, 2]);
});

test('computePreviewRenderSize caps low-res preview canvas while preserving aspect ratio', () => {
  const wide = computePreviewRenderSize(960, 480);
  assert.equal(wide.width, 384);
  assert.equal(wide.height, 192);

  const tall = computePreviewRenderSize(200, 400);
  assert.equal(tall.width, 160);
  assert.equal(tall.height, 224);

  const small = computePreviewRenderSize(180, 120);
  assert.equal(small.width, 180);
  assert.equal(small.height, 120);

  const invalid = computePreviewRenderSize(0, -10);
  assert.ok(invalid.width >= 160 && invalid.height >= 100);
});

test('createDebouncedCallback works safely as a DOM EventListener bound to non-function objects', async () => {
  let called = 0;
  const debounced = createDebouncedCallback(() => {
    called += 1;
  }, 15);
  const fakeWindowTarget: { listener?: EventListener } = { listener: debounced as EventListener };
  fakeWindowTarget.listener?.({} as Event);
  await new Promise((r) => setTimeout(r, 35));
  assert.equal(called, 1);
});
