import compression from 'compression';
import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { incidents, triage } from './engine.js';

const app = express();
const port = Number(process.env.PORT) || 3001;
const __dirname = path.dirname(fileURLToPath(import.meta.url));

app.disable('x-powered-by');
app.use(compression());
app.use(express.json({ limit: '32kb' }));

app.get('/api/health', (_request, response) => {
  response.json({ status: 'operational', agent: 'Aegis Twin', checkedAt: new Date().toISOString() });
});

app.get('/api/incidents', (_request, response) => {
  response.json({ incidents, total: incidents.length });
});

app.post('/api/agent/triage', async (request, response) => {
  const query = typeof request.body?.query === 'string' ? request.body.query.trim() : '';
  if (!query) {
    response.status(400).json({ message: 'A security question or command is required.' });
    return;
  }
  if (query.length > 1200) {
    response.status(400).json({ message: 'Please keep commands under 1,200 characters.' });
    return;
  }

  // Keep the experience conversational while the client visualizes the triage pipeline.
  await new Promise((resolve) => setTimeout(resolve, 520));
  response.json(triage(query));
});

app.post('/api/actions', async (request, response) => {
  const { action, entity } = request.body ?? {};
  if (typeof action !== 'string') {
    response.status(400).json({ message: 'An action is required.' });
    return;
  }
  await new Promise((resolve) => setTimeout(resolve, 320));
  response.json({
    success: true,
    action,
    entity: typeof entity === 'string' ? entity : 'affected entity',
    message:
      action === 'brief'
        ? 'Incident brief created and added to the activity log.'
        : 'Containment workflow approved and dispatched to the relevant control plane.',
    completedAt: new Date().toISOString(),
  });
});

if (process.env.NODE_ENV === 'production') {
  const distPath = path.resolve(__dirname, '../dist');
  app.use(express.static(distPath));
  app.get('/{*splat}', (_request, response) => response.sendFile(path.join(distPath, 'index.html')));
}

app.use((_request, response) => {
  response.status(404).json({ message: 'Resource not found.' });
});

app.listen(port, '0.0.0.0', () => {
  console.log(`Aegis API listening on http://0.0.0.0:${port}`);
});
