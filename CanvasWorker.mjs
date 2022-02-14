import { FpsTracker } from './FpsTracker.mjs';
import { CanvasFps } from './CanvasFps.mjs';
import { ThreadLocalRAFIterator, PostMessageRAFIterator } from './AnimationFrameIterator.mjs';

// As per: https://developers.google.com/web/updates/2018/08/offscreen-canvas

addEventListener('message', e => {
  switch (e.data.msg) {
    case 'start':
      watchPostMessageFps();
      watchThreadLocalFps();
      startCanvasFps(
        e.data.canvas_wrkr_raf_main.getContext('2d'),
        e.data.canvas_wrkr_raf_wrkr.getContext('2d')
      );
      removeEventListener('messasge', this);
      break;
  }
});

const mainFpsTracker = new FpsTracker(5000);
const wrkrFpsTracker = new FpsTracker(5000);

async function watchPostMessageFps() {
  for await (let frameTime of PostMessageRAFIterator()) {
    mainFpsTracker.reportNewFrame(frameTime);
  }
}

async function watchThreadLocalFps(ctx1, ctx2) {
  for await (let frameTime of ThreadLocalRAFIterator()) {
    mainFpsTracker.updateForTimestamp(performance.now());
    wrkrFpsTracker.reportNewFrame(frameTime);
  }
}

function startCanvasFps(ctx_main, ctx_wrkr) {
  const c_main = new CanvasFps(ctx_main, mainFpsTracker);
  const c_wrkr = new CanvasFps(ctx_wrkr, wrkrFpsTracker);
  c_main.startDrawing();
  c_wrkr.startDrawing();
}
