/**
 * Legacy Worker entry point.
 *
 * The deployed Worker is src/login-worker.js (see `main` in wrangler.toml).
 * This file used to hold a second, duplicated copy of the login SQL, which
 * meant two places to keep in sync. It now re-exports the real handler so any
 * deployment that still points here behaves identically.
 */
export { default } from '../src/login-worker.js';
