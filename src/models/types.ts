/**
 * SSH连接配置接口
 */
export interface SSHConfig {
  host: string;
  port: number;
  username: string;
  password?: string;
  privateKey?: string;
  passphrase?: string;
  commandWhitelist?: string[]; // 命令白名单（正则表达式字符串数组）
  commandBlacklist?: string[]; // 命令黑名单（正则表达式字符串数组）
}

/**
 * 日志级别
 */
export type LogLevel = "info" | "error" | "debug"; 