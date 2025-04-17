import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { SSHConnectionManager } from "../services/ssh-connection-manager.js";
import { CommandLineParser } from "../cli/command-line-parser.js";
import { Logger } from "../utils/logger.js";

/**
 * MCP服务器类
 */
export class SshMcpServer {
  private server: McpServer;
  private sshManager: SSHConnectionManager;

  constructor() {
    this.server = new McpServer({
      name: "ssh-mcp-server",
      version: "1.0.5",
    });

    this.sshManager = SSHConnectionManager.getInstance();
  }

  /**
   * 注册工具
   */
  private registerTools(): void {
    this.server.tool(
      "execute-command",
      "对已连接的服务器执行命令，并获取输出结果",
      {
        cmdString: z.string().describe("需要执行的命令"),
      },
      async ({ cmdString }) => {
        try {
          const result = await this.sshManager.executeCommand(cmdString);
          return {
            content: [{ type: "text", text: result }],
          };
        } catch (error: unknown) {
          const errorMessage = Logger.handleError(error, "执行命令失败");
          return {
            content: [{ type: "text", text: errorMessage }],
            isError: true,
          };
        }
      }
    );

    this.server.tool(
      "upload",
      "上传文件到已连接的服务器",
      {
        localPath: z.string().describe("本地路径"),
        remotePath: z.string().describe("远程路径"),
      },
      async ({ localPath, remotePath }) => {
        try {
          const result = await this.sshManager.upload(localPath, remotePath);
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

  /**
   * 运行服务器
   */
  public async run(): Promise<void> {
    try {
      // 初始化SSH配置
      const sshConfig = CommandLineParser.parseArgs();
      this.sshManager.setConfig(sshConfig);

      // 预连接SSH服务器
      await this.sshManager.connect();

      // 注册工具
      this.registerTools();

      // 创建传输实例并连接
      const transport = new StdioServerTransport();
      await this.server.connect(transport);

      Logger.log("MCP服务器连接已建立");
      Logger.log("SSH MCP Server正在stdio传输模式下运行...");

      // 处理进程退出
      process.on("SIGINT", this.handleExit.bind(this));
      process.on("SIGTERM", this.handleExit.bind(this));
    } catch (error: unknown) {
      Logger.handleError(error, "初始化失败", true);
    }
  }

  /**
   * 处理退出
   */
  private handleExit(): void {
    Logger.log("正在关闭服务器...");
    this.sshManager.disconnect();
    process.exit(0);
  }
} 