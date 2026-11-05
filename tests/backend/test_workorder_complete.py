#!/usr/bin/env python3
"""
完整的工单功能测试
"""
import requests
import json

BASE_URL = 'http://127.0.0.1:8000'

def test_login():
    """测试登录"""
    print("🔐 测试登录...")
    response = requests.post(f'{BASE_URL}/api/auth/login/', json={
        'username': 'admin',
        'password': 'admin123'
    })
    
    if response.status_code == 200:
        data = response.json()
        print(f"✅ 登录成功: {data['user']['username']} ({data['user']['role']})")
        return data['access']
    else:
        print(f"❌ 登录失败: {response.status_code}")
        return None

def test_workorder_dependencies(token):
    """测试工单依赖的API"""
    headers = {'Authorization': f'Bearer {token}'}
    
    print("\n📋 测试工单依赖API...")
    
    # 1. 测试用户API
    users_response = requests.get(f'{BASE_URL}/api/auth/users/', headers=headers)
    if users_response.status_code == 200:
        users_data = users_response.json()
        users_count = len(users_data.get('results', []))
        print(f"✅ 用户API: {users_count} 个用户")
    else:
        print(f"❌ 用户API失败: {users_response.status_code}")
        return False
    
    # 2. 测试设备API
    assets_response = requests.get(f'{BASE_URL}/api/assets/', headers=headers)
    if assets_response.status_code == 200:
        assets_data = assets_response.json()
        assets_count = len(assets_data.get('results', []))
        print(f"✅ 设备API: {assets_count} 个设备")
    else:
        print(f"❌ 设备API失败: {assets_response.status_code}")
        return False
    
    # 3. 测试工单API
    workorders_response = requests.get(f'{BASE_URL}/api/workorders/', headers=headers)
    if workorders_response.status_code == 200:
        workorders_data = workorders_response.json()
        workorders_count = len(workorders_data.get('results', []))
        print(f"✅ 工单API: {workorders_count} 个工单")
    else:
        print(f"❌ 工单API失败: {workorders_response.status_code}")
        return False
    
    return True, users_count, assets_count, workorders_count

def test_create_workorder(token):
    """测试创建工单"""
    headers = {'Authorization': f'Bearer {token}', 'Content-Type': 'application/json'}
    
    print("\n➕ 测试创建工单...")
    
    # 先获取一个设备ID
    assets_response = requests.get(f'{BASE_URL}/api/assets/', headers={'Authorization': f'Bearer {token}'})
    if assets_response.status_code != 200:
        print("❌ 无法获取设备列表")
        return None
    
    assets = assets_response.json().get('results', [])
    if not assets:
        print("❌ 没有可用设备")
        return None
    
    equipment_id = assets[0]['id']
    
    # 创建工单数据
    workorder_data = {
        'equipment': equipment_id,
        'wo_type': 'CM',
        'summary': 'API测试工单',
        'description': '这是一个API测试创建的工单',
        'priority': 'medium',
        'status': 'open'
    }
    
    response = requests.post(f'{BASE_URL}/api/workorders/', 
                           headers=headers, 
                           json=workorder_data)
    
    if response.status_code == 201:
        data = response.json()
        print(f"✅ 工单创建成功: {data.get('wo_code', 'Unknown')} (ID: {data.get('id')})")
        return data.get('id')
    else:
        print(f"❌ 工单创建失败: {response.status_code}")
        try:
            error_data = response.json()
            print(f"   错误详情: {error_data}")
        except:
            print(f"   响应内容: {response.text}")
        return None

def test_workorder_operations(token, workorder_id):
    """测试工单操作"""
    headers = {'Authorization': f'Bearer {token}', 'Content-Type': 'application/json'}
    
    print(f"\n⚙️ 测试工单操作 (ID: {workorder_id})...")
    
    # 1. 测试开始工单
    start_response = requests.post(f'{BASE_URL}/api/workorders/{workorder_id}/start/', headers=headers)
    if start_response.status_code == 200:
        print("✅ 工单开始成功")
    else:
        print(f"❌ 工单开始失败: {start_response.status_code}")
    
    # 2. 测试完成工单
    complete_data = {
        'actions_taken': '完成了测试维修工作',
        'root_cause': '测试原因',
        'downtime_minutes': 30,
        'labor_hours': 2.0,
        'parts_cost': 100.0
    }
    
    complete_response = requests.post(f'{BASE_URL}/api/workorders/{workorder_id}/complete/', 
                                    headers=headers, 
                                    json=complete_data)
    if complete_response.status_code == 200:
        print("✅ 工单完成成功")
    else:
        print(f"❌ 工单完成失败: {complete_response.status_code}")
    
    # 3. 测试关闭工单
    close_response = requests.post(f'{BASE_URL}/api/workorders/{workorder_id}/close/', headers=headers)
    if close_response.status_code == 200:
        print("✅ 工单关闭成功")
    else:
        print(f"❌ 工单关闭失败: {close_response.status_code}")

def cleanup_workorder(token, workorder_id):
    """清理测试工单"""
    headers = {'Authorization': f'Bearer {token}'}
    
    print(f"\n🗑️ 清理测试工单 (ID: {workorder_id})...")
    
    response = requests.delete(f'{BASE_URL}/api/workorders/{workorder_id}/', headers=headers)
    if response.status_code == 204:
        print("✅ 测试工单删除成功")
    else:
        print(f"❌ 测试工单删除失败: {response.status_code}")

def main():
    print("🧪 完整工单功能测试")
    print("=" * 50)
    
    # 测试登录
    token = test_login()
    if not token:
        return
    
    # 测试依赖API
    deps_result = test_workorder_dependencies(token)
    if not deps_result[0]:
        return
    
    users_count, assets_count, workorders_count = deps_result[1], deps_result[2], deps_result[3]
    
    # 创建测试工单
    workorder_id = test_create_workorder(token)
    if not workorder_id:
        return
    
    # 测试工单操作
    test_workorder_operations(token, workorder_id)
    
    # 清理测试数据
    cleanup_workorder(token, workorder_id)
    
    print("\n🎉 工单功能测试完成！")
    print(f"📊 系统状态: {users_count} 用户, {assets_count} 设备, {workorders_count} 工单")

if __name__ == '__main__':
    main()