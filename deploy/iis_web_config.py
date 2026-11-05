"""
IIS部署配置脚本 - 自动配置web.config和wfastcgi
运行此脚本以生成IIS所需的web.config文件
"""
import os
import sys
from pathlib import Path

# 项目根目录
BASE_DIR = Path(__file__).resolve().parent

# IIS配置参数
IIS_CONFIG = {
    "site_name": "CMMS",
    "port": 80,
    "python_path": sys.executable,
    "wsgi_handler": "cmms_project.wsgi.application",
    "django_settings": "cmms_project.settings",
}


def generate_web_config():
    """生成web.config文件"""

    # 获取项目路径
    project_path = BASE_DIR
    python_path = sys.executable
    python_lib_path = os.path.join(os.path.dirname(python_path), 'Lib', 'site-packages')

    web_config_content = f"""<?xml version="1.0" encoding="utf-8"?>
<configuration>
  <system.webServer>
    <handlers>
      <add name="Python FastCGI"
           path="*"
           verb="*"
           modules="FastCgiModule"
           scriptProcessor="{python_path}|{python_lib_path}\\wfastcgi.py"
           resourceType="Unspecified"
           requireAccess="Script" />
    </handlers>

    <!-- 静态文件处理 -->
    <staticContent>
      <mimeMap fileExtension=".json" mimeType="application/json" />
      <mimeMap fileExtension=".woff" mimeType="application/font-woff" />
      <mimeMap fileExtension=".woff2" mimeType="font/woff2" />
    </staticContent>

    <!-- URL重写规则 -->
    <rewrite>
      <rules>
        <!-- 静态文件直接提供 -->
        <rule name="Static Files" stopProcessing="true">
          <match url="^static/.*" />
          <action type="None" />
        </rule>
        <rule name="Media Files" stopProcessing="true">
          <match url="^media/.*" />
          <action type="None" />
        </rule>
        <!-- 其他请求转发给Django -->
        <rule name="Django" stopProcessing="true">
          <match url="^(.*)$" />
          <action type="Rewrite" url="index.py/{{R:1}}" appendQueryString="true" />
        </rule>
      </rules>
    </rewrite>

    <!-- 安全设置 -->
    <security>
      <requestFiltering>
        <requestLimits maxAllowedContentLength="52428800" />  <!-- 50MB -->
      </requestFiltering>
    </security>

    <!-- 默认文档 -->
    <defaultDocument>
      <files>
        <clear />
        <add value="index.py" />
      </files>
    </defaultDocument>

    <!-- HTTP响应头 -->
    <httpProtocol>
      <customHeaders>
        <add name="X-Frame-Options" value="SAMEORIGIN" />
      </customHeaders>
    </httpProtocol>
  </system.webServer>

  <appSettings>
    <add key="DJANGO_SETTINGS_MODULE" value="cmms_project.settings" />
    <add key="PYTHONPATH" value="{project_path}" />
    <add key="WSGI_HANDLER" value="cmms_project.wsgi.application" />
  </appSettings>
</configuration>
"""

    config_path = BASE_DIR / "web.config"
    with open(config_path, 'w', encoding='utf-8') as f:
        f.write(web_config_content)

    print(f"已生成 web.config 文件: {config_path}")
    return config_path


def update_settings_allowed_hosts():
    """更新Django settings.py的ALLOWED_HOSTS配置"""

    settings_file = BASE_DIR / "cmms_project" / "settings.py"

    if not settings_file.exists():
        print(f"未找到settings.py文件: {settings_file}")
        return

    with open(settings_file, 'r', encoding='utf-8') as f:
        content = f.read()

    # 检查是否需要更新ALLOWED_HOSTS
    if "ALLOWED_HOSTS = ['*']" in content:
        print("ALLOWED_HOSTS已配置为允许所有主机")
        return

    # 替换ALLOWED_HOSTS配置
    import re
    pattern = r"ALLOWED_HOSTS\s*=\s*\[[^\]]*\]"
    replacement = "ALLOWED_HOSTS = ['*']"

    new_content = re.sub(pattern, replacement, content)

    if new_content != content:
        with open(settings_file, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print("已更新 settings.py 的 ALLOWED_HOSTS 配置")
    else:
        print("ALLOWED_HOSTS配置未找到，请手动设置")


def create_index_py():
    """创建index.py文件（IIS入口点）"""

    index_py_content = """#!/usr/bin/env python
# IIS入口文件 - wfastcgi会调用此文件
import os
import sys

# 添加项目路径到Python路径
from pathlib import Path
BASE_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(BASE_DIR))

# 设置Django设置模块
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'cmms_project.settings')

# 导入WSGI应用
from django.core.wsgi import get_wsgi_application
application = get_wsgi_application()
"""

    index_path = BASE_DIR / "index.py"
    with open(index_path, 'w', encoding='utf-8') as f:
        f.write(index_py_content)

    print(f"已创建 index.py 文件: {index_path}")


def main():
    """主函数"""
    print("=" * 60)
    print("  CMMS IIS部署配置脚本")
    print("=" * 60)

    # 生成配置文件
    generate_web_config()
    update_settings_allowed_hosts()
    create_index_py()

    print("\n" + "=" * 60)
    print("  配置文件已生成，请按以下步骤配置IIS:")
    print("=" * 60)
    print("""
【步骤1】安装IIS和CGI功能
  1. 打开"控制面板" -> "启用或关闭Windows功能"
  2. 勾选以下选项：
     - Internet Information Services (IIS)
     - 万维网服务 -> 应用程序开发功能 -> CGI
     - 万维网服务 -> 应用程序开发功能 -> ISAPI扩展
     - 万万网服务 -> 应用程序开发功能 -> ISAPI筛选器

【步骤2】安装Python包
  在命令行运行：
    pip install wfastcgi

【步骤3】启用wfastcgi
  在命令行运行：
    wfastcgi-enable

  记录输出的路径，例如：
    c:\\python310\\python.exe|c:\\python310\\lib\\site-packages\\wfastcgi.py

【步骤4】配置IIS站点
  1. 打开IIS管理器 (Win+R -> inetmgr)
  2. 右键"网站" -> "添加网站"
     - 网站名称: CMMS
     - 物理路径: {0}
     - 端口: 80
     - IP地址: 全部未分配(或指定服务器IP)

【步骤5】配置FastCGI
  1. 在IIS管理器中，选择服务器根节点
  2. 双击"FastCGI设置"
  3. 点击"添加应用程序"
  4. 填写步骤3中记录的路径

【步骤6】配置应用程序池
  1. 在IIS管理器中，选择"应用程序池"
  2. 找到CMMS站点对应的应用程序池
  3. 右键 -> "基本设置"
  4. .NET CLR版本: 无托管代码
  5. 托管管道模式: 集成

【步骤7】设置权限
  给IIS_IUSRS用户添加以下文件夹的完全控制权限：
  - {0}
  - C:\\Python310\\Lib\\site-packages\\wfastcgi.py
  - C:\\Windows\\Temp

【步骤8】访问应用
  局域网内其他电脑通过以下地址访问：
  http://[服务器IP地址]/

  例如，服务器IP为 192.168.1.100：
  http://192.168.1.100/
  http://192.168.1.100/admin
""".format(BASE_DIR))


if __name__ == "__main__":
    main()
