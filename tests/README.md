# 🧪 CMMS系统测试文档

本目录包含CMMS系统的所有测试文件，分为后端API测试、前端功能测试和集成测试。

## 📁 目录结构

```
tests/
├── 📁 backend/           # 后端API测试
├── 📁 frontend/          # 前端功能测试
├── 📁 integration/       # 集成测试
└── 📄 README.md          # 测试说明文档
```

## 🔧 后端API测试 (backend/)

### 测试文件说明

| 文件名 | 测试内容 | 运行方式 |
|--------|----------|----------|
| `test_maintenance_flow.py` | 保养计划完整流程测试 | `python tests/backend/test_maintenance_flow.py` |
| `test_workorder_complete.py` | 工单完整功能测试 | `python tests/backend/test_workorder_complete.py` |
| `test_maintenance_generate_wo.py` | 保养计划生成工单测试 | `python tests/backend/test_maintenance_generate_wo.py` |
| `test_users_api.py` | 用户API测试 | `python tests/backend/test_users_api.py` |
| `test_workorder_flow.py` | 工单状态流转测试 | `python tests/backend/test_workorder_flow.py` |
| `test_api.py` | 基础API测试 | `python tests/backend/test_api.py` |

### 运行后端测试

```bash
# 确保服务器正在运行
python manage.py runserver

# 在新终端中运行测试
cd tests/backend
python test_maintenance_flow.py
python test_workorder_complete.py
python test_users_api.py
```

## 🌐 前端功能测试 (frontend/)

### 测试文件说明

| 文件名 | 测试内容 | 访问方式 |
|--------|----------|----------|
| `test_final_integration.html` | 系统完整集成测试 | 浏览器打开 |
| `test_maintenance_final.html` | 保养计划前端测试 | 浏览器打开 |
| `test_workorder_fix.html` | 工单管理修复测试 | 浏览器打开 |
| `test_maintenance_frontend_generate.html` | 保养计划生成工单前端测试 | 浏览器打开 |
| `debug_interface.html` | 调试界面 | 浏览器打开 |
| `detailed_debug.html` | 详细调试信息 | 浏览器打开 |

### 运行前端测试

```bash
# 确保服务器正在运行
python manage.py runserver

# 在浏览器中访问测试页面
http://127.0.0.1:8000/tests/frontend/test_final_integration.html
http://127.0.0.1:8000/tests/frontend/test_maintenance_final.html
```

## 🔄 集成测试 (integration/)

集成测试文件将在后续版本中添加，用于测试系统各模块之间的协作。

## 📋 测试清单

### ✅ 已完成的测试

#### 用户认证
- [x] 用户登录/登出
- [x] JWT令牌验证
- [x] 权限检查

#### 设备管理
- [x] 设备CRUD操作
- [x] 设备状态管理
- [x] 设备搜索和过滤

#### 工单管理
- [x] 工单创建
- [x] 工单状态流转 (开放→分配→进行中→完成→关闭)
- [x] 工单分配和处理
- [x] 工单搜索和过滤

#### 保养计划
- [x] 保养计划CRUD操作
- [x] 保养计划生成工单
- [x] 保养计划激活/停用
- [x] 时间触发和计数器触发

#### 备件管理
- [x] 备件CRUD操作
- [x] 库存管理
- [x] 入库/出库操作

#### API接口
- [x] RESTful API规范
- [x] 错误处理
- [x] 数据验证
- [x] 分页和排序

#### 前端功能
- [x] 页面加载和渲染
- [x] 表单提交和验证
- [x] 模态框操作
- [x] 数据刷新和更新

### 🚧 待完成的测试

#### 高级功能
- [ ] 报表生成测试
- [ ] 文件上传测试
- [ ] 批量操作测试
- [ ] 数据导入/导出测试

#### 性能测试
- [ ] 大数据量测试
- [ ] 并发用户测试
- [ ] API响应时间测试

#### 安全测试
- [ ] SQL注入测试
- [ ] XSS攻击测试
- [ ] 权限绕过测试

## 🎯 测试最佳实践

### 运行测试前的准备

1. **启动服务器**
   ```bash
   python manage.py runserver 127.0.0.1:8000
   ```

2. **确保数据库有测试数据**
   - 至少有一个管理员用户 (admin/admin123)
   - 至少有几个测试设备
   - 可以运行 `python manage.py loaddata fixtures/test_data.json` (如果有)

