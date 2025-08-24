#!/usr/bin/env node
// bin/cli.js
import * as mod from '../index.js'; // 主程式入口

const cmd = process.argv[2] ?? 'serve';
const run = mod.serve || mod.run || mod.default;

if (!run) {
  console.error('❌ No exported function found. Expected export: serve() / run() / default');
  process.exit(1);
}

async function main() {
  switch (cmd) {
    case 'serve':
      console.log('🚀 Starting LFF-VIBE MCP Gateway...');
      await run();
      break;
    case 'version':
      console.log(process.env.npm_package_version || 'unknown');
      break;
    default:
      console.log(`Usage:
  lff-vibe-gateway serve          Start MCP gateway (default)
  lff-vibe-gateway version        Show version`);
  }
}

main().catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});