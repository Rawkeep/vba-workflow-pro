const express = require('express');
const helmet = require('helmet');
const compression = require('compression');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';

// ---------------------------------------------------------------------------
// Middleware
// ---------------------------------------------------------------------------

app.use(cors());
app.use(compression());

// Helmet with relaxed CSP so the single-file PWA (inline scripts/styles,
// data-URIs for icons, blob URLs for downloads) keeps working.
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
  })
);

// ---------------------------------------------------------------------------
// Health-check endpoint
// ---------------------------------------------------------------------------

app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

// ---------------------------------------------------------------------------
// Static files — serves the PWA (index.html, vba-beast-v3_z.html, etc.)
// ---------------------------------------------------------------------------

app.use(
  express.static(path.join(__dirname, '.'), {
    extensions: ['html'],
    maxAge: NODE_ENV === 'production' ? '1d' : 0,
  })
);

// SPA / PWA fallback — serve index.html for any unmatched route
app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------

app.listen(PORT, () => {
  console.log(`vba-workflow-pro running on http://localhost:${PORT} [${NODE_ENV}]`);
});
