#!/usr/bin/env node
import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const root = resolve(__dirname, '..');

function safeGit(cmd) {
  try { return execSync(cmd, { cwd: root, stdio: ['ignore','pipe','ignore'] }).toString().trim(); } catch { return 'unknown'; }
}

const gitCommit = safeGit('git rev-parse --short HEAD');
const gitBranch = safeGit('git rev-parse --abbrev-ref HEAD');
const gitTag = safeGit('git describe --tags --abbrev=0');
const isoTime = new Date().toISOString();

// read package.json version
const pkgPath = resolve(root, 'package.json');
const pkg = JSON.parse(readFileSync(pkgPath,'utf8'));

const buildInfo = {
  appName: pkg.name,
  version: pkg.version,
  buildTime: isoTime,
  gitCommit,
  gitBranch,
  gitTag,
  node: process.version,
};

writeFileSync(resolve(root, 'src', 'build-info.json'), JSON.stringify(buildInfo, null, 2));
console.log('[build-info] generated src/build-info.json');
