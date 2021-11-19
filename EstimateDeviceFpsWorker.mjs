import * as Comlink from "https://unpkg.com/comlink/dist/esm/comlink.mjs";

async function frameToFrameTime() {
	return new Promise((resolve) => {
		requestAnimationFrame((start) => {
			requestAnimationFrame((end) => {
				resolve(end-start);
			});
		});
	});
}

Comlink.expose(frameToFrameTime);
