import { parseArgs } from "node:util";
import { SSHConfig } from "../models/types.js";

/**
 * 命令行参数解析器类
 */
export class CommandLineParser {
  /**
   * 解析命令行参数
   */
  public static parseArgs(): SSHConfig {
    const { values, positionals } = parseArgs({
      args: process.argv.slice(2),
      options: {
        host: { type: "string", short: "h" },
        port: { type: "string", short: "p" },
        username: { type: "string", short: "u" },
        password: { type: "string", short: "w" },
        privateKey: { type: "string", short: "k" },
        passphrase: { type: "string", short: "P" },
        whitelist: { type: "string", short: "W" },
        blacklist: { type: "string", short: "B" },
      },
      allowPositionals: true,
    });

    // 支持两种方式传参：命名参数或位置参数
    const host = values.host || positionals[0];
    const portStr = values.port || positionals[1];
    const username = values.username || positionals[2];
    const password = values.password || positionals[3];
    const privateKey = values.privateKey;
    const passphrase = values.passphrase;
    const whitelist = values.whitelist;
    const blacklist = values.blacklist;

    if (!host || !portStr || !username || (!password && !privateKey)) {
      throw new Error("缺少必要参数，需要提供主机、端口、用户名和密码或私钥");
    }

    const port = parseInt(portStr, 10);
    if (isNaN(port)) {
      throw new Error("端口必须是有效的数字");
    }

    // 初始化白名单和黑名单
    let commandWhitelist: string[] | undefined;
    let commandBlacklist: string[] | undefined;

    // 处理白名单
    if (whitelist) {
      commandWhitelist = whitelist
        .split(",")
        .map((pattern) => pattern.trim())
        .filter(Boolean);
    }

    // 处理黑名单
    if (blacklist) {
      commandBlacklist = blacklist
        .split(",")
        .map((pattern) => pattern.trim())
        .filter(Boolean);
    }

    return {
      host,
      port,
      username,
      password,
      privateKey,
      passphrase,
      commandWhitelist,
      commandBlacklist,
    };
  }
}
