// Single source of truth for the quant math is the browser's src/lib/math.ts.
// This shim re-exports it so the API answers the same numbers as the web app.
export * from '../../src/lib/math.js';
