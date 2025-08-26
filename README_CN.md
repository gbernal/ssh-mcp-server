# 🔐 ssh-mcp-server

基于 SSH 的 MCP (Model Context Protocol) 服务器，允许通过 MCP 协议远程执行 SSH 命令。

[English Document](README.md) | 中文文档

## 📝 项目介绍

ssh-mcp-server 是一个桥接工具，可以让 AI 助手等支持 MCP 协议的应用通过标准化接口执行远程 SSH 命令。这使得 AI 助手能够安全地操作远程服务器，执行命令并获取结果，而无需直接暴露 SSH 凭据给 AI 模型。

## ✨ 功能亮点

- **🔒 安全连接**：支持多种安全的 SSH 连接方式，包括密码认证和私钥认证（支持带密码的私钥）
- **🛡️ 命令安全控制**：通过灵活的黑白名单机制，精确控制允许执行的命令范围，防止危险操作
- **🔄 标准化接口**：符合 MCP 协议规范，与支持该协议的 AI 助手无缝集成
- **📂 文件传输**：支持双向文件传输功能，可上传本地文件到服务器或从服务器下载文件
- **🔑 凭据隔离**：SSH 凭据完全在本地管理，不会暴露给 AI 模型，增强安全性
- **🚀 即用即走**：使用 NPX 可直接运行，无需全局安装，方便快捷

## 📦 开源仓库

GitHub：[https://github.com/classfang/ssh-mcp-server](https://github.com/classfang/ssh-mcp-server)

NPM: [https://www.npmjs.com/package/@fangjunjie/ssh-mcp-server](https://www.npmjs.com/package/@fangjunjie/ssh-mcp-server)

## 🛠️ 工具列表

| 工具 | 名称 | 描述 |
|---------|-----------|----------|
| execute-command | 命令执行工具 | 在远程服务器上执行 SSH 命令并获取执行结果 |
| upload | 文件上传工具 | 将本地文件上传到远程服务器指定位置 |
| download | 文件下载工具 | 从远程服务器下载文件到本地指定位置 |
| list-servers | 服务器列表工具 | 列出所有可用SSH服务器配置 |

## 📚 使用方法

### 🔧 MCP 配置示例

#### ⚙️ 命令行选项

```text
选项:
  -h, --host          SSH 服务器主机地址
  -p, --port          SSH 服务器端口
  -u, --username      SSH 用户名
  -w, --password      SSH 密码
  -k, --privateKey    SSH 私钥文件路径
  -P, --passphrase    私钥密码（如果有的话）
  -W, --whitelist     命令白名单，以逗号分隔的正则表达式
  -B, --blacklist     命令黑名单，以逗号分隔的正则表达式
  -s, --socksProxy    SOCKS 代理地址 (e.g., socks://user:password@host:port)
```

#### 🔑 使用密码

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

#### 🔐 使用私钥

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

#### 🔏 使用带密码私钥

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

#### 🌐 使用 SOCKS 代理

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
        "--socksProxy socks://username:password@proxy-host:proxy-port"
      ]
    }
  }
}
```

#### 📝 使用命令白名单和黑名单

使用 `--whitelist` 和 `--blacklist` 参数可以限制可执行的命令范围，多个模式之间用逗号分隔。每个模式都是一个正则表达式，用于匹配命令。

示例：使用命令白名单

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

示例：使用命令黑名单

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

> 注意：如果同时指定了白名单和黑名单，系统会先检查命令是否在白名单中，然后再检查是否在黑名单中。命令必须同时通过两项检查才能被执行。

### 🧩 多SSH连接用法示例

可以通过多次 --ssh 参数指定多个SSH连接，每个连接需有唯一name：

```bash
npx @fangjunjie/ssh-mcp-server \
  --ssh "name=dev,host=1.2.3.4,port=22,user=alice,password=xxx" \
  --ssh "name=prod,host=5.6.7.8,port=22,user=bob,password=yyy"
```

在MCP工具调用时，通过 `connectionName` 参数指定目标连接名称，未指定时使用默认连接。

示例（在prod连接上执行命令）：

```json
{
  "tool": "execute-command",
  "params": {
    "cmdString": "ls -al",
    "connectionName": "prod"
  }
}
```

示例（带超时选项的命令执行）：

```json
{
  "tool": "execute-command",
  "params": {
    "cmdString": "ping -c 10 127.0.0.1",
    "connectionName": "prod",
    "timeout": 5000
  }
}
```

### ⏱️ 命令执行超时

`execute-command` 工具支持超时选项，防止命令无限期挂起：

- **timeout**: 命令执行超时时间（毫秒，可选，默认为30000ms）

这对于像 `ping`、`tail -f` 或其他可能阻塞执行的长时间运行进程特别有用。

### 🗂️ 列出所有SSH服务器

可以通过MCP工具 `list-servers` 获取所有可用的SSH服务器配置：

调用示例：

```json
{
  "tool": "list-servers",
  "params": {}
}
```

返回示例：

```json
[
  { "name": "dev", "host": "1.2.3.4", "port": 22, "username": "alice" },
  { "name": "prod", "host": "5.6.7.8", "port": 22, "username": "bob" }
]
```

## 🎮 演示

### 🖥️ Cursor 接入

![demo_1.png](images/demo_1.png)

![demo_2.png](images/demo_2.png)
