import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerExecuteCommandTool } from "./execute-command.js";
import { registerUploadTool } from "./upload.js";

/**
 * 注册所有工具
 * @param server MCP服务器实例
 */
export function registerAllTools(server: McpServer): void {
  registerExecuteCommandTool(server);
  registerUploadTool(server);
} 