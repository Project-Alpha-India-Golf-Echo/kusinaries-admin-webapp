// Auto-generated access helper for build info.
// build-info.json is produced at build time by scripts/generate-build-info.mjs
import buildInfo from '../build-info.json';

export interface BuildInfo {
  appName: string;
  version: string;
  buildTime: string;
  gitCommit: string;
  gitBranch: string;
  gitTag: string;
  node: string;
}

export const BUILD: BuildInfo = buildInfo as BuildInfo;

export const shortVersion = () => `${BUILD.version}+${BUILD.gitCommit}`;
