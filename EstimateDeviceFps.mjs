// Alternatively, set up a MessageChannel
// https://2ality.com/2017/01/messagechannel.html
import * as Comlink from "https://unpkg.com/comlink/dist/esm/comlink.mjs";

// new URL with base, instead of just relative path, so that it can run in deno
const frameToFrameTime = Comlink.wrap(
	new Worker(new URL("./EstimateDeviceFpsWorker.mjs", import.meta.url).href, { type: "module" }));

export async function estimateDeviceFps() {
	const f2f = await frameToFrameTime();
	const fps = 1000 / f2f;
	return fps;
}