#!/usr/bin/env node
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createAmwayMcpServer } from './server';

async function main() {
  const mcpServer = createAmwayMcpServer();
  const transport = new StdioServerTransport();

  // Log diagnostic info to stderr ONLY so stdout remains clean JSON-RPC
  process.stderr.write('[N-Square MCP] Initializing Amway Nutrilite MCP Server over stdio...\n');
  process.stderr.write('[N-Square MCP] Loaded 44 verified products with ICMR-NIN medical standards.\n');

  await mcpServer.connect(transport);
  process.stderr.write('[N-Square MCP] Server successfully connected and listening on stdin/stdout.\n');
}

main().catch((err) => {
  process.stderr.write(`[N-Square MCP Error] Fatal error: ${err.message}\n`);
  process.exit(1);
});
