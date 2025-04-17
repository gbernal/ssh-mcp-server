import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { SSHConnectionManager } from "../services/ssh-connection-manager.js";
import { Logger } from "../utils/logger.js";

/**
 * 注册文件上传工具
 */
export function registerUploadTool(server: McpServer): void {
  const sshManager = SSHConnectionManager.getInstance();

  server.tool(
    "upload",
    "上传文件到已连接的服务器",
    {
      localPath: z.string().describe("本地路径"),
      remotePath: z.string().describe("远程路径"),
    },
    async ({ localPath, remotePath }) => {
      try {
        const result = await sshManager.upload(localPath, remotePath);
        return {
          content: [{ type: "text", text: result }],
        };
      } catch (error: unknown) {
        const errorMessage = Logger.handleError(error, "上传文件失败");
        return {
          content: [{ type: "text", text: errorMessage }],
          isError: true,
        };
      }
    }
  );
}
