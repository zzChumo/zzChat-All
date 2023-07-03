加入位于Discord的讨论！  
https://discord.gg/9FJYmYPEHp   

zzChat项目目前已入驻爱发电。   
https://afdian.net/a/zzChumo   
  
---

# zzChat

[zzChat](https://zzchat.eu.org)是一个简洁、美观的网络WebSocket聊天室，基于[Hack.Chat](https://github.com/hack-chat/main)。

# 安装

## 准备

- [node.js 8.10.0](https://nodejs.org/en/download/package-manager/)及更高版本
- [npm 5.7.1](https://nodejs.org/en/download/package-manager/)及更高版本

## 安装（对于Linux）

1. 在[Release](https://github.com/zzChumo/zzChat-All/releases/tag/Release)页面中下载包。
2. 执行`unzip zzChat.zip && mv zzChat main && cd main`以解压并打开包。
8. 执行`sudo nano/vi/vim/gedit update.sh`，根据注释更改`WS`和`IPXFF`的值。
4. 执行`sudo chmod a+x update.sh && sudo ./update.sh`以执行脚本。
9. 执行`npm start`以启动zzChat，前端在你的3000端口上。

## 升级（对于Linux）
1. 在[Release](https://github.com/zzChumo/zzChat-All/releases/tag/Release)页面中下载Update包。
2. 执行`unzip update.zip && cd update`以解压并打开包。
3. 执行`sudo nano/vi/vim/gedit update.sh`（Android设备需要指定`#!/system/xbin/bash`），根据注释更改`WS`、`ZCDIR`、`CLDIR`和`IPXFF`的值。
4. 使用root权限执行该脚本。

# 声明

本项目使用GSTAUL协议进行开源。

---

# 可能的情报

- zzChat Client V2被雨云群友称为“屎山”“高血压代码”（悲）

# TODO

- [x] 适配Chrome Mobile 10x
- [x] 砍掉自定义背景
- [x] 客户端完全简中化
- [ ] 多语言支持
- [x] 客户端重写
- [ ] 从隔壁[xjzh123/hackchat-client-plus](https://github.com/xjzh123/hackchat-client-plus)那边整点薯条
- [x] 自动全新配置脚本
- [x] 自动从新版本压缩包更新脚本

