import { LogLevel } from '../models/types.js';

/**
 * 日志记录器类
 */
export class Logger {
  /**
   * 记录日志
   */
  public static log(message: string, level: LogLevel = "info"): void {
    const timestamp = new Date().toISOString();
    const formattedMessage = `[${timestamp}] [${level.toUpperCase()}] ${message}`;

    switch (level) {
      case "error":
        console.error(formattedMessage);
        break;
      case "debug":
        console.debug(formattedMessage);
        break;
      case "info":
      default:
        console.info(formattedMessage);
        break;
    }
  }

  /**
   * 处理错误
   */
  public static handleError(
    error: unknown,
    prefix: string = "",
    exit: boolean = false
  ): string {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const fullMessage = prefix ? `${prefix}: ${errorMessage}` : errorMessage;

    Logger.log(fullMessage, "error");

    if (exit) {
      process.exit(1);
    }

    return fullMessage;
  }
} 