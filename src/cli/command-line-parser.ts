import { parseArgs } from "node:util";
import { SSHConfig } from "../models/types.js";

/**
 * Command line argument parser class
 */
export class CommandLineParser {
  /**
   * Parse command line arguments
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

    // Support two ways to pass parameters: named arguments or positional arguments
    const host = values.host || positionals[0];
    const portStr = values.port || positionals[1];
    const username = values.username || positionals[2];
    const password = values.password || positionals[3];
    const privateKey = values.privateKey;
    const passphrase = values.passphrase;
    const whitelist = values.whitelist;
    const blacklist = values.blacklist;

    if (!host || !portStr || !username || (!password && !privateKey)) {
      throw new Error("Missing required parameters, need to provide host, port, username and password or private key");
    }

    const port = parseInt(portStr, 10);
    if (isNaN(port)) {
      throw new Error("Port must be a valid number");
    }

    // Initialize whitelist and blacklist
    let commandWhitelist: string[] | undefined;
    let commandBlacklist: string[] | undefined;

    // Process whitelist
    if (whitelist) {
      commandWhitelist = whitelist
        .split(",")
        .map((pattern) => pattern.trim())
        .filter(Boolean);
    }

    // Process blacklist
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
