/**
 * api/server.ts
 * Vercel Serverless Function entry point.
 * Re-exports the Express app from server/app.ts as a default export,
 * which Vercel wraps as a Node.js serverless function.
 *
 * All /api/* requests are routed here by vercel.json.
 * Data is stored in /tmp (ephemeral but writable on Vercel).
 */

export { app as default } from '../server/app.js';
