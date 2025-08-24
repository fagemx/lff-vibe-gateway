#!/usr/bin/env node

/**
 * NPX Entry Point for LFF-VIBE MCP Gateway
 * 
 * This file allows users to run: npx @lff-vibe/mcp-gateway
 * 
 * Copyright 2024 LFF-VIBE Team
 * Licensed under the Apache License, Version 2.0
 */

// Import and start the main gateway
import('./lff-vibe-gateway.js').then(module => {
    // The main module will handle everything
}).catch(error => {
    console.error('Failed to start LFF-VIBE Gateway:', error);
    process.exit(1);
});