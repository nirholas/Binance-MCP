/**
 * @author nich
 * @website x.com/nichxbt
 * @github github.com/nirholas
 * @license Apache-2.0
 */
// src/modules/options/userdata-api/index.ts
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import { registerOptionsCreateListenKey } from "./createListenKey.js";
import { registerOptionsDeleteListenKey } from "./deleteListenKey.js";
import { registerOptionsRenewListenKey } from "./renewListenKey.js";

export function registerOptionsUserdataApi(server: McpServer) {
  registerOptionsCreateListenKey(server);
  registerOptionsRenewListenKey(server);
  registerOptionsDeleteListenKey(server);
}
