# Vue 项目打包后双击 preview 失效了？一行命令搞定本地静态预览

> 以前打包完双击 `index.html` 就能看效果，现在浏览器说不行了……

---

## 一个时代的落幕

还记得以前用 Vue 写项目的日子吗？

`npm run build` 打完包，进入 `dist` 目录，**双击 `index.html`**，浏览器"啪"的一下就打开了，预览效果完美。

简单、直接、零成本。

但不知道从什么时候开始，这招不好使了：

- 🚫 **CORS 跨域报错** —— `file://` 协议下 Ajax 请求全挂
- 🚫 **History 路由 404** —— 刷新页面直接白屏
- 🚫 **ES Module 被拦截** —— 本地模块导入被浏览器安全策略禁止
- 🚫 **Web Worker / WASM 跑不起来** —— 统统因为 file 协议受限

**浏览器安全策略越来越严，file 协议基本被判了死刑。**

为了预览个打包结果，难道还要专门搭个 Nginx？

---

## 传统方案的痛点

很多人转向了这些工具：

| 工具 | 问题 |
|------|------|
| `python -m http.server` | Python 不是每台机器都有，Windows 还得装 |
| `npx serve` | 每次都要 `npx`，而且 SPA fallback 还要额外参数 |
| `npx http-server` | 默认端口 8080，老是被占用 |
| `npm i -g http-server` | 全局装一堆依赖，就为预览个静态文件 |

**太重了。**

我只是想快速看一眼打包效果，或者给同事演示一下，至于吗？

---

## 试试 vue-httpd

今天推荐一个我写的极简工具 —— **`vue-httpd`**。

专为 Vue 等单页应用的静态预览而生，**一行命令，零配置**。

### 安装

```bash
npm install -g vue-httpd
```

### 使用

进入你的打包目录，执行：

```bash
vue-httpd
```

输出：

```
  服务已启动
  静态目录: D:\project\my-app\dist
  回退文件: index.html

  本地:   http://localhost:6006/
  网络:   http://192.168.1.100:6006/
  网络:   http://10.0.0.5:6006/

  按 Ctrl+C 停止服务
```

浏览器打开 `http://localhost:6006/`，搞定。

---

## 为什么选它？

### 1. 默认端口 6006，被占自动递增

很多工具的默认端口都是 8080，十个项目八个冲突。

`vue-httpd` 默认用 **6006**，如果占用自动往上找（6007、6008……），**永远不需要手动改端口**。

```bash
vue-httpd              # 默认 6006
vue-httpd --port 3000  # 自定义端口
```

### 2. SPA 路由完美支持

Vue Router 用 `history` 模式时，访问 `/user/profile` 这种路由，传统静态服务器会报 404。

`vue-httpd` **自动回退到入口 HTML 文件**，前端路由接管渲染，完全无感。

```bash
vue-httpd --fallback app.html
```

找不到你指定的 fallback？它会**自动降级**：

```
你配置的 fallback → index.html → 目录下任意 .html → 404
```

### 3. 自动枚举所有网卡 IP

预览时最烦的就是手机访问不了。

`vue-httpd` 启动时会**列出所有网卡的 IPv4 地址**，WiFi、有线、虚拟机网卡通通显示，手机输入局域网地址就能直接访问。

```
  网络:   http://192.168.1.100:6006/
  网络:   http://192.168.56.1:6006/
```

### 4. 零依赖

纯 Node.js 原生 API 实现，**没有第三方依赖**，安装就是几个文件的拷贝，秒级完成。

### 5. 自定义静态目录

不一定要进入 `dist` 目录，可以直接指定：

```bash
vue-httpd ./dist
vue-httpd --port 8080 ./dist
```

---

## 不只是 Vue

虽然叫 `vue-httpd`，但它本质是个**通用静态文件服务器**。

- ✅ Vue / React / Angular 等 SPA 项目预览
- ✅ 快速搭建本地静态文件服务
- ✅ 局域网内多设备预览（手机、平板测试）
- ✅ 验证生产构建结果

---

## 开源 & 安装

项目已开源在 GitHub，也同步发布到了 npm：

```bash
# 全局安装
npm install -g vue-httpd

# 临时试用
npx vue-httpd
```

**GitHub**: https://github.com/rzl/vue-httpd

如果你也受够了 file 协议的各种限制，或者不想为了预览个页面装一大堆东西，试试它。

---

*有用的话点个 ⭐，转发给还在双击 `index.html` 的同事。*
