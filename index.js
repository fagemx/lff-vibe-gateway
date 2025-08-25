#!/usr/bin/env node

/**
 * LFF-VIBE MCP Gateway - Main Entry Point
 * 
 * A specialized gateway for connecting BigGo MCP Client to LFF-VIBE Resume Analysis Service.
 * Based on @mcphub/gateway with LFF-VIBE customizations.
 * 
 * Copyright 2024 LFF-VIBE Team
 * Licensed under the Apache License, Version 2.0
 */

import EventSource from 'eventsource';

// Configuration - Default to LFF-VIBE service
const MCP_SERVER_URL = process.env.MCP_SERVER_URL || process.env.LFF_VIBE_SERVER_URL || "https://mcpice.com";
const AUTHORIZATION = process.env.AUTHORIZATION || process.env.LFF_VIBE_API_KEY || "";

const baseUrl = MCP_SERVER_URL.endsWith('/') ? MCP_SERVER_URL.slice(0, -1) : MCP_SERVER_URL;
// FastAPI-MCP SSE transport endpoints (Enhanced paths)
const backendUrlSse = `${baseUrl}/mcp/sse`;  // 透過 Nginx 路由到 /sse
const backendUrlMsg = `${baseUrl}/messages/`; // FastMCP 的正確消息端點

// Debug and response channels
const debug = console.error;
const respond = console.log;

class LFFVibeGateway {
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

        debug(`Starting LFF-VIBE MCP Gateway Enhanced...`);
        debug(`Connecting to: ${baseUrl}/mcp/`);
        debug(`Authorization: ${AUTHORIZATION ? 'Configured' : 'None'}`);
        debug(`Connecting to LFF-VIBE SSE endpoint: ${backendUrlSse}`);

        return new Promise((resolve, reject) => {
            const headers = {
                'Accept': 'text/event-stream'
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
                    
                    // Log specific LFF-VIBE message types for debugging
                    if (parsed.method === "tools/list") {
                        debug("Received tools list from LFF-VIBE");
                    } else if (parsed.method === "tools/call" && parsed.params?.name?.includes("resume")) {
                        debug("Received resume analysis tool call");
                    }
                    
                    // Send to Claude Desktop via stdout
                    respond(e.data);
                } catch (error) {
                    debug(`Error parsing LFF-VIBE message: ${error}`);
                    debug(`Raw message data: ${e.data}`);
                    // Still forward even if parsing fails
                    respond(e.data);
                }
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
        debug(`LFF-VIBE connection error: ${JSON.stringify(error, null, 2)}`);
        if (this.eventSource?.readyState === EventSource.CLOSED) {
            debug("LFF-VIBE EventSource connection closed");
            this.reconnect();
        }
    }

    async reconnect() {
        if (this.reconnectAttempts >= this.MAX_RECONNECT_ATTEMPTS) {
            debug(`Max reconnection attempts (${this.MAX_RECONNECT_ATTEMPTS}) reached for LFF-VIBE, exiting...`);
            debug(`Last parsed message: ${JSON.stringify(this.lastParsedMessage, null, 2)}`);
            process.exit(1);
            return;
        }

        this.reconnectAttempts++;
        this.isReady = false;
        this.sessionInitialized = false;
        this.sessionId = null;
        debug(`Attempting to reconnect to LFF-VIBE (${this.reconnectAttempts}/${this.MAX_RECONNECT_ATTEMPTS})...`);

        try {
            await new Promise(resolve => setTimeout(resolve, this.RECONNECT_DELAY));
            await this.connect();
        } catch (error) {
            debug(`LFF-VIBE reconnection failed: ${error}`);
            debug(`Last parsed message before failure: ${JSON.stringify(this.lastParsedMessage, null, 2)}`);
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

/**
 * Main serve function that starts the Enhanced LFF-VIBE MCP Gateway
 */
export async function serve() {
    debug(`Starting LFF-VIBE MCP Gateway Enhanced...`);
    debug(`Connecting to: ${baseUrl}`);
    debug(`Authorization: ${AUTHORIZATION ? 'Configured' : 'Not configured'}`);
    
    const gateway = new LFFVibeGateway();

    try {
        await gateway.connect();
        
        // Handle stdin from BigGo Client
        process.stdin.on("data", (data) => gateway.processMessage(data));
        
        // Graceful shutdown handlers
        process.on('SIGINT', () => {
            debug("Shutting down LFF-VIBE Gateway Enhanced (SIGINT)...");
            gateway.cleanup();
            process.exit(0);
        });
        
        process.on('SIGTERM', () => {
            debug("Shutting down LFF-VIBE Gateway Enhanced (SIGTERM)...");
            gateway.cleanup();
            process.exit(0);
        });
        
        debug("LFF-VIBE MCP Gateway Enhanced is running and ready");
    } catch (error) {
        debug(`Fatal error in LFF-VIBE Gateway Enhanced: ${error.message}`);
        debug(`Error stack: ${error.stack}`);
        process.exit(1);
    }
}

/**
 * Alternative export names for compatibility
 */
export const run = serve;
export default serve;

// If called directly (not imported), start the gateway
if (import.meta.url === `file://${process.argv[1]}`) {
    serve().catch((error) => {
        debug(`Unhandled error: ${error}`);
        process.exit(1);
    });
}