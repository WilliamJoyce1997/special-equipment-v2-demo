# Cloudflare Quick Tunnel：P0 受限预览

生效域名：`https://contrast-prefix-from-increasing.trycloudflare.com`。预览仅监听 `127.0.0.1:8010`，使用 `cmms_project.preview_settings` 和 `.local/demo.sqlite3`。原始数据库不用于预览。

配置：DEBUG=False；ALLOWED_HOSTS 仅该域名及本机；CSRF_TRUSTED_ORIGINS 为该域名的 HTTPS 来源。Django CSRF 中间件保持启用；DRF API 使用 Bearer 令牌。Waitress 只信任来自 127.0.0.1 的代理及 X-Forwarded-Proto，清除其他不受信任的转发头；Django 从 Waitress 设置的 WSGI scheme 判断 HTTPS。此信任依赖本机上的进程可信，本机其他进程也能连接该端口并伪造该头。

WhiteNoise 仅允许主页面、登录页、共用CSS和所需JS；其他静态调试页返回404。预览不注册 `/admin/`，且拒绝管理员账户登录或使用已有管理员JWT。匿名业务API拒绝访问；登录接口配置每分钟30次匿名请求限制，计数为当前进程内、共享本机代理地址，并非跨进程或分布式防护。

演示账号的随机密码由本机工作树运行 `python start.py --show-accounts` 获取。预览开启即允许持有普通演示账户密码者经公网访问其授权数据；仅供虚构Demo，访问链接和密码只应发给授权验收人员。Quick Tunnel 地址变化后，需同步更新精确主机和HTTPS来源配置并重启预览。

## 启动与停止

在本目录终端启动：`python -B preview_server.py`；前台按 Ctrl+C 关闭。当前后台实例PID存于 `.local/preview.pid`。若要停止后台实例，先检查 `Get-CimInstance Win32_Process -Filter "ProcessId=$((Get-Content .local/preview.pid))" | Select-Object ProcessId,CommandLine`，确认命令行为 `preview_server.py`，再执行 `Stop-Process -Id (Get-Content .local/preview.pid)`。不要停止 `cloudflared` 或8000服务。

## 已验证

2026-10-28：公网登录页、CSS、JS 200；admin 404；匿名设备API 401；调试HTML 404；虚构使用单位及点检员HTTPS登录200；新建模拟点检计划201、生成任务200、点检提交201、报表200且完成1/应检1；管理员登录401。浏览器公网登录、点检和报表页面打开成功，无页面脚本错误。测试创建了一条名称含“公网预览虚构点检”的演示计划和记录，保留在独立Demo库。

切换前独立Demo库备份在 `.local/demo-before-preview-20261028-174238.sqlite3`，完整性及外键检查通过。原始数据库SHA-256与本轮开始时一致。
