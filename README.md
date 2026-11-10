# iTools

[在线使用](https://itool.lrdzero.uk/)

后端开发常用工具箱，顶部快捷切换。除翻译和出口 IP 查询外，所有计算均在浏览器本地完成。出口 IP 仅由本站服务器观察请求来源，不调用第三方 IP 查询服务；其他工具不上传输入、不保存历史，不依赖外部 CDN。

| 工具 | 功能 |
| --- | --- |
| 双向翻译 | 一个原文输入框，选择两种语言（默认中文 ↔ 英语），停止输入约 700 毫秒后自动识别原文主要语言并翻译成另一种，继续编辑会取消旧请求，切换语言自动重译；支持 10 万 Unicode 字符（含空白），使用 `free` 模型分段翻译，可取消、继续、复制和下载 |
| 出口 IP | 显示当前请求到达本站时的来源 IP（IPv4 / IPv6），支持刷新和复制；代理分流时仅代表访问本站的线路 |
| IMEI | 批量检查 15 位号码的 Luhn 校验位、14 位补校验位、按 8 位前缀生成测试号码；不查询设备真实性或型号数据库 |
| HMAC | 使用 UTF-8 密钥计算 SHA-256 / SHA-1 / SHA-512 签名，输出 Hex 或 Base64 |
| 进制转换 | 二、八、十、十六进制整数转换，使用 BigInt 保留长整数精度 |
| 文本处理 | 按行去重、去空白与空行、排序，适合整理订单 ID 与日志 |
| 美国地址 | 五个无州级一般销售税州的虚构测试地址，支持分行文本和 JSON；不保证可投递 |
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

`.env.local` 使用 JSON 格式，已排除出 Git。`PUBLIC_ORIGIN` 必须与浏览器访问的协议、主机和端口一致。多域名部署可在 `PUBLIC_ORIGINS` 数组中列出额外允许的完整来源；只匹配配置的主机，不信任任意转发头。可通过进程环境 `PORT` 改变监听端口，通过 `CONFIG_FILE` 指定其他配置路径。仅监听回环地址；公网访问使用 Nginx 代理。

## 验证

```sh
npm test
```

使用 Node 内置测试验证 MD5 标准向量及 Unicode、URL 模式差异、Base64、JSON、时间戳、JWT、10 万字分段保真、翻译错误处理与静态资源边界。真实模型调用不包含在自动测试中。完整 10 万字翻译的耗时、质量和模型限额需单独实测，首段识别语言后，后续分段保持同一翻译方向。中外文混合内容按首段主要语言判断，过短或含糊内容可能识别不准；分段缺少全文上下文，术语一致性仍需核对。

## 当前服务器

专用域名入口为 https://itool.lrdzero.uk/ ，DNS A 记录指向现有服务器。IP 地址下的 `/itools/` 和原 `/translate/` 保留；IP 站点首页和模型网关路径不变。

代码发布到 `/opt/itools/releases/<commit>`，`/opt/itools/current` 指向当前版本。复用独立的 `dual-translate.service` 和 `dualtranslate` 用户；服务配置模板见 `deploy/itools.service`。运行配置继续由服务器的 `/opt/dual-translate/.env.local` 提供，密钥不进入代码仓库。模型通过服务器内部 `/v1` 接口调用，固定使用 `free`。

Nginx 需要将 `/itools/` 与 `/translate/` 下的请求转发到 `http://127.0.0.1:4173/`，去掉前缀；不带末尾斜线的路径需跳转到带斜线的路径。反向代理超时至少 180 秒，关闭响应缓冲。勿将 IP 站点根路径转发至此服务。专用域名根路径使用独立 Nginx 虚拟主机，配置见 `deploy/itools-domain.conf`。

更新服务代码后使用 `systemctl restart dual-translate`。查看日志使用 `journalctl -u dual-translate`。

## 数据与标准边界

IMEI 的 8 位型号分配码、6 位序列号和校验位结构依据 [RFC 7254](https://www.rfc-editor.org/rfc/rfc7254.html) 与 3GPP TS 23.003 Annex B。工具只验证数字结构和 Luhn 校验位，不判断设备真实存在、型号归属、黑名单或激活状态。生成号码仅作为软件测试数据。

地址的街道和门牌是虚构数据，不能用于收货或证明居住地。城市/ZIP 样例来自各州公开政府联系目录，来源保留在 `public/tools-core.js`。无州级一般销售税不代表所有交易和税种免税；[阿拉斯加地方政府仍可征收销售税](https://www.commerce.alaska.gov/web/dcra/OfficeoftheStateAssessor/AlaskaSalesTaxInformation.aspx)。其他州资料：[Delaware](https://revenue.delaware.gov/business-tax-forms/exemption-certificates/)、[Oregon](https://www.oregon.gov/dor/programs/businesses/Pages/Sales-tax.aspx)、[Montana](https://revenue.mt.gov/taxes/general-sales-tax)、[New Hampshire](https://www.revenue.nh.gov/faq/does-new-hampshire-have-sales-tax)。核对日期：2026-11-08。

专用域名证书使用服务器已有 Certbot 的 webroot 方式签发，验证目录为 `/var/www/html`，证书名 `itools-domain`。`itools-cert-renew.timer` 每日检查续期，成功续期后由证书配置中的 deploy hook 重新加载 Nginx。相关单元见 `deploy/itools-cert-renew.service` 和 `.timer`。续期验证命令：`/opt/certbot/bin/certbot renew --cert-name itools-domain --dry-run`。

出口 IP 接口为 `GET api/ip`，返回 `ip`、`version` 和 `observedAt`，禁止缓存。服务只监听回环地址，只有连接来自回环代理时才接受 Nginx 用 `$remote_addr` 覆盖的 `X-Real-IP`；不信任客户端填写的 `X-Forwarded-For` 或 `CF-Connecting-IP`。若将来启用 CDN / 多层代理，需单独配置可信代理边界，否则会显示最近一层代理的 IP。
