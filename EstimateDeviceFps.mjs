// Alternatively, set up a MessageChannel
// https://2ality.com/2017/01/messagechannel.html
import * as Comlink from "https://unpkg.com/comlink/dist/esm/comlink.mjs";

// new URL with base, instead of just relative path, so that it can run in deno
const frameToFrameTime = Comlink.wrap(
	new Worker(new URL("./EstimateDeviceFpsWorker.mjs", import.meta.url).href, { type: "module" }));

// Estimate FPS by way of using an WebWorker + double-rAF
// Unlike double-rAF on main thread, which can get delayed by long tasks and lack of rendering opportunities,
//   double-rAF in a worker will get synchronized to the device refresh rate with high probability
export async function estimateDeviceFps() {
	const f2f = await frameToFrameTime();
	const fps = 1000 / f2f;
	return fps;
}