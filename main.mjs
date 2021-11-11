import { FpsTracker } from './FpsTracker.mjs';
import { CanvasFps } from './CanvasFps.mjs';
import { ThreadLocalRAFIterator, SendPostMessageRAF } from './AnimationFrameIterator.mjs';


// Set up OffscreenCanvas WebWorker
const canvas_wrkr_raf_main = document.querySelector('#canvas_wrkr_raf_main').transferControlToOffscreen();
const canvas_wrkr_raf_wrkr = document.querySelector('#canvas_wrkr_raf_wrkr').transferControlToOffscreen();
const worker = new Worker('./CanvasWorker.mjs', { type: 'module' });
worker.postMessage({
  msg: 'start',
  canvas_wrkr_raf_main,
  canvas_wrkr_raf_wrkr
}, [ canvas_wrkr_raf_main, canvas_wrkr_raf_wrkr ]);


// Start tracking frames on main, reporting frame times to worker
(async () => {
  const fpsTracker = new FpsTracker;
  const canvas_main_raf_main = document.querySelector('#canvas_main_raf_main');
  const c = new CanvasFps(canvas_main_raf_main.getContext('2d'), fpsTracker);
  c.startDrawing();

  for await (let frameTime of ThreadLocalRAFIterator()) {
    let fps = fpsTracker.reportNewFrame(frameTime);
    SendPostMessageRAF(worker, frameTime);
  }
})();

// Start adding Long Tasks on main
(async function() {
  function blog(text) {
    const el = document.getElementById('long_task_tracker');
    el.textContent = text;
  }

  function block(block_ms) {
    blog(`blocked for ${block_ms.toFixed(0)}ms`);

    let now = performance.now();
    let end = now + block_ms;
    while (now < end) {
      now = performance.now();
    }
  }

  // Will delay at least one single animation frame
  async function block_with_delay(block_ms, delay_ms = 0) {
    const then = performance.now() + delay_ms;

    for await( let time of ThreadLocalRAFIterator() ) {
      blog(`will block for ${block_ms.toFixed(0)}ms, in ${(then-time).toFixed(0)}ms`);

      if (time >= then) break;
    }

    block(block_ms);
  }

  let interval;
  function toggleLongTasks() {
    if (interval) {
      interval = clearInterval(interval);
    } else {
      interval = setInterval(() => {
        block(Math.random() * 100);
      });
    }
  }

  await block_with_delay(5000, 5000);
  toggleLongTasks();

  document.getElementById('t').addEventListener('keydown', (evt) => {
    block(100);
  });
})();
