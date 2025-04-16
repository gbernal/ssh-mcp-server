#!/usr/bin/env node

// 从 @modelcontextprotocol/sdk/server/mcp.js 模块导入 McpServer 类
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
// 从 @modelcontextprotocol/sdk/server/stdio.js 模块导入 StdioServerTransport 类
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
// 从 zod 模块导入 z 对象，用于数据验证
import { z } from "zod";
// 导入 ssh2 模块
import { Client, ClientChannel } from "ssh2";
import { parseArgs } from "node:util";

/**
 * SSH连接配置接口
 */
interface SSHConfig {
  host: string;
  port: number;
  username: string;
  password: string;
}

/**
 * 日志级别
 */
type LogLevel = 'info' | 'error' | 'debug';

/**
 * SSH连接管理器类
 */
class SSHConnectionManager {
  private static instance: SSHConnectionManager;
  private client: Client | null = null;
  private config: SSHConfig | null = null;
  private connected = false;

  private constructor() {}

  /**
   * 获取单例实例
   */
  public static getInstance(): SSHConnectionManager {
    if (!SSHConnectionManager.instance) {
      SSHConnectionManager.instance = new SSHConnectionManager();
    }
    return SSHConnectionManager.instance;
  }

  /**
   * 设置SSH配置
   */
  public setConfig(config: SSHConfig): void {
    this.config = config;
  }

  /**
   * 获取SSH配置
   */
  public getConfig(): SSHConfig {
    if (!this.config) {
      throw new Error("SSH配置未设置");
    }
    return this.config;
  }

  /**
   * 连接到SSH服务器
   */
  public async connect(): Promise<void> {
    if (this.connected && this.client) {
      return;
    }

    const config = this.getConfig();
    this.client = new Client();

    await new Promise<void>((resolve, reject) => {
      if (!this.client) {
        return reject(new Error("SSH客户端未初始化"));
      }

      this.client.on("ready", () => {
        this.connected = true;
        Logger.log(`已成功连接到SSH服务器 ${config.host}:${config.port}`);
        resolve();
      });

      this.client.on("error", (err: Error) => {
        this.connected = false;
        reject(new Error(`SSH连接失败: ${err.message}`));
      });

      this.client.on("close", () => {
        this.connected = false;
        Logger.log("SSH连接已关闭", "info");
      });

      this.client.connect(config);
    });
  }

  /**
   * 执行SSH命令
   */
  public async executeCommand(cmdString: string): Promise<string> {
    if (!this.connected || !this.client) {
      await this.connect();
    }

    if (!this.client) {
      throw new Error("SSH客户端未初始化");
    }

    return new Promise<string>((resolve, reject) => {
      this.client!.exec(cmdString, (err: Error | undefined, stream: ClientChannel) => {
        if (err) {
          return reject(new Error(`执行命令错误: ${err.message}`));
        }
        
        let data = "";
        let errorData = "";
        
        stream.on("data", (chunk: Buffer) => (data += chunk.toString()));
        stream.stderr.on("data", (chunk: Buffer) => (errorData += chunk.toString()));
        
        stream.on("close", (code: number) => {
          if (code !== 0) {
            return reject(new Error(`命令执行失败，退出码: ${code}, 错误: ${errorData}`));
          }
          resolve(data);
        });
        
        stream.on("error", (err: Error) => {
          reject(new Error(`流错误: ${err.message}`));
        });
      });
    });
  }

  /**
   * 断开SSH连接
   */
  public disconnect(): void {
    if (this.client) {
      this.client.end();
      this.client = null;
      this.connected = false;
    }
  }
}

/**
 * 日志记录器类
 */
class Logger {
  /**
   * 记录日志
   */
  public static log(message: string, level: LogLevel = 'info'): void {
    const timestamp = new Date().toISOString();
    const formattedMessage = `[${timestamp}] [${level.toUpperCase()}] ${message}`;
    
    switch (level) {
      case 'error':
        console.error(formattedMessage);
        break;
      case 'debug':
        console.debug(formattedMessage);
        break;
      case 'info':
      default:
        console.info(formattedMessage);
        break;
    }
  }

  /**
   * 处理错误
   */
  public static handleError(error: unknown, prefix: string = "", exit: boolean = false): string {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const fullMessage = prefix ? `${prefix}: ${errorMessage}` : errorMessage;
    
    Logger.log(fullMessage, 'error');
    
    if (exit) {
      process.exit(1);
    }
    
    return fullMessage;
  }
}

/**
 * 命令行参数解析器类
 */
class CommandLineParser {
  /**
   * 解析命令行参数
   */
  public static parseArgs(): SSHConfig {
    try {
      const { values, positionals } = parseArgs({
        args: process.argv.slice(2),
        options: {
          host: { type: 'string', short: 'h' },
          port: { type: 'string', short: 'p' },
          username: { type: 'string', short: 'u' },
          password: { type: 'string', short: 'w' },
          help: { type: 'boolean', short: '?' },
        },
        allowPositionals: true,
      });

      if (values.help) {
        CommandLineParser.printHelp();
        process.exit(0);
      }

      // 支持两种方式传参：命名参数或位置参数
      const host = values.host || positionals[0];
      const portStr = values.port || positionals[1];
      const username = values.username || positionals[2];
      const password = values.password || positionals[3];

      if (!host || !portStr || !username || !password) {
        throw new Error("缺少必要参数");
      }

      const port = parseInt(portStr, 10);
      if (isNaN(port)) {
        throw new Error("端口必须是有效的数字");
      }

      return { host, port, username, password };
    } catch (error) {
      Logger.handleError(error, "参数解析错误");
      CommandLineParser.printHelp();
      process.exit(1);
    }
  }

  /**
   * 打印帮助信息
   */
  private static printHelp(): void {
    console.log(`
SSH MCP 服务器 - 使用方法:

选项:
  -h, --host      SSH 服务器主机地址
  -p, --port      SSH 服务器端口
  -u, --username  SSH 用户名
  -w, --password  SSH 密码
  -?, --help      显示帮助信息

示例:
  命名参数: 
    ssh-mcp-server --host 192.168.1.1 --port 22 --username root --password secret
  
  位置参数: 
    ssh-mcp-server 192.168.1.1 22 root secret
    `);
  }
}

/**
 * MCP服务器类
 */
class MCPServer {
  private server: McpServer;
  private sshManager: SSHConnectionManager;

  constructor() {
    this.server = new McpServer({
      name: "ssh-mcp-server",
      version: "1.0.2",
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
      process.on('SIGINT', this.handleExit.bind(this));
      process.on('SIGTERM', this.handleExit.bind(this));
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

// 主程序入口
async function main(): Promise<void> {
  try {
    const mcpServer = new MCPServer();
    await mcpServer.run();
  } catch (error: unknown) {
    Logger.handleError(error, "运行服务器失败", true);
  }
}

main().catch((error) => Logger.handleError(error, "未捕获的错误", true));
