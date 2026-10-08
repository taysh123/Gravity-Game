// Types for scripts/lib/releaseInputs.mjs (see releaseCheck.d.mts).
import type { AdmobProdIds, ReleaseInput } from './releaseCheck.mjs';

export const SYNCED_ASSETS_DIR: string;
export const DEBUG_ENV_KEYS: readonly string[];

export function gatherReleaseInputs(args: {
  root: string;
  env: Record<string, string | undefined>;
  admobProd: AdmobProdIds;
  revenueCatApiKey: string;
  admobAppIdArg?: string;
}): ReleaseInput;

export function readSyncedAssets(root: string): Array<{ path: string; text: string }>;