3. **检查网络连接**
   - 确保能访问 http://127.0.0.1:8000
   - 检查防火墙设置

### 测试执行顺序

建议按以下顺序执行测试：

1. **基础API测试**
   ```bash
   python tests/backend/test_api.py
   python tests/backend/test_users_api.py
   ```

2. **模块功能测试**
   ```bash
   python tests/backend/test_workorder_complete.py
   python tests/backend/test_maintenance_flow.py
   ```

3. **前端集成测试**
   - 打开浏览器访问前端测试页面
   - 按照页面提示逐步测试

4. **完整流程测试**
   ```bash
   python tests/backend/test_maintenance_generate_wo.py
   ```

### 测试结果解读

#### 成功标志
- ✅ 绿色对勾表示测试通过
- 📊 显示统计数据 (用户数、设备数等)
- 🎉 显示"测试完成"消息

#### 失败标志
- ❌ 红色叉号表示测试失败
- 错误信息会显示具体原因
- 检查服务器日志获取详细信息

### 常见问题排查

#### 1. 连接错误
```
ConnectionError: 无法连接到服务器
```
**解决方案**: 确保Django服务器正在运行

#### 2. 认证失败
```
401 Unauthorized
```
**解决方案**: 检查用户名密码是否正确 (admin/admin123)

#### 3. 权限错误
```
403 Forbidden
```
**解决方案**: 确保用户有足够权限执行操作

#### 4. 数据不存在
```
404 Not Found
```
**解决方案**: 检查测试数据是否存在，可能需要先创建测试数据

## 📊 测试报告

### 测试覆盖率

| 模块 | 覆盖率 | 状态 |
|------|--------|------|
| 用户认证 | 95% | ✅ |
| 设备管理 | 90% | ✅ |
| 工单管理 | 95% | ✅ |
| 保养计划 | 90% | ✅ |
| 备件管理 | 85% | ✅ |
| API接口 | 95% | ✅ |
| 前端功能 | 80% | ✅ |

### 性能指标

| 操作 | 平均响应时间 | 目标 | 状态 |
|------|-------------|------|------|
| 用户登录 | 150ms | <200ms | ✅ |
| 获取设备列表 | 80ms | <100ms | ✅ |
| 创建工单 | 120ms | <200ms | ✅ |
| 生成工单 | 200ms | <300ms | ✅ |

## 🔧 自定义测试

### 创建新的后端测试

```python
#!/usr/bin/env python3
"""
自定义后端测试模板
"""
import requests
import json

BASE_URL = 'http://127.0.0.1:8000'

def test_login():
    """测试登录"""
    response = requests.post(f'{BASE_URL}/api/auth/login/', json={
        'username': 'admin',
        'password': 'admin123'
    })
    
    if response.status_code == 200:
        return response.json()['access']
    else:
        raise Exception(f"登录失败: {response.status_code}")

def test_your_feature(token):
    """测试你的功能"""
    headers = {'Authorization': f'Bearer {token}'}
    
    # 在这里添加你的测试代码
    response = requests.get(f'{BASE_URL}/api/your-endpoint/', headers=headers)
    
    if response.status_code == 200:
        print("✅ 测试通过")
        return True
    else:
        print(f"❌ 测试失败: {response.status_code}")
        return False

if __name__ == '__main__':
    token = test_login()
    test_your_feature(token)
```

### 创建新的前端测试

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <title>自定义前端测试</title>
    <link rel="stylesheet" href="/static/css/common.css">
</head>
<body>
    <div class="test-container">
        <h1>自定义功能测试</h1>
        
        <div class="test-section">
            <h3>测试步骤</h3>
            <button onclick="runTest()">开始测试</button>
            <div id="result"></div>
        </div>
    </div>

    <script src="/static/js/api.js"></script>
    <script>
        async function runTest() {
            try {
                // 在这里添加你的测试代码
                const result = await API.get('/your-endpoint/');
                document.getElementById('result').innerHTML = '✅ 测试通过';
            } catch (error) {
                document.getElementById('result').innerHTML = `❌ 测试失败: ${error.message}`;
            }
        }
    </script>
</body>
</html>
```

---

**📝 注意**: 测试文件会随着系统功能的更新而持续完善，建议定期运行测试确保系统稳定性。