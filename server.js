'use strict';

const express  = require('express');
const { ExpressPeerServer } = require('peer');
const http     = require('http');
const path     = require('path');

// ── Config ──────────────────────────────────────────────────────────────────
const PORT      = parseInt(process.env.PORT || '3000', 10);
const PUBLIC_URL = process.env.PUBLIC_URL || '';          // e.g. https://rebus.example.com
const PEER_PATH  = '/peerjs';

// ── App ──────────────────────────────────────────────────────────────────────
const app    = express();
const server = http.createServer(app);

// ── PeerJS signaling server ───────────────────────────────────────────────
const peerServer = ExpressPeerServer(server, {
  path:   '/',
  key:    'peerjs',
  allow_discovery: false,
});
app.use(PEER_PATH, peerServer);

peerServer.on('connection',    (client) => console.log(`[peer] connected:    ${client.getId()}`));
peerServer.on('disconnect',    (client) => console.log(`[peer] disconnected: ${client.getId()}`));

// ── /peer-config.js — tells the browser where the peer server lives ────────
app.get('/peer-config.js', (req, res) => {
  // Derive host/port from PUBLIC_URL when set, otherwise from the request
  let host, port, secure;
  if (PUBLIC_URL) {
    try {
      const u = new URL(PUBLIC_URL);
      host   = u.hostname;
      port   = u.port ? parseInt(u.port) : (u.protocol === 'https:' ? 443 : 80);
      secure = u.protocol === 'https:';
    } catch {
      host = req.hostname; port = PORT; secure = false;
    }
  } else {
    host   = req.hostname;
    port   = PORT;
    secure = req.secure || req.headers['x-forwarded-proto'] === 'https';
  }

  res.setHeader('Content-Type', 'application/javascript');
  res.send(`
var PEER_HOST   = ${JSON.stringify(host)};
var PEER_PORT   = ${port};
var PEER_PATH   = ${JSON.stringify(PEER_PATH)};
var PEER_SECURE = ${secure};
  `.trim());
});

// ── Static files (the game HTML) ──────────────────────────────────────────
app.use(express.static(path.join(__dirname, 'public')));

// ── Start ────────────────────────────────────────────────────────────────
server.listen(PORT, () => {
  const url = PUBLIC_URL || `http://localhost:${PORT}`;
  console.log(`\n🎮  Rebus Rumble running at ${url}`);
  console.log(`📡  PeerJS signaling at     ${url}${PEER_PATH}\n`);
});
