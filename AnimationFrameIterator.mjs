export async function raf() {
  return new Promise(resolve => {
      requestAnimationFrame(resolve);
    });
}

export async function* ThreadLocalRAFIterator() {
  for (;;) {
    yield raf();
  }
}

// TODO: What is the right way to create channel?
export async function* PostMessageRAFIterator() {
  for (;;) {
    yield new Promise(resolve => {
      const handler = (e) => {
        switch (e.data.msg) {
          case 'raf':
            resolve(e.data.frameTime);
            self.removeEventListener('message', handler);
            break;
        }
      };
      self.addEventListener('message', handler); // TODO: investigate using { once: true }
    });
  }
}
export function SendPostMessageRAF(worker, frameTime) {
  worker.postMessage({ msg: 'raf', frameTime });
}
