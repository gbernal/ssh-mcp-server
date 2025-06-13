import { Client, ClientChannel } from "ssh2";
import { SSHConfig } from "../models/types.js";
import { Logger } from "../utils/logger.js";
import fs from "fs";
import { SFTPWrapper } from "ssh2";

/**
 * SSH Connection Manager class
 */
export class SSHConnectionManager {
  private static instance: SSHConnectionManager;
  private client: Client | null = null;
  private config: SSHConfig | null = null;
  private connected = false;
  
  // --- Reconnection Logic Properties ---
  private manualDisconnect = false;
  private reconnectAttempts = 0;
  private readonly maxReconnectAttempts = 10; // Max number of retries
  private readonly reconnectDelay = 5000; // Initial delay of 5 seconds

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
   * Set SSH configuration
   */
  public setConfig(config: SSHConfig): void {
    this.config = config;
  }

  /**
   * Get SSH configuration
   */
  public getConfig(): SSHConfig {
    if (!this.config) {
      throw new Error("SSH configuration not set");
    }
    return this.config;
  }

  /**
   * Connect to SSH server
   */
  public async connect(): Promise<void> {
    if (this.connected && this.client) {
      return;
    }

    const config = this.getConfig();
    this.manualDisconnect = false; // Reset flag on new connection attempt
    this.client = new Client();

    await new Promise<void>((resolve, reject) => {
      if (!this.client) {
        return reject(new Error("SSH client not initialized"));
      }

      const initialErrorHandler = (err: Error) => {
          // Only reject the promise for the very first connection attempt.
          // Subsequent reconnection errors will be handled by the 'close' event.
          if (this.reconnectAttempts === 0) {
            reject(new Error(`SSH connection failed: ${err.message}`));
          }
      };

      this.client.on("ready", () => {
        this.connected = true;
        this.reconnectAttempts = 0; // Reset counter on a successful connection
        Logger.log(`Successfully connected to SSH server ${config.host}:${config.port}`);
        this.client?.removeListener("error", initialErrorHandler); // Clean up listener
        resolve();
      });

      this.client.on("error", initialErrorHandler);

      this.client.on("close", () => {
        this.connected = false;
        Logger.log("SSH connection closed", "info");
        // If the disconnection was not intentional, start the reconnect process.
        if (!this.manualDisconnect) {
          this.scheduleReconnect();
        }
      });

      const sshConfig: any = {
        host: config.host,
        port: config.port,
        username: config.username,
        keepaliveInterval: 30000, // Keep-alive packet every 30 seconds
        keepaliveCountMax: 3,     // Disconnect after 3 failed keep-alives
      };

      // Configure authentication method: using private key or password
      if (config.privateKey) {
        try {
          sshConfig.privateKey = fs.readFileSync(config.privateKey, "utf8");
          if (config.passphrase) {
            sshConfig.passphrase = config.passphrase;
          }
          Logger.log("Using SSH private key authentication", "info");
        } catch (err) {
          return reject(
            new Error(`Failed to read private key file: ${(err as Error).message}`)
          );
        }
      } else if (config.password) {
        sshConfig.password = config.password;
        Logger.log("Using password authentication", "info");
      } else {
        return reject(new Error("No valid authentication method provided (password or private key)"));
      }

      this.client.connect(sshConfig);
    });
  }

  /**
   * Schedules a reconnection attempt.
   * @private
   */
  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      Logger.log("Maximum reconnection attempts reached. Giving up.", "error");
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * this.reconnectAttempts; // Linear backoff

    Logger.log(
      `Attempting to reconnect in ${delay / 1000}s (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`
    );

    setTimeout(() => {
      this.connect().catch(err => {
        // Log the error, the 'close' event will trigger the next scheduled reconnect.
        Logger.handleError(err, `Reconnection attempt ${this.reconnectAttempts} failed`);
      });
    }, delay);
  }

  /**
   * Ensure SSH client is connected
   * @private
   */
  private async ensureConnected(): Promise<Client> {
    if (!this.connected || !this.client) {
      await this.connect();
    }

    if (!this.client) {
      throw new Error("SSH client not initialized");
    }

    return this.client;
  }

  /**
   * Validate if command is allowed to execute
   * @param command Command to execute
   * @returns Validation result object
   */
  private validateCommand(command: string): { isAllowed: boolean; reason?: string } {
    if (!this.config) {
      throw new Error("SSH configuration not set");
    }

    // Check whitelist (if whitelist is configured, command must match one of the patterns to be allowed)
    if (this.config.commandWhitelist && this.config.commandWhitelist.length > 0) {
      const matchesWhitelist = this.config.commandWhitelist.some(pattern => {
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
    if (this.config.commandBlacklist && this.config.commandBlacklist.length > 0) {
      const matchesBlacklist = this.config.commandBlacklist.some(pattern => {
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
  public async executeCommand(cmdString: string): Promise<string> {
    // Validate command
    const validationResult = this.validateCommand(cmdString);
    if (!validationResult.isAllowed) {
      throw new Error(`Command validation failed: ${validationResult.reason}`);
    }

    const client = await this.ensureConnected();

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
  public async upload(localPath: string, remotePath: string): Promise<string> {
    const client = await this.ensureConnected();

    return new Promise<string>((resolve, reject) => {
      client.sftp((err: Error | undefined, sftp: SFTPWrapper) => {
        if (err) {
          return reject(new Error(`SFTP connection failed: ${err.message}`));
        }

        const readStream = fs.createReadStream(localPath);
        const writeStream = sftp.createWriteStream(remotePath);

        readStream.pipe(writeStream);
        
        readStream.on("end", () => {
          resolve("File uploaded successfully");
        });

        readStream.on("error", (err: Error) => {
          reject(new Error(`File upload failed: ${err.message}`));
        });
      });
    });
  }

  /**
   * Download file
   */
  public async download(remotePath: string, localPath: string): Promise<string> {
    const client = await this.ensureConnected();

    return new Promise<string>((resolve, reject) => {
      client.sftp((err: Error | undefined, sftp: SFTPWrapper) => {
        if (err) {
          return reject(new Error(`SFTP connection failed: ${err.message}`));
        }

        const readStream = sftp.createReadStream(remotePath);
        const writeStream = fs.createWriteStream(localPath);

        readStream.pipe(writeStream);
        
        writeStream.on("finish", () => {
          resolve("File downloaded successfully");
        });

        readStream.on("error", (err: Error) => {
          reject(new Error(`File download failed: ${err.message}`));
        });

        writeStream.on("error", (err: Error) => {
          reject(new Error(`Failed to save file: ${err.message}`));
        });
      });
    });
  }

  /**
   * Disconnect SSH connection
   */
  public disconnect(): void {
    if (this.client) {
      this.manualDisconnect = true; // Set flag to prevent reconnection
      this.client.end();
      this.client = null;
      this.connected = false;
    }
  }
}