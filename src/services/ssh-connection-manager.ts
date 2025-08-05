import { Client, ClientChannel } from "ssh2";
import { SSHConfig, SshConnectionConfigMap } from "../models/types.js";
import { Logger } from "../utils/logger.js";
import fs from "fs";
import path from "path";
import { SFTPWrapper } from "ssh2";

/**
 * SSH Connection Manager class
 */
export class SSHConnectionManager {
  private static instance: SSHConnectionManager;
  private clients: Map<string, Client> = new Map();
  private configs: SshConnectionConfigMap = {};
  private connected: Map<string, boolean> = new Map();
  private defaultName: string = "default";

  private constructor() {}

  /**
   * Get singleton instance
   */
  public static getInstance(): SSHConnectionManager {
    if (!SSHConnectionManager.instance) {
      SSHConnectionManager.instance = new SSHConnectionManager();
    }
    return SSHConnectionManager.instance;
  }

  /**
   * 批量设置SSH配置
   */
  public setConfig(configs: SshConnectionConfigMap, defaultName?: string): void {
    this.configs = configs;
    if (defaultName && configs[defaultName]) {
      this.defaultName = defaultName;
    } else if (Object.keys(configs).length > 0) {
      this.defaultName = Object.keys(configs)[0];
    }
  }

  /**
   * 获取指定连接配置
   */
  public getConfig(name?: string): SSHConfig {
    const key = name || this.defaultName;
    if (!this.configs[key]) {
      throw new Error(`SSH configuration for '${key}' not set`);
    }
    return this.configs[key];
  }

  /**
   * 批量连接所有配置的SSH
   */
  public async connectAll(): Promise<void> {
    const names = Object.keys(this.configs);
    for (const name of names) {
      await this.connect(name);
    }
  }

  /**
   * 连接指定名称的SSH
   */
  public async connect(name?: string): Promise<void> {
    const key = name || this.defaultName;
    if (this.connected.get(key) && this.clients.get(key)) {
      return;
    }
    const config = this.getConfig(key);
    const client = new Client();
    await new Promise<void>((resolve, reject) => {
      client.on("ready", () => {
        this.connected.set(key, true);
        Logger.log(`Successfully connected to SSH server [${key}] ${config.host}:${config.port}`);
        resolve();
      });
      client.on("error", (err: Error) => {
        this.connected.set(key, false);
        reject(new Error(`SSH connection [${key}] failed: ${err.message}`));
      });
      client.on("close", () => {
        this.connected.set(key, false);
        Logger.log(`SSH connection [${key}] closed`, "info");
      });
      const sshConfig: any = {
        host: config.host,
        port: config.port,
        username: config.username,
      };
      if (config.privateKey) {
        try {
          sshConfig.privateKey = fs.readFileSync(config.privateKey, "utf8");
          if (config.passphrase) {
            sshConfig.passphrase = config.passphrase;
          }
          Logger.log(`Using SSH private key authentication for [${key}]`, "info");
        } catch (err) {
          return reject(new Error(`Failed to read private key file for [${key}]: ${(err as Error).message}`));
        }
      } else if (config.password) {
        sshConfig.password = config.password;
        Logger.log(`Using password authentication for [${key}]`, "info");
      } else {
        return reject(new Error(`No valid authentication method provided for [${key}] (password or private key)`));
      }
      client.connect(sshConfig);
    });
    this.clients.set(key, client);
  }

  /**
   * 获取指定名称的SSH Client
   */
  public getClient(name?: string): Client {
    const key = name || this.defaultName;
    const client = this.clients.get(key);
    if (!client) {
      throw new Error(`SSH client for '${key}' not connected`);
    }
    return client;
  }

  /**
   * Ensure SSH client is connected
   * @private
   */
  private async ensureConnected(name?: string): Promise<Client> {
    const key = name || this.defaultName;
    if (!this.connected.get(key) || !this.clients.get(key)) {
      await this.connect(key);
    }
    const client = this.clients.get(key);
    if (!client) {
      throw new Error(`SSH client for '${key}' not initialized`);
    }
    return client;
  }

  private validateCommand(command: string, name?: string): { isAllowed: boolean; reason?: string } {
    // Prevent command chaining
    if (/[;&|]/.test(command)) {
      return {
        isAllowed: false,
        reason: "Command chaining is not allowed."
      };
    }

    const config = this.getConfig(name);
    // Check whitelist (if whitelist is configured, command must match one of the patterns to be allowed)
    if (config.commandWhitelist && config.commandWhitelist.length > 0) {
      const matchesWhitelist = config.commandWhitelist.some(pattern => {
        const regex = new RegExp(pattern);
        return regex.test(command);
      });
      if (!matchesWhitelist) {
        return {
          isAllowed: false,
          reason: "Command not in whitelist, execution forbidden"
        };
      }
    }
    // Check blacklist (if command matches any pattern in blacklist, execution is forbidden)
    if (config.commandBlacklist && config.commandBlacklist.length > 0) {
      const matchesBlacklist = config.commandBlacklist.some(pattern => {
        const regex = new RegExp(pattern);
        return regex.test(command);
      });
      if (matchesBlacklist) {
        return {
          isAllowed: false,
          reason: "Command matches blacklist, execution forbidden"
        };
      }
    }
    // Validation passed
    return {
      isAllowed: true
    };
  }

