// server.js — PingBoard Express backend
'use strict';

const express = require('express');
const os      = require('os');        // Built into Node — gives us system info
const path    = require('path');      // Built into Node — handles file paths safely

const app  = express();
const PORT = process.env.PORT || 3000;

// ── Serve the frontend ────────────────────────────────────────
// This single line makes Express serve everything in src/public/
// as static files. When a browser requests '/', it gets index.html.
app.use(express.static(path.join(__dirname, 'src', 'public')));

// ── Helper: format bytes into human-readable string ───────────
function formatBytes(bytes) {
  const mb = bytes / 1024 / 1024;
  return `${mb.toFixed(1)} MB`;
}

// ── Helper: format uptime seconds into readable string ────────
function formatUptime(seconds) {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m ${s}s`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

// ── API Route: GET /api/status ────────────────────────────────
// This is the heart of the app. The frontend calls this every 5s.
// We return a JSON object with real server stats — no fake data.
app.get('/api/status', (req, res) => {
  const totalMem = os.totalmem();
  const freeMem  = os.freemem();
  const usedMem  = totalMem - freeMem;

  res.json({
    // Server identity
    hostname:       os.hostname(),
    platform:       os.platform(),        // e.g. 'linux', 'darwin'
    nodeVersion:    process.version,      // e.g. 'v22.0.0'

    // Time
    serverTime:     new Date().toISOString(),
    uptime:         formatUptime(os.uptime()),
    processUptime:  formatUptime(process.uptime()),

    // Memory
    totalMemory:    formatBytes(totalMem),
    freeMemory:     formatBytes(freeMem),
    usedMemory:     formatBytes(usedMem),
    memoryUsedPct:  Math.round((usedMem / totalMem) * 100),

    // CPU
    cpuModel: os.cpus()[0]?.model ?? 'Unknown',
    cpuCores: os.cpus().length,
    loadAvg:  os.loadavg().map(n => n.toFixed(2)), // [1m, 5m, 15m]

    // App info
    environment: process.env.NODE_ENV || 'development',
    port:        PORT,
  });
});

// ── API Route: GET /api/health ────────────────────────────────
// Simple health check — used by Docker HEALTHCHECK and Kubernetes
// liveness probes. Always returns 200 OK if the server is running.
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ── Start the server ──────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`PingBoard running on http://localhost:${PORT}`);
  console.log(`Environment : ${process.env.NODE_ENV || 'development'}`);
  console.log(`Node version: ${process.version}`);
});
