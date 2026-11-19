// Single source of truth for application version and build timestamp.
// Uses Vite compile-time globals in browser builds and safe fallbacks in Node tests.

declare const __APP_VERSION__: string | undefined;
declare const __BUILD_DATE__: string | undefined;

export const APP_VERSION: string =
  typeof __APP_VERSION__ !== 'undefined' && __APP_VERSION__ ? __APP_VERSION__ : 'v1.0.1';

export const BUILD_DATE: string =
  typeof __BUILD_DATE__ !== 'undefined' && __BUILD_DATE__ ? __BUILD_DATE__ : '2026-11-18';
