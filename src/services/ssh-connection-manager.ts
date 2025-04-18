import { Client, ClientChannel } from "ssh2";
import { SSHConfig } from "../models/types.js";
import { Logger } from "../utils/logger.js";
import fs from "fs";
import { SFTPWrapper } from "ssh2";

/**
 * SSH连接管理器类
 */
export class SSHConnectionManager {
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

      const sshConfig: any = {
        host: config.host,
        port: config.port,
        username: config.username,
      };

      // 配置认证方式：使用私钥或密码
      if (config.privateKey) {
        try {
          sshConfig.privateKey = fs.readFileSync(config.privateKey, "utf8");
          if (config.passphrase) {
            sshConfig.passphrase = config.passphrase;
          }
          Logger.log("使用SSH私钥认证", "info");
        } catch (err) {
          return reject(
            new Error(`读取私钥文件失败: ${(err as Error).message}`)
          );
        }
      } else if (config.password) {
        sshConfig.password = config.password;
        Logger.log("使用密码认证", "info");
      } else {
        return reject(new Error("未提供有效的认证方式（密码或私钥）"));
      }

      this.client.connect(sshConfig);
    });
  }

  /**
   * 确保SSH客户端已连接
   * @private
   */
  private async ensureConnected(): Promise<Client> {
    if (!this.connected || !this.client) {
      await this.connect();
    }

    if (!this.client) {
      throw new Error("SSH客户端未初始化");
    }

    return this.client;
  }

  /**
   * 验证命令是否允许执行
   * @param command 要执行的命令
   * @returns 验证结果对象
   */
  private validateCommand(command: string): { isAllowed: boolean; reason?: string } {
    if (!this.config) {
      throw new Error("SSH配置未设置");
    }

    // 检查白名单（如果配置了白名单，命令必须匹配其中一项才允许执行）
    if (this.config.commandWhitelist && this.config.commandWhitelist.length > 0) {
      const matchesWhitelist = this.config.commandWhitelist.some(pattern => {
        const regex = new RegExp(pattern);
        return regex.test(command);
      });

      if (!matchesWhitelist) {
        return {
          isAllowed: false,
          reason: "命令不在白名单中，禁止执行"
        };
      }
    }

    // 检查黑名单（如果命令匹配黑名单中的任意项，则禁止执行）
    if (this.config.commandBlacklist && this.config.commandBlacklist.length > 0) {
      const matchesBlacklist = this.config.commandBlacklist.some(pattern => {
        const regex = new RegExp(pattern);
        return regex.test(command);
      });

      if (matchesBlacklist) {
        return {
          isAllowed: false,
          reason: "命令匹配黑名单，禁止执行"
        };
      }
    }

    // 通过验证
    return {
      isAllowed: true
    };
  }

  /**
   * 执行SSH命令
   */
  public async executeCommand(cmdString: string): Promise<string> {
    // 验证命令
    const validationResult = this.validateCommand(cmdString);
    if (!validationResult.isAllowed) {
      throw new Error(`命令验证失败: ${validationResult.reason}`);
    }

    const client = await this.ensureConnected();

    return new Promise<string>((resolve, reject) => {
      client.exec(
        cmdString,
        (err: Error | undefined, stream: ClientChannel) => {
          if (err) {
            return reject(new Error(`执行命令错误: ${err.message}`));
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
                new Error(`命令执行失败，退出码: ${code}, 错误: ${errorData}`)
              );
            }
            resolve(data);
          });

          stream.on("error", (err: Error) => {
            reject(new Error(`流错误: ${err.message}`));
          });
        }
      );
    });
  }

  /**
   * 上传文件
   */
  public async upload(localPath: string, remotePath: string): Promise<string> {
    const client = await this.ensureConnected();

    return new Promise<string>((resolve, reject) => {
      client.sftp((err: Error | undefined, sftp: SFTPWrapper) => {
        if (err) {
          return reject(new Error(`SFTP连接失败: ${err.message}`));
        }

        const readStream = fs.createReadStream(localPath);
        const writeStream = sftp.createWriteStream(remotePath);

        readStream.pipe(writeStream);
        
        readStream.on("end", () => {
          resolve("文件上传成功");
        });

        readStream.on("error", (err: Error) => {
          reject(new Error(`文件上传失败: ${err.message}`));
        });
      });
    });
  }

  /**
   * 下载文件
   */
  public async download(remotePath: string, localPath: string): Promise<string> {
    const client = await this.ensureConnected();

    return new Promise<string>((resolve, reject) => {
      client.sftp((err: Error | undefined, sftp: SFTPWrapper) => {
        if (err) {
          return reject(new Error(`SFTP连接失败: ${err.message}`));
        }

        const readStream = sftp.createReadStream(remotePath);
        const writeStream = fs.createWriteStream(localPath);

        readStream.pipe(writeStream);
        
        writeStream.on("finish", () => {
          resolve("文件下载成功");
        });

        readStream.on("error", (err: Error) => {
          reject(new Error(`文件下载失败: ${err.message}`));
        });

        writeStream.on("error", (err: Error) => {
          reject(new Error(`保存文件失败: ${err.message}`));
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