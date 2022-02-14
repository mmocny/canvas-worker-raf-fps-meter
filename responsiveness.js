// Duration has a rounded value to 8ms, but startTime is accurate
function getRenderTimeForEntry(entry) {
	return entry.startTime + entry.duration;
}

// For events that share the same real presentation time, an odd thing happens:
// - As startTime moves forward, the duration gets smaller
// - Eventually, it can become less than the 8ms rounding value (i.e. pass a modulo-9 boundary)
// - Therefore, even for the same presentation, the `duration` value for some events may be less
// By sorting by the estimated RenderTime, we know that all events which ended up at the same presentation should be within 8ms of the earliest estimate.
//
// ...this heiristic can become a problem on screens with refresh rates higher than 120hz, where 8ms after the first renderTime can already be the next frame.
// ...but up to 120hz, we should have a gap between reported presentation times.
// ...however, if presentation times are not accurate or not vsync aligned, issues with grouping can arrise even at 60hz.
function groupEntriesByEstimatedFrameRenderTime(entries) {
	entries.sort((a,b) => getRenderTimeForEntry(a) - getRenderTimeForEntry(b));

	const ret = []; // entry[][]
	let curr = []; // entry[]

	// 8ms sliding window
	const WINDOW = 8;
	let windowStart;
	for (let entry of entries) {
		const renderTime = getRenderTimeForEntry(entry);

		if (!windowStart) {
			windowStart = renderTime;
		}
		// new window when we shift more than one "fudge factor" away
		if (renderTime - windowStart > WINDOW) {
			ret.push(curr);
			curr = [];
			windowStart = renderTime;
		}
		// add to current window
		curr.push(entry);
	}
	// add the final window
	ret.push(curr);

	return ret;
}

// After grouping entries by estimated renderTime, lets map to a single common renderTime for the frame (like a frameId)
// This is just for readability purposes.
// Note, with enough events, this be fairly accurate renderTime
// See: https://bugs.chromium.org/p/chromium/issues/detail?id=1295823
function estimateRenderTimeForFrame(entries) {
	const renderTimes = entries.map(getRenderTimeForEntry);
	const min = Math.min(...renderTimes);
	const max = Math.max(...renderTimes);
	const mid = (max+min)/2;
	const roundedMid = Math.floor((mid+4)/8)*8;
	return roundedMid;
}

// Unlike for InteractionID, here I assign labels to *all* the event types.
// Some of these may end up grouped wrong, for example, you can get a click event synthesized after a keypress.
// This grouping may make that look like "KEY,TAP".
// But for timings, I don't actually use these type values, just as FYI.
function getInteractionType(entry) {
	switch(entry.name) {
	case "keydown":
	case "keyup":
	case "keypress":
		return "KEY";
		
	case "pointerdown":
	case "pointerup":
	case "pointercancel":
	case "touchstart":
	case "touchend":
	case "touchcancel":
	case "mousedown":
	case "mouseup":
	case "gotpointercapture":
	case "lostpointercapture":
	case "click":
	case "dblclick":
	case "auxclick":
	case "contextmenu":
		return "TAP";
		
	case "pointerleave":
	case "pointerout":
	case "pointerover":
	case "pointerenter":
	case "mouseout":
	case "mouseover":
	case "mouseleave":
	case "mouseenter":
	case "lostpointercapture":
		return "HOVER";
	
	case "dragstart":
	case "dragend":
	case "dragenter":
	case "dragleave":
	case "dragover":
	case "drop":
		return "DRAG";
	
	case "beforeinput":
	case "input":
	case "compositionstart":
	case "compositionupdate":
	case "compositionend":
		return "INPUT";
		
	default:
		return "OTHER";
	}
}

function getInteractionTypesForFrame(entries) {
	return [...new Set(entries.map(entry => getInteractionType(entry)))];
}

function getInteractionIdsForFrame(entries) {
	return [...new Set(entries.map(entry => entry.interactionId).filter((id) => id != 0))];
}

