#!/usr/bin/env python
"""
测试完整的工单状态流程
"""
import requests
import json
import time

# 配置
BASE_URL = 'http://127.0.0.1:8000/api'
USERNAME = 'admin'
PASSWORD = 'admin123'

def test_login():
    """测试登录"""
    url = f'{BASE_URL}/auth/login/'
    data = {'username': USERNAME, 'password': PASSWORD}
    
    response = requests.post(url, json=data)
    if response.status_code == 200:
        result = response.json()
        print(f"✅ 登录成功: {result.get('user', {}).get('username')}")
        return result.get('access')
    else:
        print(f"❌ 登录失败: {response.text}")
        return None

def get_assets(token):
    """获取设备列表"""
    url = f'{BASE_URL}/assets/'
    headers = {'Authorization': f'Bearer {token}'}
    
    response = requests.get(url, headers=headers)
    if response.status_code == 200:
        result = response.json()
        assets = result.get('results', [])
        print(f"✅ 获取设备列表: {len(assets)} 个设备")
        return assets
    else:
        print(f"❌ 获取设备失败: {response.text}")
        return []

def get_users(token):
    """获取用户列表"""
    url = f'{BASE_URL}/auth/users/'
    headers = {'Authorization': f'Bearer {token}'}
    
    response = requests.get(url, headers=headers)
    if response.status_code == 200:
        result = response.json()
        users = result.get('results', [])
        print(f"✅ 获取用户列表: {len(users)} 个用户")
        return users
    else:
        print(f"❌ 获取用户失败: {response.text}")
        return []

def create_workorder(token, equipment_id):
    """创建工单"""
    url = f'{BASE_URL}/workorders/'
    headers = {'Authorization': f'Bearer {token}', 'Content-Type': 'application/json'}
    
    data = {
        'equipment': equipment_id,
        'wo_type': 'CM',
        'status': 'open',
        'summary': '测试工单状态流程',
        'description': '这是一个用于测试完整状态流程的工单',
        'priority': 'medium'
    }
    
    response = requests.post(url, json=data, headers=headers)
    if response.status_code == 201:
        result = response.json()
        print(f"✅ 工单创建成功: {result.get('wo_code')} (ID: {result.get('id')})")
        return result
    else:
        print(f"❌ 创建工单失败: {response.text}")
        return None

def assign_workorder(token, wo_id, assignee_id):
    """分配工单"""
    url = f'{BASE_URL}/workorders/{wo_id}/assign/'
    headers = {'Authorization': f'Bearer {token}', 'Content-Type': 'application/json'}
    
    data = {'assignee_id': assignee_id}
    
    response = requests.post(url, json=data, headers=headers)
    if response.status_code == 200:
        result = response.json()
        print(f"✅ 工单分配成功: 状态 = {result.get('status')}")
        return result
    else:
        print(f"❌ 分配工单失败: {response.text}")
        return None

def start_workorder(token, wo_id):
    """开始工单"""
    url = f'{BASE_URL}/workorders/{wo_id}/start/'
    headers = {'Authorization': f'Bearer {token}'}
    
    response = requests.post(url, headers=headers)
    if response.status_code == 200:
        result = response.json()
        print(f"✅ 工单开始成功: 状态 = {result.get('status')}")
        return result
    else:
        print(f"❌ 开始工单失败: {response.text}")
        return None

def complete_workorder(token, wo_id):
    """完成工单"""
    url = f'{BASE_URL}/workorders/{wo_id}/complete/'
    headers = {'Authorization': f'Bearer {token}', 'Content-Type': 'application/json'}
    
    data = {
        'actions_taken': '更换了损坏的零件，清洁了设备，进行了功能测试',
        'root_cause': '零件老化导致的故障',
        'downtime_minutes': 30,
        'labor_hours': 2.5,
        'parts_cost': 150.00,
        'notes': '工单完成，设备恢复正常运行'
    }
    
    response = requests.post(url, json=data, headers=headers)
    if response.status_code == 200:
        result = response.json()
        print(f"✅ 工单完成成功: 状态 = {result.get('status')}")
        return result
    else:
        print(f"❌ 完成工单失败: {response.text}")
        return None

def close_workorder(token, wo_id):
    """关闭工单"""
    url = f'{BASE_URL}/workorders/{wo_id}/close/'
    headers = {'Authorization': f'Bearer {token}'}
    
    response = requests.post(url, headers=headers)
    if response.status_code == 200:
        result = response.json()
        print(f"✅ 工单关闭成功: 状态 = {result.get('status')}")
        return result
    else:
        print(f"❌ 关闭工单失败: {response.text}")
        return None

def get_workorder_details(token, wo_id):
    """获取工单详情"""
    url = f'{BASE_URL}/workorders/{wo_id}/'
    headers = {'Authorization': f'Bearer {token}'}
    
    response = requests.get(url, headers=headers)
    if response.status_code == 200:
        result = response.json()
        print(f"📋 工单详情:")
        print(f"   编号: {result.get('wo_code')}")
        print(f"   状态: {result.get('status')} ({result.get('status_display')})")
        print(f"   负责人: {result.get('assignee_name', '未分配')}")
        print(f"   实际开始: {result.get('actual_start', '未开始')}")
        print(f"   实际结束: {result.get('actual_end', '未结束')}")
        print(f"   处理措施: {result.get('actions_taken', '无')}")
        print(f"   总成本: {result.get('total_cost', 0)}")
        return result
    else:
        print(f"❌ 获取工单详情失败: {response.text}")
        return None

def main():
    print("🚀 开始测试工单状态流程...")
    print("=" * 50)
    
    # 1. 登录
    token = test_login()
    if not token:
        print("❌ 登录失败，测试终止")
        return
    
    # 2. 获取设备和用户
    assets = get_assets(token)
    users = get_users(token)
    
    if not assets or not users:
        print("❌ 缺少必要数据，测试终止")
        return
    
    equipment_id = assets[0]['id']
    assignee_id = users[0]['id']  # 使用第一个用户作为负责人
    
    print(f"📝 使用设备: {assets[0]['code']} - {assets[0]['name']}")
    print(f"👤 负责人: {users[0]['username']}")
    print("-" * 50)
    
    # 3. 创建工单 (open)
    print("\n📝 步骤 1: 创建工单")
    workorder = create_workorder(token, equipment_id)
    if not workorder:
        return
    
    wo_id = workorder['id']
    time.sleep(1)
    
    # 4. 分配工单 (assigned)
    print("\n👤 步骤 2: 分配工单")
    assign_result = assign_workorder(token, wo_id, assignee_id)
    if not assign_result:
        return
    time.sleep(1)
    
    # 5. 开始工单 (in_progress)
    print("\n🚀 步骤 3: 开始工单")
    start_result = start_workorder(token, wo_id)
    if not start_result:
        return
    time.sleep(1)
    
    # 6. 完成工单 (completed)
    print("\n✅ 步骤 4: 完成工单")
    complete_result = complete_workorder(token, wo_id)
    if not complete_result:
        return
    time.sleep(1)
    
    # 7. 关闭工单 (closed)
    print("\n🔒 步骤 5: 关闭工单")
    close_result = close_workorder(token, wo_id)
    if not close_result:
        return
    
    # 8. 查看最终状态
    print("\n📋 最终工单状态:")
    print("-" * 30)
    get_workorder_details(token, wo_id)
    
    print("\n🎉 工单状态流程测试完成！")
    print("状态流程: open → assigned → in_progress → completed → closed")

if __name__ == '__main__':
    main()