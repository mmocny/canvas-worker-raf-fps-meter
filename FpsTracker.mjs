export class FpsTracker {
  constructor(dur=1000) {
    this._dur = dur;
    this._frameTimes = [];
  }

  get mostRecentFps() {
    // console.log(this._frameTimes.length, this._dur);
    return (this._frameTimes.length / this._dur) * 1000;
  }

  reportNewFrame(frameTime) {
    this._frameTimes.push(frameTime);
    return this.updateForTimestamp(frameTime);
  }

  updateForTimestamp(ts) {
    this._frameTimes = this._frameTimes.filter(t => (ts - t) <= this._dur);

    return this.mostRecentFps;
  }

  getColor() {
    const fps = this.mostRecentFps;
    const percentDropped = 1-(fps/60);
    // console.log(fps, percentDropped);

    if (percentDropped > 3/4) return 'red';
    if (percentDropped > 2/4) return 'orange';
    if (percentDropped > 1/4) return 'yellow';
    return '#73AD21';
  }
};