// Calculate the total time spent inside entries we care about.
// Due to some peculiarities, this isn't as easy as just summing processingEnd-processingStart
// See: https://bugs.chromium.org/p/chromium/issues/detail?id=1295718
function calculateTotalProcessingTime(entries) {
	// Sort by processing [start, end].  Sometimes processing re-ordered and not in order of input timeStamp.
	entries.sort((a,b) => a.processingStart - b.processingStart || a.processingEnd - b.processingEnd);

	let sum = 0;
	let previousEndTime;
	for (let entry of entries) {
		if (!previousEndTime) {
			previousEndTime = entry.processingEnd;
		} else if (entry.processingStart < previousEndTime) {
			// Skip entries which start before the previous ended
			continue;
		}
		sum += (entry.processingEnd - entry.processingStart);
		previousEndTime = entry.processingEnd;
	}

	return sum;
}

// Generate interesting timings for a specific frame of entries
function getTimingsForFrame(entries) {
	// A note here: many entries can share startTime.  Use the first one, but don't assume its the first to get processed.
	const firstInputEntry = entries.reduce((prev,next) => prev.startTime <= next.startTime ? prev : next, entries[0]);
	const firstProcessedEntry = entries.reduce((prev,next) => prev.processingStart <= next.processingStart ? prev : next, entries[0]);
	const lastProcessedEntry = entries.reduce((prev,next) => prev.processingEnd > next.processingEnd ? prev : next, entries[0]);

	const renderTime = estimateRenderTimeForFrame(entries);
	const interactionIds = getInteractionIdsForFrame(entries);
	const interactionTypes = getInteractionTypesForFrame(entries);

	const firstDelay = firstProcessedEntry.processingStart - firstInputEntry.startTime;
	// Almost certainly we can have a more accurate paintDelay if we use the `renderTime` value-- but I'm using the value reported to be sure we don't under-estimate
	const lastPaintDelay = getRenderTimeForEntry(lastProcessedEntry) - lastProcessedEntry.processingEnd;
	const duration = firstInputEntry.duration;

	const psTime = calculateTotalProcessingTime(entries);
	const psRange = lastProcessedEntry.processingEnd - firstProcessedEntry.processingStart;

	const pctOfRange = psTime / psRange;
	const pctOfDuration = psTime / duration;

	// Just some light testing of expectations:
	if (psRange < 0 || psTime > psRange) {
		console.log(`ruh roh, psTime: ${psTime} psRange: ${psRange}`, entries);
	}

	return {
		renderTime,
		interactionIds,
		interactionTypes,
		duration,
		firstDelay,
		psTime,
		psRange,
		lastPaintDelay,
		pctOfRange,
		pctOfDuration,
	}
}

// Make results easier to look at
function roundOffNumbers(obj, places) {
	for (let key in obj) {
		const val = obj[key];
		if (typeof val === 'number') {
			obj[key] = Number(val.toFixed(places));
		}
	}
	return obj;
}

export function measureResponsiveness() {
	const AllEntries = [];

	const observer = new PerformanceObserver(list => {
		AllEntries.push(...list.getEntries());

		const AllInteractionIds = getInteractionIdsForFrame(AllEntries);
		const entriesByFrame = groupEntriesByEstimatedFrameRenderTime(AllEntries);
		
		// Filter frames which have only HOVER interactions.  Leave HOVER events until after timings are calculated.
		const timingsByFrame = entriesByFrame.map(getTimingsForFrame)
			.filter(timings => timings.interactionTypes.some(type => type != "HOVER"));

		console.log(`Now have ${AllInteractionIds.length} interactions, in ${entriesByFrame.length} frames, with ${AllEntries.length} entries.`);
		// console.log(new Set(AllEntries.map((entry)=>entry.name)));
		// console.log(new Set(AllEntries.map(getInteractionType)));
		// console.log("timingsByFrame:", JSON.stringify(timingsByFrame, null, 2));
		// console.log(entriesByFrame);
		console.table(timingsByFrame.map(timings => (roundOffNumbers({
			...timings,
			interactionIds: timings.interactionIds.join(','),
			interactionTypes: timings.interactionTypes.join(','),
		}, 3))));
	});

	observer.observe({
		type: "event",
		durationThreshold: 0, // 16 minumum by spec
		buffered: true
	});
}

// measureResponsiveness();