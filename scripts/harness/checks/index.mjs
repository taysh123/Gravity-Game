// The registry of named checks, in the order they run. See lib/registry.mjs for the shape of a check.
// A new check = one file in this folder + one line here. `npm run smoke -- --list` prints the result.

import { adInflightGuard } from './ad-inflight-guard.mjs';
import { adOffersByMode } from './ad-offers-by-mode.mjs';
import { debugHandles } from './debug-handles.mjs';
import { firstRun } from './first-run.mjs';
import { listScrollRanges } from './list-scroll-ranges.mjs';
import { listViewportTaps } from './list-viewport-taps.mjs';
import { overlayTaps } from './overlay-taps.mjs';
import { screensMenus, screensPlay } from './screens.mjs';
import { settingsPrivacyWeb } from './settings-privacy-web.mjs';
import { splashBoot } from './splash-boot.mjs';
import { webStoreCopy } from './web-store-copy.mjs';

export const CHECKS = [splashBoot, debugHandles, firstRun, screensMenus, screensPlay, listViewportTaps, listScrollRanges, overlayTaps, settingsPrivacyWeb, webStoreCopy, adOffersByMode, adInflightGuard];
