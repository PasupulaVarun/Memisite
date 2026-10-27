# Memisite

A browser-based studio for live, movement-aware memes. Current build: layout, routing, design system, the effect/gesture catalogue, a **real camera service with live preview** and a **MediaPipe face/hand landmark pipeline with a debug overlay**. Effects, triggers and photo capture are the next milestones and are marked as planned in the UI.

## Setup

Requires Node.js 20.19+ (or 22.12+) and npm.

```bash
npm install        # also copies MediaPipe wasm and downloads two model files (needs internet once)
npm run dev        # http://localhost:5173
```

Other scripts:

| Command | What it does |
| --- | --- |
| `npm run typecheck` | Strict TypeScript check, no output |
| `npm run build` | Typecheck, then production build to `dist/` |
| `npm run preview` | Serve the production build locally |
| `npm run setup:vision` | Re-run the wasm copy and model download; fails loudly if anything is missing |

## What works now

- Landing page and four routes: Studio, Effects, Gesture Lab, Help (plus a 404 page).
- Responsive navigation with a mobile menu, active-page state, skip link, focus management and per-page titles.
- Studio layout: status bar, preview stage, capture bar and a category panel (category switching is real).
- Effects page: search and category filters run against real catalogue metadata.
- Camera: Start camera (the only thing that triggers the browser prompt), live mirrored preview, loading state, Cancel while waiting, Stop camera, Try again after errors.
- Handled errors: permission denied, no camera, camera in use/unreadable, insecure (non-HTTPS) page, unsupported browser, device disconnected mid-session, unknown failures. Nothing re-prompts automatically.
- Every track is stopped on Stop, on leaving the Studio, on page hide, and when a stream arrives after Cancel/unmount.
- Video is never uploaded or stored; the app makes no network requests besides loading its own files.
- Debug landmarks (button under the preview, enabled while the camera is on): loads the models on demand, draws up to 1 face (478 points) and 2 hands (21 points each) over the preview, and shows fps, ms per frame, detection state and hand confidence. Nothing is loaded or run until you switch it on.
- Missing detections hide the overlay and, after 1.5 s of nothing, show a framing/lighting hint. Model-load failure and repeated inference errors show Retry / Continue without tracking; the camera keeps running.
- Dark theme with one purple accent, reduced-motion support, 44px touch targets.

## What is not built yet

The trigger engine, effects rendering, photo capture and download, saved presets. Their controls are disabled and labelled, never faked. There is no backend.

## Folder structure

```
src/
  main.tsx              entry point
  App.tsx               route-to-page map
  app/                  routes.ts (route table), router.tsx (small History API router)
  components/
    layout/             AppShell, TopNav, Footer
    ui/                 Button, Badge, Icon, PageHeader, EmptyState, Viewfinder
    EffectCard.tsx, StatusBar.tsx
  features/
    camera/             cameraService (getUserMedia), useCamera hook, state types, error copy
    vision/             visionService (model lifecycle + detect), mediapipeBackend (the only MediaPipe import),
                        trackingLoop (rate-limited frame feeder), useVisionTracking (React bridge),
                        drawTracking + overlayGeometry (rendering helpers), types, messages
    effects/            effect catalogue (data, not UI branches)
    gestures/           trigger catalogue and rule steps
  pages/                Landing, Studio, Effects, GestureLab, Help, NotFound
  styles/               tokens, base, layout, components, pages
```

Planned modules (not created yet): `features/capture`, `features/settings`, the trigger engine in `features/gestures`.

## Deployment notes

Camera APIs need HTTPS, so deploy to an HTTPS static host. The app uses real URL paths (`/studio`), so the host must serve `index.html` for unknown paths. `vercel.json` already does this; on Netlify add `/* /index.html 200` to `public/_redirects`. The app assumes it is served from the site root.

## Camera notes

- Only `features/camera/cameraService.ts` touches `navigator.mediaDevices`; `useCamera` owns the lifecycle.
- The preview is mirrored with CSS. Photo capture and landmark overlays must account for this.
- After a user blocks the camera, browsers will not prompt again until site settings change; the UI says so.

## Vision pipeline notes

- Data flow: `<video>` -> `TrackingLoop` -> `VisionService.detect` -> latest result in a ref -> `DebugOverlay` paints it. Landmark data never goes through React state; the UI gets a summary about four times a second.
- Rate: at most 20 inferences per second, only on new video frames, never while the tab is hidden. A 30 fps camera effectively samples at 15 fps because frames arrive 33 ms apart.
- Models and wasm are served from your own origin (`public/mediapipe`, `public/models`, git-ignored). The library is fetched with a dynamic import, so it loads only when Debug landmarks is first used.
- Models are released when Debug landmarks is switched off, when the camera stops, and when you leave Studio.
- Face confidence is `null` by design: MediaPipe's FaceLandmarker returns no per-face score, only the configured 0.5 detection gates. Hand confidence is the handedness score.
- Hand "Left/Right" labels are shown exactly as MediaPipe reports them. They assume a mirrored image, and our frames are not mirrored, so treat them as unreliable until that is decided.
- MediaPipe may print an `INFO: Created TensorFlow Lite XNNPACK delegate` line to the console. That is normal.

## Verifying tracking on a real camera (not yet done)

Automated tests cannot prove that real landmarks follow a real person. Before building effects, check by hand in Chrome and one phone: `npm run dev`, Start camera, Debug landmarks, then
1. Face dots sit on your face and follow slow and fast head movement without trailing behind.
2. Move left/right: dots move with you in the mirrored preview, with no offset at the edges of the frame.
3. Raise one hand, then two: skeleton overlays each hand; fps stays near 15 to 20.
4. Leave the frame: overlay disappears and the hint shows after about 1.5 s; return: it comes back.
5. Dim the lights and turn partly away: it should lose tracking cleanly, not jitter wildly.
6. Toggle Debug off and on several times, then Stop camera: camera light turns off.
Record device, browser and result for each.

## Next milestone

Confirm the checklist above on real hardware, then build the first face-anchored effect.
