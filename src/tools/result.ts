import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';

export function jsonResult(data: unknown): CallToolResult {
  return {
    content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
  };
}

export function textErrorResult(err: unknown): CallToolResult {
  return {
    isError: true,
    content: [{ type: 'text', text: err instanceof Error ? err.message : String(err) }],
  };
}
