# iTools

后端开发常用工具箱，顶部快捷切换。除翻译外，所有计算均在浏览器本地完成，不上传输入、不保存历史，不依赖外部 CDN。

| 工具 | 功能 |
| --- | --- |
| 双文本翻译 | 两组原文均自动检测语言，分别默认译成英语和中文；各支持 10 万 Unicode 字符（含空白），使用 `free` 模型分段翻译，可取消、继续、复制和下载 |
| MD5 / SHA | UTF-8 文本的 MD5、SHA-1、SHA-256、SHA-512，支持大小写；按原文包含空格和换行计算 |
| URL | 参数值、完整 URL、表单值三种模式的编码和解码 |
| Base64 | UTF-8 文本编码和解码，支持中文和 Emoji |
| JSON | 格式化、压缩、校验；拒绝将超出安全整数范围的数字重新序列化，避免长 ID 精度丢失 |
| 时间戳 | 秒、毫秒、带时区的 ISO 日期互转，显示 UTC 和北京时间 |
| JWT | 解码 Header 和 Payload；不验证签名，不据此判断令牌可信性 |
| UUID | 批量生成 1–100 个 UUID v4，支持大写与移除连字符 |

工具状态在页面内切换时保留。通过 `#hash`、`#url`、`#json` 等地址片段可直接打开某个工具。输入后按 `Ctrl/⌘ + Enter` 可执行主要操作。

## 本地运行

需要 Node.js 22 或更新版本，无第三方运行时依赖，无需构建。

```sh
cp .env.example .env.local
chmod 600 .env.local
# 编辑 .env.local 填入翻译接口的 API_KEY 与 API_BASE。
npm start
```

打开 http://localhost:4173 。未配置密钥时，本地工具仍可使用，翻译会提示接口未配置。

`.env.local` 使用 JSON 格式，已排除出 Git。`PUBLIC_ORIGIN` 必须与浏览器访问的协议、主机和端口一致。可通过进程环境 `PORT` 改变监听端口，通过 `CONFIG_FILE` 指定其他配置路径。仅监听回环地址；公网访问使用 Nginx 代理。

## 验证

```sh
npm test
```

使用 Node 内置测试验证 MD5 标准向量及 Unicode、URL 模式差异、Base64、JSON、时间戳、JWT、10 万字分段保真、翻译错误处理与静态资源边界。真实模型调用不包含在自动测试中。完整 10 万字翻译的耗时、质量和模型限额需单独实测，分段缺少全文上下文，术语一致性仍需核对。

## 当前服务器

入口为 `/itools/`，原 `/translate/` 保留；首页和模型网关路径不变。

代码发布到 `/opt/itools/releases/<commit>`，`/opt/itools/current` 指向当前版本。复用独立的 `dual-translate.service` 和 `dualtranslate` 用户；服务配置模板见 `deploy/itools.service`。运行配置继续由服务器的 `/opt/dual-translate/.env.local` 提供，密钥不进入代码仓库。模型通过服务器内部 `/v1` 接口调用，固定使用 `free`。

Nginx 需要将 `/itools/` 与 `/translate/` 下的请求转发到 `http://127.0.0.1:4173/`，去掉前缀；不带末尾斜线的路径需跳转到带斜线的路径。反向代理超时至少 180 秒，关闭响应缓冲。勿将根路径转发至此服务。

更新服务代码后使用 `systemctl restart dual-translate`。查看日志使用 `journalctl -u dual-translate`。
