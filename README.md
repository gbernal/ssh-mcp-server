# ssh-mcp-server

基于 SSH 的 MCP (Model Context Protocol) 服务器，允许通过 MCP 协议远程执行 SSH 命令。

## 项目介绍

ssh-mcp-server 是一个桥接工具，可以让 AI 助手等支持 MCP 协议的应用通过标准化接口执行远程 SSH 命令。这使得 AI 助手能够安全地操作远程服务器，执行命令并获取结果，而无需直接暴露 SSH 凭据给 AI 模型。

## 使用

MCP 配置参考：

```json
{
  "mcpServers": {
    "ssh-mpc-server": {
      "command": "npx",
      "args": [
        "-y",
        "@fangjunjie/ssh-mcp-server",
        "服务器 ip",
        "服务器端口（例如 22）",
        "用户名",
        "密码"
      ]
    }
  }
}
```

## 演示

![demo_1.png](images/demo_1.png)

![demo_2.png](images/demo_2.png)
