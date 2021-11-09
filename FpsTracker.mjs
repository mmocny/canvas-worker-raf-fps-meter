// TODO: In theory, using CanvasWorker we can estimate maxFps fairly consistently.
// For now, just assume "60fps Ought to be Enough for Anyone"
const maxFps = 60;

export class FpsTracker {
  constructor(dur=1000) {
    this._dur = dur;
    this._frameTimes = [];
  }

  get mostRecentFps() {
    return this._frameTimes.length / this._dur * 1000;
  }

  // TODO: This doesn't take into account any of the specifics from web.dev/smoothness
  get mostRecentPercentDropped() {
    return 1 - (this.mostRecentFps / maxFps);
  }

  reportNewFrame(frameTime) {
    this._frameTimes.push(frameTime);
    return this.updateForTimestamp(frameTime);
  }

  updateForTimestamp(ts) {
    this._frameTimes = this._frameTimes.filter(t => ts - t - this._dur < Number.EPSILON);

    return this.mostRecentFps;
  }

  getColor() {
    const percentDropped = this.mostRecentPercentDropped;
    if (percentDropped > 3/4) return 'red';
    if (percentDropped > 2/4) return 'orange';
    if (percentDropped > 1/4) return 'yellow';
    return '#73AD21';
  }
};


