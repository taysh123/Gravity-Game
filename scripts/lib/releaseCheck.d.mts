// Types for scripts/lib/releaseCheck.mjs, so the TypeScript test src/config/releaseConfig.test.ts can import it under strict.
export const GOOGLE_TEST_PUBLISHER: string;

export interface ReleaseFailure {
  id: string;
  subject: string;
  message: string;
}

export interface AdmobProdIds {
  readonly appId: string;
  readonly rewardedAdId: string;
  readonly interstitialAdId: string;
}

export interface ReleaseInput {
  admobProd: AdmobProdIds;
  revenueCatApiKey: string;
  env: Record<string, string | undefined>;
  versionCode: number | null;
  versionCodeError?: string;
  lastUploadedVersionCode: number | null;
  admobAppIdArg?: string;
}

export function checkRelease(input: ReleaseInput): ReleaseFailure[];
export function scanAssets(files: ReadonlyArray<{ path: string; text: string }>): ReleaseFailure[];
export function parseLastUploadedVersionCode(statusText: string): number | null;
export function formatReport(failures: ReadonlyArray<ReleaseFailure>, title: string): string;