  /**
   * Execute SSH command
   */
  public async executeCommand(cmdString: string, name?: string): Promise<string> {
    // Validate command
    const validationResult = this.validateCommand(cmdString, name);
    if (!validationResult.isAllowed) {
      throw new Error(`Command validation failed: ${validationResult.reason}`);
    }
    const client = await this.ensureConnected(name);
    return new Promise<string>((resolve, reject) => {
      client.exec(
        cmdString,
        (err: Error | undefined, stream: ClientChannel) => {
          if (err) {
            return reject(new Error(`Command execution error: ${err.message}`));
          }
          let data = "";
          let errorData = "";
          stream.on("data", (chunk: Buffer) => (data += chunk.toString()));
          stream.stderr.on(
            "data",
            (chunk: Buffer) => (errorData += chunk.toString())
          );
          stream.on("close", (code: number) => {
            if (code !== 0) {
              return reject(
                new Error(`Command execution failed, exit code: ${code}, error: ${errorData}`)
              );
            }
            resolve(data);
          });
          stream.on("error", (err: Error) => {
            reject(new Error(`Stream error: ${err.message}`));
          });
        }
      );
    });
  }

  /**
   * Upload file
   */
  private validateLocalPath(localPath: string): string {
    const resolvedPath = path.resolve(localPath);
    const workingDir = process.cwd();
    if (!resolvedPath.startsWith(workingDir)) {
      throw new Error(`Path traversal detected. Local path must be within the working directory.`);
    }
    return resolvedPath;
  }

  /**
   * Upload file
   */
  public async upload(localPath: string, remotePath: string, name?: string): Promise<string> {
    const validatedLocalPath = this.validateLocalPath(localPath);
    const client = await this.ensureConnected(name);

    return new Promise<string>((resolve, reject) => {
      client.sftp((err: Error | undefined, sftp: SFTPWrapper) => {
        if (err) {
          return reject(new Error(`SFTP connection failed: ${err.message}`));
        }

        const readStream = fs.createReadStream(validatedLocalPath);
        const writeStream = sftp.createWriteStream(remotePath);

        const cleanup = () => {
          sftp.end();
        };

        writeStream.on("close", () => {
          cleanup();
          resolve("File uploaded successfully");
        });

        writeStream.on("error", (err: Error) => {
          cleanup();
          reject(new Error(`File upload failed: ${err.message}`));
        });

        readStream.on("error", (err: Error) => {
          cleanup();
          reject(new Error(`Failed to read local file: ${err.message}`));
        });

        readStream.pipe(writeStream);
      });
    });
  }

  /**
   * Download file
   */
  public async download(remotePath: string, localPath: string, name?: string): Promise<string> {
    const validatedLocalPath = this.validateLocalPath(localPath);
    const client = await this.ensureConnected(name);

    return new Promise<string>((resolve, reject) => {
      client.sftp((err: Error | undefined, sftp: SFTPWrapper) => {
        if (err) {
          return reject(new Error(`SFTP connection failed: ${err.message}`));
        }

        const readStream = sftp.createReadStream(remotePath);
        const writeStream = fs.createWriteStream(validatedLocalPath);

        const cleanup = () => {
          sftp.end();
        };

        writeStream.on("finish", () => {
          cleanup();
          resolve("File downloaded successfully");
        });

        writeStream.on("error", (err: Error) => {
          cleanup();
          reject(new Error(`Failed to save file: ${err.message}`));
        });

        readStream.on("error", (err: Error) => {
          cleanup();
          reject(new Error(`File download failed: ${err.message}`));
        });

        readStream.pipe(writeStream);
      });
    });
  }

  /**
   * Disconnect SSH connection
   */
  public disconnect(): void {
    if (this.clients.size > 0) {
      for (const client of this.clients.values()) {
        client.end();
      }
      this.clients.clear();
    }
  }

  /**
   * 获取所有已配置服务器的基本信息
   */
  public getAllServerInfos(): Array<{ name: string; host: string; port: number; username: string; connected: boolean }> {
    return Object.keys(this.configs).map(key => {
      const config = this.configs[key];
      return {
        name: key,
        host: config.host,
        port: config.port,
        username: config.username,
        connected: this.connected.get(key) === true
      };
    });
  }
} 