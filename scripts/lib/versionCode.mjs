// D-20 versioning: the ONE implementation of the versionCode formula.
//
//   versionCode = MAJOR*1_000_000 + MINOR*10_000 + PATCH*100 + BUILD
//
// MAJOR.MINOR.PATCH is `version` in package.json (it is also the Android versionName), BUILD is
// `androidBuild` in package.json. The rc label lives only in git tags, never in `version`.
// scripts/version.mjs and scripts/facts/factsLib.mjs both import this file; android/app/build.gradle
// mirrors the same rules in Groovy (the `android-debug` CI job compares the two outputs).
//
// Pure: no filesystem, no clock, no child processes. Errors are VersionError.

export class VersionError extends Error {
  constructor(message) {
    super(message);
    this.name = 'VersionError';
  }
}

/** MINOR, PATCH and BUILD each occupy two decimal digits of the code. */
export const PART_MAX = 99;
/** Google Play rejects a versionCode above this. */
export const MAX_VERSION_CODE = 2_100_000_000;
/** An AAB with versionCode 1 is already on Play; 1.0.0 build 1 is the first upload after P0. */
export const MIN_UPLOAD_VERSION_CODE = 1_000_001;

const SEMVER = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;

/** `MAJOR.MINOR.PATCH` (no rc label, no leading zeros) to numbers. Range is checked by deriveVersionCode. */
export function parseVersion(version) {
  const m = typeof version === 'string' ? SEMVER.exec(version) : null;
  if (!m) {
    throw new VersionError(
      `version must be a plain MAJOR.MINOR.PATCH with no rc label (the label lives only in the git tag); got ${JSON.stringify(version)}`,
    );
  }
  return { major: Number(m[1]), minor: Number(m[2]), patch: Number(m[3]) };
}

function assertPart(name, value) {
  if (!Number.isInteger(value) || value < 0 || value > PART_MAX) {
    throw new VersionError(`${name} must be an integer 0-${PART_MAX}; got ${JSON.stringify(value)}`);
  }
}

/** The D-20 versionCode. Throws VersionError for a bad version or any part out of range, or a code above the Play cap. */
export function deriveVersionCode(version, androidBuild) {
  const { major, minor, patch } = parseVersion(version);
  assertPart('MINOR', minor);
  assertPart('PATCH', patch);
  assertPart('androidBuild (BUILD)', androidBuild);
  const code = major * 1_000_000 + minor * 10_000 + patch * 100 + androidBuild;
  if (!(code <= MAX_VERSION_CODE)) {
    throw new VersionError(
      `version ${version} build ${androidBuild} derives versionCode ${code}, above Google Play's maximum ${MAX_VERSION_CODE}`,
    );
  }
  return code;
}

/** `{ versionName, versionCode }`: versionName is the semver itself. */
export function deriveVersion(version, androidBuild) {
  return { versionName: version, versionCode: deriveVersionCode(version, androidBuild) };
}

/** The next build number. A code is never reused or wrapped: past 99 the PATCH must be bumped instead. */
export function bumpBuild(androidBuild) {
  assertPart('androidBuild (BUILD)', androidBuild);
  if (androidBuild >= PART_MAX) {
    throw new VersionError(
      `androidBuild is already ${PART_MAX}; bump PATCH (and reset androidBuild) instead of wrapping, so versionCode keeps increasing`,
    );
  }
  return androidBuild + 1;
}

/** Bump `androidBuild` in package.json text, touching nothing else (formatting and EOLs are kept). */
export function bumpBuildInPackageJson(text) {
  let pkg;
  try {
    pkg = JSON.parse(text);
  } catch (err) {
    throw new VersionError(`package.json is not valid JSON: ${err.message}`);
  }
  deriveVersion(pkg.version, pkg.androidBuild); // validates the current state before changing it
  const from = pkg.androidBuild;
  const to = bumpBuild(from);
  const literal = /("androidBuild"\s*:\s*)(\d+)(\s*[,}\r\n])/g;
  const found = text.match(literal) ?? [];
  if (found.length !== 1) {
    throw new VersionError(`expected exactly one top-level "androidBuild": <integer> in package.json, found ${found.length}`);
  }
  return {
    text: text.replace(literal, (_all, key, _digits, tail) => `${key}${to}${tail}`),
    from,
    to,
    ...deriveVersion(pkg.version, to),
  };
}

/** Release floor: strictly above the code already on Play (1) and within the Play cap. */
export function assertUploadable(versionCode) {
  if (!Number.isInteger(versionCode) || versionCode < MIN_UPLOAD_VERSION_CODE || versionCode > MAX_VERSION_CODE) {
    throw new VersionError(
      `versionCode ${versionCode} is not uploadable: it must be an integer from ${MIN_UPLOAD_VERSION_CODE} to ${MAX_VERSION_CODE} (Play already holds versionCode 1)`,
    );
  }
}
