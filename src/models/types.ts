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
}

/**
 * 日志级别
 */
export type LogLevel = "info" | "error" | "debug"; 