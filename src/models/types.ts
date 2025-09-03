/**
 * SSH connection configuration interface
 */
export interface SSHConfig {
  name?: string; // Connection name, optional, compatible with single connection
  host: string;
  port: number;
  username: string;
  password?: string;
  privateKey?: string;
  passphrase?: string;
  commandWhitelist?: string[]; // Command whitelist (array of regex strings)
  commandBlacklist?: string[]; // Command blacklist (array of regex strings)
  socksProxy?: string; // SOCKS proxy URL, e.g. 'socks://user:pass@host:port'
}

/**
 * Multiple SSH connection configuration Map
 */
export type SshConnectionConfigMap = Record<string, SSHConfig>;

/**
 * Log levels
 */
export type LogLevel = "info" | "error" | "debug";