#!/usr/bin/env node

/**
 * LFF-VIBE MCP Gateway Enhanced (JavaScript version)
 * 
 * Specialized gateway with FastMCP compatibility improvements
 * Handles FastMCP's specific session management and protocol requirements
 * 
 * Copyright 2024 LFF-VIBE Team
 * Licensed under the Apache License, Version 2.0
 */

import EventSource from "eventsource";

// Configuration - Default to LFF-VIBE service
const MCP_SERVER_URL = process.env.MCP_SERVER_URL || process.env.LFF_VIBE_SERVER_URL || "https://mcpice.com";
const AUTHORIZATION = process.env.AUTHORIZATION || process.env.LFF_VIBE_API_KEY || "";

const baseUrl = MCP_SERVER_URL.endsWith('/') ? MCP_SERVER_URL.slice(0, -1) : MCP_SERVER_URL;

// FastMCP specific endpoints (corrected paths)
const backendUrlSse = `${baseUrl}/mcp/sse`;  // 透過 Nginx 路由到 /sse
const backendUrlMsg = `${baseUrl}/messages/`; // FastMCP 的正確消息端點

// Debug and response channels
const debug = console.error;
const respond = console.log;

class LFFVibeGatewayEnhanced {
    constructor() {
        this.sessionId = null;
        this.eventSource = null;
        this.isReady = false;
        this.messageQueue = [];
        this.reconnectTimeout = null;
        this.reconnectAttempts = 0;
        this.MAX_RECONNECT_ATTEMPTS = 5;
        this.RECONNECT_DELAY = 2000;
        this.lastParsedMessage = null;
        this.sessionInitialized = false;
    }

    async connect() {
        if (this.eventSource) {
            debug("Closing existing EventSource connection");
            this.eventSource.close();
        }

        debug(`Starting LFF-VIBE MCP Gateway...`);
        debug(`Connecting to: ${baseUrl}/mcp/`);
        debug(`Authorization: ${AUTHORIZATION ? 'Configured' : 'None'}`);
        debug(`Connecting to LFF-VIBE SSE endpoint: ${backendUrlSse}`);

        return new Promise((resolve, reject) => {
            const headers = {
                'Accept': 'text/event-stream',
                'Cache-Control': 'no-cache'
            };

            // Add authorization header if available
            if (AUTHORIZATION) {
                headers['Authorization'] = AUTHORIZATION.startsWith('Bearer ') ? AUTHORIZATION : `Bearer ${AUTHORIZATION}`;
                debug("Using authorization header");
            }

            this.eventSource = new EventSource(backendUrlSse, { headers });
            
            this.eventSource.onopen = () => {
                debug(`--- LFF-VIBE backend connected successfully`);
                this.reconnectAttempts = 0;
                resolve(true);
            };
            
            this.eventSource.onerror = (error) => {
                const errorMsg = error?.message || 'Unknown error';
                debug(`--- LFF-VIBE backend error: ${errorMsg}`);
                this.handleConnectionError(error);
                reject(error);
            };

            // Handle session establishment from FastMCP
            this.eventSource.addEventListener("endpoint", (event) => {
                debug(`Received endpoint event: ${event.data}`);
                // FastMCP 格式：/messages/?session_id=xxxxx
                const match = event.data.match(/session_id=([^&\s]+)/);
                if (match) {
                    const newSessionId = match[1];
                    this.sessionId = newSessionId;
                    debug(`LFF-VIBE session ID extracted: ${this.sessionId}`);
                    this.initializeSession();
                } else {
                    debug(`Failed to extract session ID from: ${event.data}`);
                }
            });
            
            // Handle ping events to maintain connection
            this.eventSource.addEventListener("ping", (event) => {
                debug(`Ping received: ${event.data}`);
            });

            // Handle reconnection requests from server
            this.eventSource.addEventListener("reconnect", (event) => {
                debug("Server requested reconnection");
                this.reconnect();
            });

            // Handle actual MCP messages
            this.eventSource.addEventListener("message", (e) => {
                try {
                    // Parse and validate the message
                    const parsed = JSON.parse(e.data);
                    this.lastParsedMessage = parsed;
                    
                    // Log successful message processing
                    debug(`Received MCP message: ${parsed.method || 'response'}`);
                    
                    // Forward to BigGo Client
                    respond(JSON.stringify(parsed));
                } catch (error) {
                    debug(`Failed to parse incoming message: ${error}`);
                    debug(`Raw message data: ${e.data}`);
                }
            });

            // Generic event handler for debugging
            this.eventSource.addEventListener("error", (event) => {
                debug(`SSE error event: ${JSON.stringify(event)}`);
            });
        });
    }

    async initializeSession() {
        if (!this.sessionId) {
            debug("Cannot initialize session: no session ID");
            return;
        }

        debug("LFF-VIBE MCP Gateway is running and ready");
        
        // Start with a simple tools/list request to validate the session
        try {
            const initMessage = {
                jsonrpc: "2.0",
                id: "init-1",
                method: "tools/list",
                params: {}
            };

            await this.sendMessageToBackend(JSON.stringify(initMessage));
            
            // Mark as ready after successful initialization
            this.isReady = true;
            this.sessionInitialized = true;
            this.processQueuedMessages();
            
        } catch (error) {
            debug(`Session initialization failed: ${error}`);
            // Still mark as ready to process messages, let individual calls fail
            this.isReady = true;
            this.processQueuedMessages();
        }
    }

