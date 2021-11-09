# canvas-worker-raf-fps-meter
Better FPS Meter: Uses Canvas Worker to LIVE visualize main thread rAF fps and worker fps.


# Introduction

I was annoyed with a particular problem with web FPS meters: as main-thread FPS drops due to long-tasks, the FPS meter's ability to paint is itself affected!  As such, you see a stale FPS value, from the last time a frame was successfully produced.

This is especially troubling when FPS drops to 0 for a prolonged time period, since thats precisely the moment you need to know and the FPS meter will perpetually show a stale value.


# How does it work?

We can leverage OffscreenCanvas + WebWorker to decouple canvas painting from main thread updates.  We can still report main thread FPS by postMessaging frame times from main to worker.

Additionally, worker can run its own rAF loop to report impl-thread FPS.