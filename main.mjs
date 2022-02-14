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
  const fpsTracker = new FpsTracker(5000);
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
      // blog(`will block for ${block_ms.toFixed(0)}ms, in ${(then-time).toFixed(0)}ms`);

      if (time >= then) break;
    }

    block(block_ms);
  }

  let interval;
  function toggleLongTasks() {
    if (interval) {
      interval = clearInterval(interval);
    } else {
      // setInterval default (min) interval is 4ms
      interval = setInterval(() => {
        //block((1000/90)/2);
        block(100);
        // block_with_delay((1000/90)/2);
      });
    }
  }

  // await block_with_delay(5000, 5000);
  toggleLongTasks();

  document.getElementById('t').addEventListener('keydown', (evt) => {
    block(100);
  });
})();


// https://dbaron.org/log/20100309-faster-timeouts
// Only add setZeroTimeout to the window object, and hide everything
// else in a closure.
(function() {
  var timeouts = [];
  var messageName = "zero-timeout-message";

  // Like setTimeout, but only takes a function argument.  There's
  // no time argument (always zero) and no arguments (you have to
  // use a closure).
  function setZeroTimeout(fn) {
      timeouts.push(fn);
      window.postMessage(messageName, "*");
  }

  function handleMessage(event) {
      if (event.source == window && event.data == messageName) {
          event.stopPropagation();
          if (timeouts.length > 0) {
              var fn = timeouts.shift();
              fn();
          }
      }
  }

  window.addEventListener("message", handleMessage, true);

  // Add the one thing we want added to the window object.
  window.setZeroTimeout = setZeroTimeout;
})();

export async function reportTimeToNextFrame() {
  let start = performance.now();
  let id = `MyFrame-${(Math.random() * 100000).toFixed(0)}`;

  let p = document.createElement('div');
  p.id = id;
  p.innerText = '.';
  p.setAttribute('elementtiming', id);
  document.body.appendChild(p);

  let viaElementTiming = new Promise(resolve => {
    // TODO, wrap this in a promise
    const observer = new PerformanceObserver(entryList => {
      for (const entry of entryList.getEntries()) {
        if (entry.identifier != id) continue;

        let duration = entry.renderTime - start;
        
        console.log('via Element Timing', duration, start, entry);

        resolve(duration);
      }
      observer.disconnect();
    });
    observer.observe({type: 'element'});
  });

  let viaSingleRaf = new Promise(resolve => {
    requestAnimationFrame((t1) => {
      let duration = t1 - start;

      console.log('via Single rAF', duration, t1);

      resolve(duration);
    })
  });

  let viaDoubleRaf = new Promise(resolve => {
    requestAnimationFrame((t1) => {
      requestAnimationFrame((t2) => {
        let duration = t2 - start;

        console.log('via Double rAF', duration, t1, t2);

        resolve(duration);
      })
    })
  });

  let viaRafNTask = new Promise(resolve => {
    requestAnimationFrame((t1) => {
      // TODO: try out different types of task scheduling methods to get higher priority task
      // See: https://github.com/WICG/scheduling-apis/blob/main/explainers/prioritized-post-task.md
      // setZeroTimeout(() => {
      setTimeout(() => {
        let t2 = performance.now();
        let duration = t2 - start;

        console.log('via rAF n Task', duration, t1, t2);

        resolve(duration);
      }, 0);
    })
  });

  return Promise.all([
    viaElementTiming,
    viaSingleRaf,
    viaDoubleRaf,
    viaRafNTask,
  ]);
}

window.reportTimeToNextFrame = reportTimeToNextFrame;