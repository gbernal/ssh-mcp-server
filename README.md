# 🔐 ssh-mcp-server

SSH-based MCP (Model Context Protocol) server that allows remote execution of SSH commands via the MCP protocol.


## 📝 Project Overview

ssh-mcp-server is a bridging tool that enables AI assistants and other applications supporting the MCP protocol to execute remote SSH commands through a standardized interface. This allows AI assistants to safely operate remote servers, execute commands, and retrieve results without directly exposing SSH credentials to AI models.

## ✨ Key Features

- **🔒 Secure Connections**: Supports multiple secure SSH connection methods, including password authentication and private key authentication (with passphrase support)
- **🛡️ Command Security Control**: Precisely control the range of allowed commands through flexible blacklist and whitelist mechanisms to prevent dangerous operations
- **🔄 Standardized Interface**: Complies with MCP protocol specifications for seamless integration with AI assistants supporting the protocol
- **📂 File Transfer**: Supports bidirectional file transfers, uploading local files to servers or downloading files from servers
- **🔑 Credential Isolation**: SSH credentials are managed entirely locally and never exposed to AI models, enhancing security
- **🚀 Ready to Use**: Can be run directly using NPX without global installation, making it convenient and quick to deploy

## 📦 Open Source Repository

GitHub: [https://github.com/classfang/ssh-mcp-server](https://github.com/classfang/ssh-mcp-server)

NPM: [https://www.npmjs.com/package/@fangjunjie/ssh-mcp-server](https://www.npmjs.com/package/@fangjunjie/ssh-mcp-server)

## 🛠️ Tools List

| Tool | Name | Description |
|---------|-----------|----------|
| execute-command | Command Execution Tool | Execute SSH commands on remote servers and get results |
| upload | File Upload Tool | Upload local files to specified locations on remote servers |
| download | File Download Tool | Download files from remote servers to local specified locations |

## 📚 Usage

### 🔧 MCP Configuration Examples

#### ⚙️ Command Line Options

```text
Options:
  -h, --host          SSH server host address
  -p, --port          SSH server port
  -u, --username      SSH username
  -w, --password      SSH password
  -k, --privateKey    SSH private key file path
  -P, --passphrase    Private key passphrase (if any)
  -W, --whitelist     Command whitelist, comma-separated regular expressions
  -B, --blacklist     Command blacklist, comma-separated regular expressions
```

#### 🔑 Using Password

```json
{
  "mcpServers": {
    "ssh-mpc-server": {
      "command": "npx",
      "args": [
        "-y",
        "@fangjunjie/ssh-mcp-server",
        "--host 192.168.1.1",
        "--port 22",
        "--username root",
        "--password pwd123456"
      ]
    }
  }
}
```

#### 🔐 Using Private Key

```json
{
  "mcpServers": {
    "ssh-mpc-server": {
      "command": "npx",
      "args": [
        "-y",
        "@fangjunjie/ssh-mcp-server",
        "--host 192.168.1.1",
        "--port 22",
        "--username root",
        "--privateKey ~/.ssh/id_rsa"
      ]
    }
  }
}
```

#### 🔏 Using Private Key with Passphrase

```json
{
  "mcpServers": {
    "ssh-mpc-server": {
      "command": "npx",
      "args": [
        "-y",
        "@fangjunjie/ssh-mcp-server",
        "--host 192.168.1.1",
        "--port 22",
        "--username root",
        "--privateKey ~/.ssh/id_rsa",
        "--passphrase pwd123456"
      ]
    }
  }
}
```

#### 📝 Using Command Whitelist and Blacklist

Use the `--whitelist` and `--blacklist` parameters to restrict the range of executable commands. Multiple patterns are separated by commas. Each pattern is a regular expression used to match commands.

Example: Using Command Whitelist

```json
{
  "mcpServers": {
    "ssh-mpc-server": {
      "command": "npx",
      "args": [
        "-y",
        "@fangjunjie/ssh-mcp-server",
        "--host 192.168.1.1",
        "--port 22",
        "--username root",
        "--password pwd123456",
        "--whitelist ^ls( .*)?,^cat .*,^df.*"
      ]
    }
  }
}
```

Example: Using Command Blacklist

```json
{
  "mcpServers": {
    "ssh-mpc-server": {
      "command": "npx",
      "args": [
        "-y",
        "@fangjunjie/ssh-mcp-server",
        "--host 192.168.1.1",
        "--port 22",
        "--username root",
        "--password pwd123456",
        "--blacklist ^rm .*,^shutdown.*,^reboot.*"
      ]
    }
  }
}
```

> Note: If both whitelist and blacklist are specified, the system will first check whether the command is in the whitelist, and then check whether it is in the blacklist. The command must pass both checks to be executed.

## 🔑 SSH Key Authentication Guide

### Supported Key Types

The ssh-mcp-server supports various SSH key types:
- **RSA** (traditional format and OpenSSH format)
- **ED25519** (recommended for modern systems)
- **ECDSA**
- **DSA** (not recommended for security reasons)

### Key Format Requirements

The SSH2 library used by this server works best with certain key formats:

1. **RSA Keys**: If you have an RSA key in the newer OpenSSH format (starts with `-----BEGIN OPENSSH PRIVATE KEY-----`), you may need to convert it to PEM format:
   ```bash
   # Convert OpenSSH format to PEM format
   cp ~/.ssh/id_rsa ~/.ssh/id_rsa_pem
   ssh-keygen -p -m PEM -f ~/.ssh/id_rsa_pem -N ""
   # Then use the converted key
   --privateKey ~/.ssh/id_rsa_pem
   ```

2. **ED25519 Keys**: Work directly without conversion
   ```bash
   --privateKey ~/.ssh/id_ed25519
   ```

### Troubleshooting SSH Connection Issues

#### "All configured authentication methods failed" Error

This error typically occurs when:

1. **Wrong key type**: The server's `authorized_keys` file doesn't contain the public key you're using
   - Check which key is authorized: `ssh user@host "cat ~/.ssh/authorized_keys"`
   - Make sure you're using the corresponding private key

2. **Key format issues**: Your key is in a format the SSH2 library can't parse
   - For RSA keys in OpenSSH format, convert to PEM format (see above)
   - ED25519 keys usually work without conversion

3. **Multiple keys available**: If you have multiple SSH keys, make sure to specify the correct one
   ```bash
   # Check available keys
   ls -la ~/.ssh/id_*
   
   # Test which key works with regular SSH
   ssh -i ~/.ssh/id_rsa user@host "echo 'RSA key works'"
   ssh -i ~/.ssh/id_ed25519 user@host "echo 'ED25519 key works'"
   ```

#### Debugging Connection Problems

1. **Test with regular SSH first**:
   ```bash
   ssh -v -i /path/to/key user@host
   ```

2. **Create a test script** to debug SSH2 library connections:
   ```javascript
   // test-ssh.js
   import { Client } from 'ssh2';
   import fs from 'fs';
   
   const client = new Client();
   const privateKey = fs.readFileSync('/path/to/key', 'utf8');
   
   client.on('ready', () => {
     console.log('Connected successfully!');
     client.end();
   }).on('error', (err) => {
     console.error('Connection failed:', err);
   }).connect({
     host: 'your.host.com',
     port: 22,
     username: 'your-username',
     privateKey: privateKey,
     debug: (info) => console.log('DEBUG:', info)
   });
   ```

3. **Check permissions**:
   - Private key should be readable only by owner: `chmod 600 ~/.ssh/id_*`
   - `.ssh` directory should have proper permissions: `chmod 700 ~/.ssh`

### Example Configurations

#### Using ED25519 key (recommended):
```json
{
  "mcpServers": {
    "ssh-mpc-server": {
      "command": "npx",
      "args": [
        "-y",
        "@fangjunjie/ssh-mcp-server",
        "--host 192.168.1.1",
        "--port 22",
        "--username myuser",
        "--privateKey ~/.ssh/id_ed25519"
      ]
    }
  }
}
```

#### Using converted RSA key:
```json
{
  "mcpServers": {
    "ssh-mpc-server": {
      "command": "npx",
      "args": [
        "-y",
        "@fangjunjie/ssh-mcp-server",
        "--host 192.168.1.1",
        "--port 22",
        "--username myuser",
        "--privateKey ~/.ssh/id_rsa_pem"
      ]
    }
  }
}
```