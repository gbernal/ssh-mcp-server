import { parseArgs } from "node:util";
import { SSHConfig } from "../models/types.js";
import { Logger } from "../utils/logger.js";

/**
 * 命令行参数解析器类
 */
export class CommandLineParser {
  /**
   * 解析命令行参数
   */
  public static parseArgs(): SSHConfig {
    try {
      const { values, positionals } = parseArgs({
        args: process.argv.slice(2),
        options: {
          host: { type: "string", short: "h" },
          port: { type: "string", short: "p" },
          username: { type: "string", short: "u" },
          password: { type: "string", short: "w" },
          privateKey: { type: "string", short: "k" },
          passphrase: { type: "string", short: "P" },
          help: { type: "boolean", short: "?" },
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
      const privateKey = values.privateKey;
      const passphrase = values.passphrase;

      if (!host || !portStr || !username || (!password && !privateKey)) {
        throw new Error("缺少必要参数，需要提供主机、端口、用户名和密码或私钥");
      }

      const port = parseInt(portStr, 10);
      if (isNaN(port)) {
        throw new Error("端口必须是有效的数字");
      }

      return { host, port, username, password, privateKey, passphrase };
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
  -k, --privateKey SSH 私钥文件路径
  -P, --passphrase 私钥密码（如果有的话）
  -?, --help      显示帮助信息

示例:
  使用密码: 
    ssh-mcp-server --host 192.168.1.1 --port 22 --username root --password secret
  
  使用私钥: 
    ssh-mcp-server --host 192.168.1.1 --port 22 --username root --privateKey ~/.ssh/id_rsa

  位置参数（仅密码模式）: 
    ssh-mcp-server 192.168.1.1 22 root secret
    `);
  }
} 