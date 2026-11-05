# V2 静态构建与 GitHub Pages

在 OpenCMMS 项目根目录运行。构建需要 Python 3.10 或更新版本，仅使用标准库。

```powershell
python scripts/build_v2_pages.py
python scripts/build_v2_pages.py --check
python -m http.server 8030 --bind 127.0.0.1 --directory dist-pages
```

打开 <http://127.0.0.1:8030/>。同一份产物可部署到站点根路径或 GitHub Pages 项目子路径，无需填写仓库名。使用 HTTP 或 HTTPS 访问，以保留浏览器存储、下载和打印预览行为。

构建从 V2 预览的静态允许列表读取资源，另附带两份第三方库许可证。它在产物内生成入口、转换资源 URL，并将电梯打印入口指向静态 HTML。检查模式按当前源码逐字节校验产物，拒绝额外文件、重定向路径和硬链接。数据库、服务端、历史备份、测试和模板检查报告均在公开文件清单之外。新增公开资源时应确认其内容为可发布的演示数据。

## 浏览器验证

```powershell
npm install --no-save --no-package-lock playwright@1.56.1
npx playwright install chromium
node tests/v2/pages.e2e.cjs
```

测试自带仅服务产物的本地 HTTP 服务，同时检查根路径和项目子路径。运行中的原 V2 可加入对照。

```powershell
$env:V2_COMPARE_URL = 'http://127.0.0.1:8020/'
node tests/v2/pages.e2e.cjs
```

## 部署

远程仓库创建后，将 GitHub 仓库的 **Settings → Pages → Source** 设为 **GitHub Actions**。工作流在推送到 `main` 时运行，也支持手动触发。构建、静态校验和浏览器测试通过后才上传产物并部署。`dist-pages/` 由构建生成并被 Git 忽略。

## 功能边界

静态站使用原 V2 的虚构样本和浏览器内逻辑。会话内更改仍随会话结束丢失，综合查询方案仍保存在当前浏览器的本地存储中。不同端口或域名的本地存储独立。登录、数据库写入和正式监管业务需要服务端，原 V2 演示入口也未开放这些业务。电梯使用标志保留网页打印和专用控件不可用时的浏览器回退。
