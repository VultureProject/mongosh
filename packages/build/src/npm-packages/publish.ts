import path from 'path';
import {
  EXCLUDE_RELEASE_PACKAGES,
  LERNA_BIN,
  MONGOSH_RELEASE_PACKAGES,
  PROJECT_ROOT,
} from './constants';
import type { LernaPackageDescription } from './list';
import { listNpmPackages as listNpmPackagesFn } from './list';
import { spawnSync as spawnSyncFn } from '../helpers/spawn-sync';
import type { SpawnSyncOptionsWithStringEncoding } from 'child_process';

export function publishToNpm(
  { isDryRun = false, useAuxiliaryPackagesOnly = false },
  listNpmPackages: typeof listNpmPackagesFn = listNpmPackagesFn,
  markBumpedFilesAsAssumeUnchangedFn: typeof markBumpedFilesAsAssumeUnchanged = markBumpedFilesAsAssumeUnchanged,
  spawnSync: typeof spawnSyncFn = spawnSyncFn
): void {
  const commandOptions: SpawnSyncOptionsWithStringEncoding = {
    stdio: 'inherit',
    cwd: PROJECT_ROOT,
    encoding: 'utf8',
    env: {
      ...process.env,
      ...(isDryRun ? { npm_config_dry_run: 'true' } : {}),
    },
  };
  const allReleasablePackages = listNpmPackages().filter(
    (packageConfig) => !EXCLUDE_RELEASE_PACKAGES.includes(packageConfig.name)
  );

  const packages: LernaPackageDescription[] = useAuxiliaryPackagesOnly
    ? allReleasablePackages.filter(
        (packageConfig) =>
          !MONGOSH_RELEASE_PACKAGES.includes(packageConfig.name)
      )
    : allReleasablePackages;

  // Lerna requires a clean repository for a publish from-package
  // we use git update-index --assume-unchanged on files we know have been bumped
  markBumpedFilesAsAssumeUnchangedFn(packages, true);
  try {
    spawnSync(
      LERNA_BIN,
      [
        'publish',
        'from-package',
        '--no-private',
        '--no-changelog',
        '--exact',
        '--yes',
        '--no-verify-access',
      ],
      commandOptions
    );
  } finally {
    markBumpedFilesAsAssumeUnchangedFn(packages, false);
  }
}

export function markBumpedFilesAsAssumeUnchanged(
  packages: LernaPackageDescription[],
  assumeUnchanged: boolean,
  spawnSync: typeof spawnSyncFn = spawnSyncFn
): void {
  const filesToAssume = [
    path.resolve(PROJECT_ROOT, 'lerna.json'),
    path.resolve(PROJECT_ROOT, 'package.json'),
    path.resolve(PROJECT_ROOT, 'package-lock.json'),
  ];
  for (const { location } of packages) {
    filesToAssume.push(path.resolve(location, 'package.json'));
  }

  for (const f of filesToAssume) {
    spawnSync(
      'git',
      [
        'update-index',
        assumeUnchanged ? '--assume-unchanged' : '--no-assume-unchanged',
        f,
      ],
      {
        stdio: 'inherit',
        cwd: PROJECT_ROOT,
        encoding: 'utf8',
      },
      true
    );
    console.info(
      `File ${f} is now ${assumeUnchanged ? '' : 'NOT '}assumed to be unchanged`
    );
  }
}
