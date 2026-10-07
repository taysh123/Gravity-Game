#!/usr/bin/env node
// D-20 version CLI. Reads `version` and `androidBuild` from package.json (the one version file) and prints
// the Android versionName / versionCode derived by scripts/lib/versionCode.mjs.
//
//   node scripts/version.mjs --code         print the derived versionCode (e.g. 1000001)
//   node scripts/version.mjs --name         print the versionName (the semver in package.json)
//   node scripts/version.mjs --bump-build   androidBuild += 1 in package.json (refuses past 99), prints old -> new
//   node scripts/version.mjs --check        validate package.json: plain MAJOR.MINOR.PATCH, MINOR/PATCH/androidBuild 0-99,
//                                           code <= 2_100_000_000 (Play cap) and >= 1_000_001 (Play already holds code 1)
//
// `./gradlew -q :app:printVersionCode` (android/app/build.gradle) must print the same number as --code; the
// `android-debug` job in .github/workflows/ci.yml compares the two and fails on any mismatch.
// Exit codes: 0 ok, 1 invalid version data (VersionError), 2 usage or I/O error.
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import {
  VersionError,
  assertUploadable,
  bumpBuildInPackageJson,
  deriveVersion,
} from './lib/versionCode.mjs';

const PACKAGE_JSON = fileURLToPath(new URL('../package.json', import.meta.url));
const USAGE = 'usage: node scripts/version.mjs --code | --name | --bump-build | --check';

function readPackage() {
  const text = readFileSync(PACKAGE_JSON, 'utf8');
  try {
    return { text, pkg: JSON.parse(text) };
  } catch (err) {
    throw new VersionError(`package.json is not valid JSON: ${err.message}`);
  }
}

function run(argv) {
  if (argv.length !== 1) {
    console.error(USAGE);
    return 2;
  }
  const [flag] = argv;
  switch (flag) {
    case '--code': {
      const { pkg } = readPackage();
      console.log(String(deriveVersion(pkg.version, pkg.androidBuild).versionCode));
      return 0;
    }
    case '--name': {
      const { pkg } = readPackage();
      console.log(deriveVersion(pkg.version, pkg.androidBuild).versionName);
      return 0;
    }
    case '--bump-build': {
      const { text } = readPackage();
      const next = bumpBuildInPackageJson(text);
      writeFileSync(PACKAGE_JSON, next.text);
      console.log(`androidBuild ${next.from} -> ${next.to}; versionName ${next.versionName}, versionCode ${next.versionCode}`);
      return 0;
    }
    case '--check': {
      const { pkg } = readPackage();
      const { versionName, versionCode } = deriveVersion(pkg.version, pkg.androidBuild);
      assertUploadable(versionCode);
      console.log(`version: ok (versionName ${versionName}, androidBuild ${pkg.androidBuild}, versionCode ${versionCode})`);
      return 0;
    }
    default:
      console.error(`unknown argument "${flag}"\n${USAGE}`);
      return 2;
  }
}

try {
  process.exitCode = run(process.argv.slice(2));
} catch (err) {
  if (err instanceof VersionError) {
    console.error(`version: error: ${err.message}`);
    process.exitCode = 1;
  } else {
    console.error(`version: error: ${err?.message ?? err}`);
    process.exitCode = 2;
  }
}
