import * as Comlink from "https://unpkg.com/comlink/dist/esm/comlink.mjs";

const frameToFrameTime = Comlink.wrap(
	new Worker(new URL("./EstimateDeviceFpsWorker.mjs", import.meta.url).href, { type: "module" }));

export async function estimateDeviceFps() {
	const f2f = await frameToFrameTime();
	const fps = 1000 / f2f;
	return fps;
}