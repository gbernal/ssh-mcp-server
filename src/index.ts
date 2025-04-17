#!/usr/bin/env node

import { SshMcpServer } from "./core/mcp-server.js";
import { Logger } from "./utils/logger.js";

/**
 * 主程序入口
 */
async function main(): Promise<void> {
  try {
    const sshMcpServer = new SshMcpServer();
    await sshMcpServer.run();
  } catch (error: unknown) {
    Logger.handleError(error, "运行服务器失败", true);
  }
}

main().catch((error) => Logger.handleError(error, "未捕获的错误", true));
