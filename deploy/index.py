#!/usr/bin/env python
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
