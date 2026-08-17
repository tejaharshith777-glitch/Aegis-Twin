/**
 * server/index.ts
 * Local HTTP server entry point — wraps the Express app (server/app.ts)
 * with a raw http.Server, WebSocket proxy for Deepgram, and graceful shutdown.
 * NOT used on Vercel; Vercel uses api/server.ts instead.
 */

import http from 'http';
import { WebSocket, WebSocketServer } from 'ws';
import { config } from './config.js';
import { store } from './store.js';
import { detectionEngine } from './detections.js';
import { app } from './app.js';

/* ── HTTP + WebSocket Server ──────────────────────────────────────────── */
const server = http.createServer(app);
const wss = new WebSocketServer({ noServer: true });

server.on('upgrade', (request, socket, head) => {
  const pathname = new URL(request.url || '', `http://${request.headers.host}`).pathname;
  if (pathname === '/api/listen') {
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, request);
    });
  } else {
    socket.destroy();
  }
});

/* ── Deepgram Nova-3 WebSocket Proxy ──────────────────────────────────── */
wss.on('connection', (ws: WebSocket) => {
  const apiKey = config.deepgramApiKey;
  if (!apiKey) {
    ws.send(JSON.stringify({ type: 'error', message: 'Deepgram API key is not configured.' }));
    ws.close(1008, 'Deepgram not configured');
    return;
  }

  const queryParams = new URLSearchParams({
    model: 'nova-3',
    smart_format: 'true',
    interim_results: 'true',
    utterance_end_ms: '1000',
    vad_events: 'true',
    endpointing: '500',
    keyterm: 'DDoS,Kubernetes,SIEM,EDR,PowerShell,exfiltration,ransomware',
  });

  const deepgramWs = new WebSocket(
    `wss://api.deepgram.com/v1/listen?${queryParams.toString()}`,
    { headers: { Authorization: `Token ${apiKey}` } }
  );

  let pingTimer: NodeJS.Timeout | null = null;

  deepgramWs.on('open', () => {
    pingTimer = setInterval(() => {
      if (deepgramWs.readyState === WebSocket.OPEN) {
        deepgramWs.send(JSON.stringify({ type: 'KeepAlive' }));
      }
    }, 8000);
  });

  deepgramWs.on('message', (data: Buffer) => {
    try {
      const parsed = JSON.parse(data.toString());
      if (parsed.channel?.alternatives?.[0]) {
        const alt = parsed.channel.alternatives[0];
        ws.send(
          JSON.stringify({
            type: 'transcript',
            transcript: alt.transcript || '',
            confidence: alt.confidence || 0,
            isFinal: Boolean(parsed.is_final),
            speechFinal: Boolean(parsed.speech_final),
          })
        );
      }
    } catch { /* ignore parse errors */ }
  });

  deepgramWs.on('error', (err) => {
    ws.send(JSON.stringify({ type: 'error', message: err.message }));
  });

  deepgramWs.on('close', () => {
    if (pingTimer) clearInterval(pingTimer);
    ws.close();
  });

  ws.on('message', (data: Buffer) => {
    if (deepgramWs.readyState === WebSocket.OPEN) {
      if (deepgramWs.bufferedAmount > 1024 * 1024) {
        console.warn('[WS Warning] Deepgram socket bufferedAmount > 1MB, dropping frame');
        return;
      }
      deepgramWs.send(data);
    }
  });

  ws.on('close', () => {
    if (pingTimer) clearInterval(pingTimer);
    if (deepgramWs.readyState === WebSocket.OPEN) {
      deepgramWs.send(JSON.stringify({ type: 'CloseStream' }));
      deepgramWs.close();
    }
  });
});

/* ── Graceful Shutdown ────────────────────────────────────────────────── */
function gracefulShutdown(signal: string) {
  console.log(`[System] Received ${signal}. Shutting down gracefully...`);
  server.close(() => {
    detectionEngine.shutdown();
    store.shutdown();
    process.exit(0);
  });

  setTimeout(() => {
    console.error('[System] Forced shutdown after 10s timeout.');
    process.exit(1);
  }, 10000);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

process.on('uncaughtException', (err) => {
  console.error('[Fatal Uncaught Exception]', err);
  store.shutdown();
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  console.error('[Fatal Unhandled Rejection]', reason);
  store.shutdown();
  process.exit(1);
});

/* ── Start ────────────────────────────────────────────────────────────── */
server.listen(config.port, () => {
  console.log(`[Aegis Twin API] Listening on http://0.0.0.0:${config.port}`);
});
