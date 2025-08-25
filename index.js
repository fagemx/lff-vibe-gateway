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

// Clean base URL and determine correct endpoints
let cleanBaseUrl = MCP_SERVER_URL.endsWith('/') ? MCP_SERVER_URL.slice(0, -1) : MCP_SERVER_URL;

// Check if baseUrl already contains /mcp path
let sseEndpoint, msgEndpoint;
if (cleanBaseUrl.endsWith('/mcp')) {
    // Already has /mcp, so just add the specific paths
    sseEndpoint = `${cleanBaseUrl}/sse`;     // /mcp/sse -> Nginx rewrites to /sse
    msgEndpoint = `${cleanBaseUrl.replace('/mcp', '')}/message`; // Remove /mcp for message endpoint
} else {
    // No /mcp, add the full paths
    sseEndpoint = `${cleanBaseUrl}/mcp/sse`;  // /mcp/sse -> Nginx rewrites to /sse  
    msgEndpoint = `${cleanBaseUrl}/message`; // Direct to message endpoint
}

const baseUrl = cleanBaseUrl;
const backendUrlSse = sseEndpoint;
const backendUrlMsg = msgEndpoint;

// Fix Windows encoding issues
if (process.platform === 'win32') {
    // Set proper encoding for Windows
    process.stdout.setDefaultEncoding && process.stdout.setDefaultEncoding('utf8');
    process.stderr.setDefaultEncoding && process.stderr.setDefaultEncoding('utf8');
}

// Debug and response channels with encoding safety
const debug = (...args) => {
    try {
        console.error(...args);
    } catch (encodingError) {
        // Fallback to ASCII-safe output
        const safeArgs = args.map(arg => 
            typeof arg === 'string' ? arg.replace(/[^\x00-\x7F]/g, '?') : arg
        );
        console.error(...safeArgs);
    }
};

