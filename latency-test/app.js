const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d', {
  desynchronized: true,
  alpha: false
});

const cursor = { x: 0, y: 0 };
const snakeLength = 10;
const snake = new Array(snakeLength).fill(cursor);
let raf = true;
let skip = false;
let rFrames = 3;
let lastDraw = performance.now();

function resize() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}

window.addEventListener('resize', (e) => {
  resize();
});

resize();

window.addEventListener('keydown', (e) => {
  if (e.key === 'r') {
    raf = !raf;
  } else if (e.key === ' ') {
    skip = true;
  } else if (e.key === 'f') {
    document.body.requestFullscreen();
  } else if (e.key === 'ArrowUp') {
    rFrames++;
  } else if (e.key === 'ArrowDown') {
    rFrames = Math.max(0, rFrames - 1);
  }
});

function draw() {
  if (skip) {
    skip = false;
    return;
  }

  snake.push({ x: cursor.x, y: cursor.y });
  snake.shift();

  ctx.fillStyle = 'white';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.lineWidth = 3;
  ctx.lineCap = 'round';

  ctx.strokeStyle = 'black';
  ctx.beginPath();
  ctx.moveTo(snake[0].x, snake[0].y);
  for (let i = 1; i < snake.length; ++i) {
    const cur = snake[i];
    ctx.lineTo(cur.x, cur.y);
  }
  ctx.stroke();

  ctx.strokeStyle = raf ? 'green' : 'red';
  for (let i = 1; i < snake.length; ++i) {
    const prev = snake[i - 1];
    const cur = snake[i];

    const diff = {
      x: cur.x - prev.x,
      y: cur.y - prev.y
    };

    ctx.beginPath();

    ctx.moveTo(cur.x - diff.y, cur.y + diff.x);
    ctx.lineTo(cur.x + diff.y, cur.y - diff.x);

    ctx.stroke();
  }

  const last = snake[snake.length - 1];
  const blast = snake[snake.length - 2];
  const ld = { x: last.x - blast.x, y: last.y - blast.y };
  const r = Math.sqrt(ld.x * ld.x + ld.y * ld.y);

  ctx.strokeStyle = 'blue';
  ctx.beginPath();
  ctx.arc(last.x, last.y, r * rFrames, 0, 2 * Math.PI);
  ctx.stroke();

  ctx.font = '30px sans-serif';
  ctx.fillStyle = 'blue';
  ctx.fillText(`Latency: ${rFrames} ↑↓`, 0, 30);

  const now = performance.now();
  ctx.fillStyle = 'black';
  ctx.fillText(`FPS: ${Math.round(1000 / (now - lastDraw))}`, 0, 60);
  lastDraw = now;
}

canvas.addEventListener('pointermove', (e) => {
  cursor.x = e.clientX;
  cursor.y = e.clientY;

  console.log(performance.now() - e.timeStamp);

  // if (e.getCoalescedEvents) {
  //   for (let coalesced_event of e.getCoalescedEvents()) {
  //       console.log({ x: coalesced_event.clientX, y: coalesced_event.clientY }, cursor);
  //   }
  // } else {
  // }
  
  if (!raf) {
    draw();
  }
});

function render() {
  if (raf) {
    draw();
  }

  requestAnimationFrame(render);
}

requestAnimationFrame(render);
