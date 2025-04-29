/**
 * SSH connection configuration interface
 */
export interface SSHConfig {
  host: string;
  port: number;
  username: string;
  password?: string;
  privateKey?: string;
  passphrase?: string;
  commandWhitelist?: string[]; // Command whitelist (array of regex strings)
  commandBlacklist?: string[]; // Command blacklist (array of regex strings)
}

/**
 * Log levels
 */
export type LogLevel = "info" | "error" | "debug"; 