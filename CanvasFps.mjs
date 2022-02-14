import { ThreadLocalRAFIterator } from './AnimationFrameIterator.mjs';

export class CanvasFps {
  constructor(ctx, fpsTracker) {
    this.ctx = ctx;
    this.fpsTracker = fpsTracker;

    this._x = ctx.canvas.width / 2;
    this._y = ctx.canvas.height / 2;
    this._r = Math.min(this._x, this._y);
  }
  
  /*
   * Note: Drawing uses a local rAF loop to run the canvas paints, but it doesnt use the
   * rAF timing to visualize results.  Those come from fpsTracker which may or may not be
   * using a local rAF loop to count.
   */
  async startDrawing() {
    for await (let frameTime of ThreadLocalRAFIterator()) {
      let fps = this.fpsTracker.mostRecentFps.toFixed(1);

      this.ctx.clearRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);
      this.drawCircle(this.fpsTracker.getColor());
      this.drawText(fps);

    }
  }

  drawCircle(color) {
    this.ctx.beginPath();
    this.ctx.fillStyle = color;
    this.ctx.arc(this._x, this._y, this._r, 0, 2 * Math.PI, false);
    this.ctx.fill();
  }

  drawText(text) {
    this.ctx.fillStyle = "#000";
    this.ctx.font = `${this._r * 0.75}px Roboto`;
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText(text, this._x, this.ctx.canvas.height / 2);
  }
}
