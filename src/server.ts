import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerCheckProxy } from './tools/checkProxy.js';
import { registerFindProxy } from './tools/findProxy.js';
import { registerListCountries } from './tools/listCountries.js';
import { registerListProxies } from './tools/listProxies.js';

export function createServer(): McpServer {
  const server = new McpServer({
    name: 'proxy-finder-mcp',
    version: '0.1.2',
  });

  registerFindProxy(server);
  registerCheckProxy(server);
  registerListProxies(server);
  registerListCountries(server);

  return server;
}
