// Vercel serves the built frontend (dist/) itself; this function serves the API. vercel.json routes every
// /api/* request here, and Express still sees the original path (e.g. /api/scan-receipt).
import app from '../server/routes.js';

export default app;
