// Vercel serverless entrypoint for the API. Wraps the existing Express app —
// Express apps are directly compatible with Vercel's Node.js request handler
// signature (req, res), so no adapter library is needed.
import { app } from "../apps/api/src/app";

export default app;
