import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

export interface AegisConfig {
  dataDir: string;
  seed: boolean;
  operatorTokens: Map<string, string>; // token -> name
  openRead: boolean;
  ingestDir: string;
  assetOfflineMinutes: number;
  maxUtteranceSeconds: number;
  controlPlane: 'local' | 'crowdstrike' | 'sentinelone' | 'entra' | 'webhook';
  webhookUrl?: string;
  webhookSigningSecret?: string;
  deepgramApiKey?: string;
  geminiApiKey?: string;
  murfApiKey?: string;
  trustProxy: boolean;
  port: number;
}

function maskKey(key?: string): string {
  if (!key) return 'no';
  if (key.length <= 8) return 'yes (configured)';
  return `yes (…${key.slice(-4)})`;
}

export function loadConfig(): AegisConfig {
  const errors: string[] = [];

  const dataDir = path.resolve(process.env.AEGIS_DATA_DIR || './data');
  const seed = process.env.AEGIS_SEED === 'true';
  const openRead = process.env.AEGIS_OPEN_READ === 'true';
  const ingestDir = path.resolve(process.env.AEGIS_INGEST_DIR || './ingest');

  const assetOfflineMinutes = parseInt(process.env.ASSET_OFFLINE_MINUTES || '15', 10);
  if (isNaN(assetOfflineMinutes) || assetOfflineMinutes <= 0) {
    errors.push('ASSET_OFFLINE_MINUTES must be a positive integer.');
  }

  const maxUtteranceSeconds = parseInt(process.env.MAX_UTTERANCE_SECONDS || '120', 10);
  if (isNaN(maxUtteranceSeconds) || maxUtteranceSeconds <= 0) {
    errors.push('MAX_UTTERANCE_SECONDS must be a positive integer.');
  }

  const controlPlaneRaw = (process.env.CONTROL_PLANE || 'local').toLowerCase();
  const validControlPlanes = ['local', 'crowdstrike', 'sentinelone', 'entra', 'webhook'];
  if (!validControlPlanes.includes(controlPlaneRaw)) {
    errors.push(`CONTROL_PLANE must be one of: ${validControlPlanes.join(', ')}`);
  }
  const controlPlane = controlPlaneRaw as AegisConfig['controlPlane'];

  const webhookUrl = process.env.WEBHOOK_URL;
  const webhookSigningSecret = process.env.WEBHOOK_SIGNING_SECRET;
  if (controlPlane === 'webhook' && !webhookUrl) {
    errors.push('WEBHOOK_URL is required when CONTROL_PLANE=webhook.');
  }

  const operatorTokens = new Map<string, string>();
  const rawTokens = process.env.AEGIS_OPERATOR_TOKENS || 'alex:8f9a2b4c1e3d5f7a9b0c2d4e6f8a0b2c4d6e8f0a2b4c6d8e0f2a4b6c8d0e2f4a';
  rawTokens.split(',').forEach((entry) => {
    const trimmed = entry.trim();
    if (!trimmed) return;
    const parts = trimmed.split(':');
    if (parts.length >= 2) {
      const name = parts[0].trim();
      const token = parts.slice(1).join(':').trim();
      if (name && token) {
        operatorTokens.set(token, name);
      }
    }
  });

  if (operatorTokens.size === 0) {
    errors.push('AEGIS_OPERATOR_TOKENS must define at least one name:token pair.');
  }

  const trustProxy = process.env.TRUST_PROXY === '1' || process.env.TRUST_PROXY === 'true';
  const port = parseInt(process.env.PORT || '3001', 10);

  if (errors.length > 0) {
    console.error('================================================================');
    console.error('AEGIS CONFIGURATION VALIDATION FAILED:');
    errors.forEach((err) => console.error(`  - ${err}`));
    console.error('================================================================');
    process.exit(1);
  }

  const config: AegisConfig = {
    dataDir,
    seed,
    operatorTokens,
    openRead,
    ingestDir,
    assetOfflineMinutes,
    maxUtteranceSeconds,
    controlPlane,
    webhookUrl,
    webhookSigningSecret,
    deepgramApiKey: process.env.DEEPGRAM_API_KEY,
    geminiApiKey: process.env.GEMINI_API_KEY,
    murfApiKey: process.env.MURF_API_KEY,
    trustProxy,
    port,
  };

  // Print Startup Banner
  console.log('================================================================');
  console.log('AEGIS TWIN — PRODUCTION SECURITY COMMAND BOOTSTRAP');
  console.log(`  Data Directory : ${config.dataDir}`);
  console.log(`  Ingest Directory: ${config.ingestDir}`);
  console.log(`  Control Plane  : ${config.controlPlane}`);
  console.log(`  Seed Mode      : ${config.seed ? 'ENABLED (demo cases active)' : 'DISABLED (fresh queue)'}`);
  console.log(`  Deepgram Speech: ${maskKey(config.deepgramApiKey)}`);
  console.log(`  Gemini LLM Policy: ${maskKey(config.geminiApiKey)}`);
  console.log(`  Murf Audio Voice: ${maskKey(config.murfApiKey)}`);
  console.log(`  Operators      : ${config.operatorTokens.size} registered tokens`);
  console.log('================================================================');

  return Object.freeze(config);
}

export const config = loadConfig();
