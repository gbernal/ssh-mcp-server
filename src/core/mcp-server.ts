import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { SSHConnectionManager } from "../services/ssh-connection-manager.js";
import { CommandLineParser } from "../cli/command-line-parser.js";
import { Logger } from "../utils/logger.js";
import { registerAllTools } from "../tools/index.js";

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
    registerAllTools(this.server);
  }

  /**
   * 运行服务器
   */
  public async run(): Promise<void> {
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
  }
}
