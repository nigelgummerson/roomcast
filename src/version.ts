// App version, sourced from package.json at build time (see vite.config.ts).
export const APP_VERSION = __APP_VERSION__;

// Zero-padded display form (semver stays valid in package.json):
//   1.0.0-beta -> 1.00.00-beta
export const APP_VERSION_DISPLAY = APP_VERSION.replace(
  /^(\d+)\.(\d+)\.(\d+)/,
  (_m, maj, min, pat) => `${maj}.${min.padStart(2, "0")}.${pat.padStart(2, "0")}`,
);
