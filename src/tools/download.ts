import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { SSHConnectionManager } from "../services/ssh-connection-manager.js";
import { Logger } from "../utils/logger.js";

/**
 * 注册文件下载工具
 */
export function registerDownloadTool(server: McpServer): void {
  const sshManager = SSHConnectionManager.getInstance();

  server.tool(
    "download",
    "从已连接的服务器下载文件",
    {
      remotePath: z.string().describe("远程路径"),
      localPath: z.string().describe("本地路径"),
    },
    async ({ remotePath, localPath }) => {
      try {
        const result = await sshManager.download(remotePath, localPath);
        return {
          content: [{ type: "text", text: result }],
        };
      } catch (error: unknown) {
        const errorMessage = Logger.handleError(error, "下载文件失败");
        return {
          content: [{ type: "text", text: errorMessage }],
          isError: true,
        };
      }
    }
  );
} 