    async sendMessageToBackend(message) {
        if (!this.sessionId) {
            throw new Error("No session ID available");
        }

        const url = `${backendUrlMsg}?session_id=${this.sessionId}`;
        
        const headers = {
            'Content-Type': 'application/json',
            'Accept': 'application/json, text/event-stream'
        };

        // Add authorization header if available
        if (AUTHORIZATION) {
            headers['Authorization'] = AUTHORIZATION.startsWith('Bearer ') ? AUTHORIZATION : `Bearer ${AUTHORIZATION}`;
        }

        const response = await fetch(url, {
            method: 'POST',
            headers,
            body: message
        });

        if (!response.ok) {
            const errorText = await response.text();
            debug(`Error from LFF-VIBE: ${response.status} ${response.statusText}`);
            debug(`Error details: ${errorText}`);
            
            if (response.status === 404) {
                debug("Messages endpoint not found - checking FastMCP configuration");
            } else if (response.status === 503) {
                debug("LFF-VIBE service unavailable - attempting reconnect");
                this.reconnect();
            } else if (response.status === 401) {
                debug("LFF-VIBE authorization failed - check API key");
            }
            
            throw new Error(`Backend error: ${response.status} ${errorText}`);
        } else {
            const responseText = await response.text();
            debug(`LFF-VIBE response sent successfully`);
        }
    }

    handleConnectionError(error) {
        debug(`Connection error details: ${JSON.stringify(error)}`);
        this.isReady = false;
        this.sessionInitialized = false;
        
        if (this.reconnectAttempts < this.MAX_RECONNECT_ATTEMPTS) {
            this.reconnectAttempts++;
            debug(`Scheduling reconnect attempt ${this.reconnectAttempts}/${this.MAX_RECONNECT_ATTEMPTS} in ${this.RECONNECT_DELAY}ms`);
            
            this.reconnectTimeout = setTimeout(() => {
                this.reconnect();
            }, this.RECONNECT_DELAY);
        } else {
            debug(`Max reconnect attempts (${this.MAX_RECONNECT_ATTEMPTS}) reached. Giving up.`);
        }
    }

    async reconnect() {
        debug("Attempting to reconnect to LFF-VIBE...");
        this.isReady = false;
        this.sessionInitialized = false;
        this.sessionId = null;
        
        try {
            await this.connect();
        } catch (error) {
            debug(`Reconnection failed: ${error}`);
        }
    }

    async processMessage(input) {
        if (!this.isReady || !this.sessionId) {
            debug("LFF-VIBE session not ready, queuing message");
            this.messageQueue.push(input);
            return;
        }

        const message = input.toString();
        try {
            const parsed = JSON.parse(message);
            // Log outgoing resume analysis requests
            if (parsed.method === "tools/call" && parsed.params?.name?.includes("resume")) {
                debug(`Processing resume analysis request: ${parsed.params.name}`);
            }
        } catch (error) {
            debug(`Failed to parse outgoing message: ${error}`);
        }

        // Handle multiple messages in one input
        const messages = message
            .split('\n')
            .filter(msg => msg.trim())
            .map(msg => msg.trim());

        for (const msgStr of messages) {
            try {
                await this.sendMessageToBackend(msgStr);
            } catch (error) {
                debug(`Request to LFF-VIBE failed: ${error}`);
                
                // Try to recover from certain errors
                if (error.message.includes('404')) {
                    debug("Message endpoint not found, attempting to reconnect");
                    this.reconnect();
                }
            }
        }
    }

    async processQueuedMessages() {
        debug(`Processing ${this.messageQueue.length} queued messages for LFF-VIBE`);
        while (this.messageQueue.length > 0) {
            const message = this.messageQueue.shift();
            if (message) {
                await this.processMessage(message);
            }
        }
    }

    cleanup() {
        debug("Starting LFF-VIBE Gateway cleanup...");
        if (this.reconnectTimeout) {
            clearTimeout(this.reconnectTimeout);
        }
        if (this.eventSource) {
            this.eventSource.close();
        }
        debug("LFF-VIBE Gateway cleanup completed");
    }
}

// Main execution
async function main() {
    const gateway = new LFFVibeGatewayEnhanced();
    
    // Handle process termination
    process.on('SIGTERM', () => {
        debug('Received SIGTERM, cleaning up...');
        gateway.cleanup();
        process.exit(0);
    });
    
    process.on('SIGINT', () => {
        debug('Received SIGINT, cleaning up...');
        gateway.cleanup();
        process.exit(0);
    });

    try {
        await gateway.connect();
        
        debug("LFF-VIBE MCP Gateway started successfully");
        debug("Listening for BigGo MCP Client stdin...");
        
        // Process stdin from BigGo Client
        process.stdin.setEncoding('utf8');
        process.stdin.on('data', async (chunk) => {
            const buffer = Buffer.from(chunk, 'utf8');
            await gateway.processMessage(buffer);
        });
        
        // Keep the process running
        await new Promise(() => {});
        
    } catch (error) {
        debug(`Failed to start LFF-VIBE Gateway: ${error}`);
        process.exit(1);
    }
}

// Start the gateway
if (import.meta.url === `file://${process.argv[1]}`) {
    main().catch((error) => {
        debug(`Gateway crashed: ${error}`);
        process.exit(1);
    });
}

export { LFFVibeGatewayEnhanced };
