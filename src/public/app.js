// app.js — Frontend polling logic for PingBoard
// This file runs in the BROWSER (not Node.js).
// It fetches data from our Express API every 5 seconds
// and updates the DOM without any page reloads.
'use strict';

const POLL_INTERVAL = 5000; // 5 seconds in milliseconds

// ── Grab all the DOM elements we'll update ────────────────────
// We do this once at the top — faster than querying every poll cycle
const els = {
  statusBadge:   document.getElementById('statusBadge'),
  lastUpdated:   document.getElementById('lastUpdated'),
  hostname:      document.getElementById('hostname'),
  environment:   document.getElementById('environment'),
  nodeVersion:   document.getElementById('nodeVersion'),
  serverTime:    document.getElementById('serverTime'),
  uptime:        document.getElementById('uptime'),
  processUptime: document.getElementById('processUptime'),
  platform:      document.getElementById('platform'),
  cpuCores:      document.getElementById('cpuCores'),
  memBar:        document.getElementById('memBar'),
  memPct:        document.getElementById('memPct'),
  usedMemory:    document.getElementById('usedMemory'),
  freeMemory:    document.getElementById('freeMemory'),
  totalMemory:   document.getElementById('totalMemory'),
  cpuModel:      document.getElementById('cpuModel'),
  load1:         document.getElementById('load1'),
  load5:         document.getElementById('load5'),
  load15:        document.getElementById('load15'),
};

// ── Set "loading" visual state ────────────────────────────────
function setLoading() {
  Object.values(els).forEach(el => {
    if (el && el.id !== 'statusBadge' && el.id !== 'lastUpdated') {
      el.classList.add('loading');
    }
  });
}

// ── Update the status badge ───────────────────────────────────
function setStatus(online) {
  els.statusBadge.textContent = online ? '● Online' : '● Offline';
  els.statusBadge.className   = `status-badge ${online ? 'online' : 'offline'}`;
}

// ── Update all DOM elements with fresh API data ───────────────
function render(data) {
  // Remove loading pulse now that data has arrived
  Object.values(els).forEach(el => el?.classList.remove('loading'));

  els.hostname.textContent       = data.hostname;
  els.environment.textContent    = data.environment.toUpperCase();
  els.nodeVersion.textContent    = data.nodeVersion;
  els.platform.textContent       = data.platform;
  els.cpuCores.textContent       = `${data.cpuCores} cores`;
  els.uptime.textContent         = data.uptime;
  els.processUptime.textContent  = data.processUptime;
  els.cpuModel.textContent       = data.cpuModel;

  // Format server time nicely for the browser's locale
  els.serverTime.textContent = new Date(data.serverTime)
    .toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  // Memory bar — CSS transition makes it animate smoothly
  els.memBar.style.width     = `${data.memoryUsedPct}%`;
  els.memPct.textContent     = `${data.memoryUsedPct}%`;
  els.usedMemory.textContent = data.usedMemory;
  els.freeMemory.textContent = data.freeMemory;
  els.totalMemory.textContent = data.totalMemory;

  // Colour the memory bar red if usage is high (> 85%)
  els.memBar.style.background = data.memoryUsedPct > 85
    ? 'linear-gradient(90deg, #f87171, #ef4444)'
    : 'linear-gradient(90deg, #4f8ef7, #34d399)';

  // Load averages (array: [1m, 5m, 15m])
  els.load1.textContent  = data.loadAvg[0];
  els.load5.textContent  = data.loadAvg[1];
  els.load15.textContent = data.loadAvg[2];

  // Update "last updated" timestamp
  els.lastUpdated.textContent = new Date().toLocaleTimeString();
}

// ── Fetch data from the API ───────────────────────────────────
// Called once immediately on page load, then every POLL_INTERVAL ms
async function fetchStatus() {
  try {
    const response = await fetch('/api/status');

    // If server returns an error status code, throw so we hit catch
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const data = await response.json();
    setStatus(true);
    render(data);

  } catch (error) {
    // Network error or server down — show offline state
    console.error('PingBoard fetch error:', error.message);
    setStatus(false);
    els.lastUpdated.textContent = `Error: ${error.message}`;
  }
}

// ── Kick everything off ───────────────────────────────────────
setLoading();                              // Show pulse on page load
fetchStatus();                             // Fetch immediately
setInterval(fetchStatus, POLL_INTERVAL);   // Then repeat every 5 seconds