const respond = (...args) => {
    try {
        console.log(...args);
    } catch (encodingError) {
        // Fallback to ASCII-safe output
        const safeArgs = args.map(arg => 
            typeof arg === 'string' ? arg.replace(/[^\x00-\x7F]/g, '?') : arg
        );
        console.log(...safeArgs);
    }
};

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
        debug(`Connecting to: ${baseUrl}`);
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
                // FastMCP format: /messages/?session_id=xxxxx
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
        
        // Mark as ready
        this.isReady = true;
        this.sessionInitialized = true;
        
        // Process any queued messages
        this.processQueuedMessages();
    }

    async sendMessageToBackend(message) {
        debug(`Attempting to send message via SSE connection`);
        
        // For FastMCP SSE mode, we might not need to POST messages
        // Instead, messages should flow through the established SSE connection
        // Let's try multiple endpoints to find the working one
        
        if (!this.sessionId) {
            throw new Error("No session ID available");
        }

        // Try different possible endpoints (using sessionId format like original MCPHub)
        const endpoints = [
            `${backendUrlSse}?sessionId=${this.sessionId}`,  // Try SSE endpoint with session
            `${backendUrlMsg}?sessionId=${this.sessionId}`,    // Try messages endpoint  
            `${baseUrl}/api/mcp?sessionId=${this.sessionId}` // Try alternative endpoint
        ];

        let lastError = null;
        
        for (const url of endpoints) {
            try {
                debug(`Trying endpoint: ${url}`);
                
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

                if (response.ok) {
                    const responseText = await response.text();
                    debug(`Message sent successfully to: ${url}`);
                    return; // Success!
                } else {
                    const errorText = await response.text();
                    debug(`Failed ${url}: ${response.status} ${errorText}`);
                    lastError = new Error(`${response.status}: ${errorText}`);
                }
            } catch (error) {
                debug(`Network error for ${url}: ${error.message}`);
                lastError = error;
            }
        }
        
        // If all endpoints failed, throw the last error
        debug(`All endpoints failed, message may need to flow differently in SSE mode`);
        throw lastError || new Error("All message endpoints failed");
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
        const message = input.toString().trim();
        
        // Handle multiple JSON messages in one input by splitting on newlines
        const messages = message
            .split('\n')
            .filter(msg => msg.trim())
            .map(msg => msg.trim());

        for (const msgStr of messages) {
            await this.processSingleMessage(msgStr);
        }
    }

    async processSingleMessage(message) {
        try {
            const parsed = JSON.parse(message);
            debug(`Received message from BigGo: ${parsed.method || 'response'}`);
            
            // Log outgoing resume analysis requests
            if (parsed.method === "tools/call" && parsed.params?.name?.includes("resume")) {
                debug(`Processing resume analysis request: ${parsed.params.name}`);
            }
            
            if (parsed.method === "initialize") {
                // Send initialize response with actual tools
                const initResponse = {
                    jsonrpc: "2.0",
                    id: parsed.id,
                    result: {
                        protocolVersion: "2024-11-05",
                        capabilities: {
                            tools: {}
                        },
                        serverInfo: {
                            name: "LFF-VIBE Resume Analyzer",
                            version: "1.0.0"
                        }
                    }
                };
                respond(JSON.stringify(initResponse));
                debug("Sent initialize response to BigGo");
                return;
            }
            
            if (parsed.method === "notifications/initialized") {
                // BigGo sent initialization complete notification
                debug("BigGo initialization completed - ready for tools/list requests");
                return;
            }
            
            if (parsed.method === "tools/list") {
                // Handle tools/list request - always use fallback for now
                debug("Received tools/list request from BigGo");
                this.sendFallbackToolsList(parsed.id);
                return;
            }
            
            if (parsed.method === "tools/call") {
                // Handle tool calls - forward to backend
                debug(`Received tools/call request: ${parsed.params?.name}`);
                if (this.isReady && this.sessionId) {
                    try {
                        await this.sendMessageToBackend(message);
                    } catch (error) {
                        debug(`Failed to call tool: ${error.message}`);
                        // Send error response
                        const errorResponse = {
                            jsonrpc: "2.0",
                            id: parsed.id,
                            error: {
                                code: -32603,
                                message: "Tool call failed",
                                data: error.message
                            }
                        };
                        respond(JSON.stringify(errorResponse));
                    }
                } else {
                    // Send error if session not ready
                    const errorResponse = {
                        jsonrpc: "2.0",
                        id: parsed.id,
                        error: {
                            code: -32002,
                            message: "Server not ready",
                            data: "MCP session not established"
                        }
                    };
                    respond(JSON.stringify(errorResponse));
                }
                return;
            }
            
            // For other messages, just log them
            debug(`Unhandled message type: ${parsed.method}`);
            
        } catch (error) {
            debug(`Failed to parse single message: ${error}`);
            debug(`Problematic message: ${message.substring(0, 200)}...`);
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

    async requestToolsFromBackend() {
        if (!this.isReady || !this.sessionId) {
            debug("Cannot request tools: session not ready");
            return;
        }

        debug("Requesting tools list from LFF-VIBE backend");
        const toolsRequest = {
            jsonrpc: "2.0",
            id: "tools-request-1",
            method: "tools/list",
            params: {}
        };

        try {
            await this.sendMessageToBackend(JSON.stringify(toolsRequest));
        } catch (error) {
            debug(`Failed to request tools from backend: ${error.message}`);
        }
    }

    sendFallbackToolsList(requestId) {
        if (!requestId) {
            debug("Skipping tools list - no request ID provided");
            return;
        }
        
        debug(`Sending fallback tools list to BigGo (ID: ${requestId})`);
        
        const toolsResponse = {
            jsonrpc: "2.0",
            id: requestId,
            result: {
                tools: [
                    {
                        name: "check_services",
                        description: "Check if backend services are running",
                        inputSchema: {
                            type: "object",
                            properties: {},
                            required: []
                        }
                    },
                    {
                        name: "analyze_resume_from_path",
                        description: "Analyze PDF resume file. Use when user provides PDF path. Parameters: pdf_path (complete PDF file path) and job_requirements (target job requirements description)",
                        inputSchema: {
                            type: "object",
                            properties: {
                                pdf_path: {
                                    type: "string",
                                    description: "Complete path to PDF file, e.g.: C:/Users/username/resume.pdf"
                                },
                                job_requirements: {
                                    type: "string",
                                    description: "Specific job requirements, e.g.: 'Senior Python Engineer, 3 years experience, Django/FastAPI, AI/ML background, fluent English'"
                                }
                            },
                            required: ["pdf_path", "job_requirements"]
                        }
                    },
                    {
                        name: "analyze_resume_text",
                        description: "Analyze resume text content. Use when user provides resume text (not PDF file). Parameters: resume_text (resume content) and job_requirements (job requirements)",
                        inputSchema: {
                            type: "object",
                            properties: {
                                resume_text: {
                                    type: "string",
                                    description: "Resume text content"
                                },
                                job_requirements: {
                                    type: "string",
                                    description: "Job requirements description"
                                }
                            },
                            required: ["resume_text", "job_requirements"]
                        }
                    }
                ]
            }
        };
        
        respond(JSON.stringify(toolsResponse));
        debug(`Sent ${toolsResponse.result.tools.length} tools to BigGo with ID ${requestId}`);
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