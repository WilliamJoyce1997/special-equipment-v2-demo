#!/usr/bin/env python
"""
测试保养计划完整流程
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

def test_get_assets(token):
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

def test_get_maintenance_plans(token):
    """获取保养计划列表"""
    url = f'{BASE_URL}/maintenance/plans/'
    headers = {'Authorization': f'Bearer {token}'}
    
    response = requests.get(url, headers=headers)
    print(f"保养计划API响应: {response.status_code}")
    if response.status_code == 200:
        result = response.json()
        plans = result.get('results', [])
        print(f"✅ 获取保养计划列表: {len(plans)} 个计划")
        return plans
    else:
        print(f"❌ 获取保养计划失败: {response.text}")
        return []

def test_create_maintenance_plan(token, equipment_id):
    """创建保养计划"""
    url = f'{BASE_URL}/maintenance/plans/'
    headers = {'Authorization': f'Bearer {token}', 'Content-Type': 'application/json'}
    
    data = {
        'code': 'MP-TEST-001',
        'equipment': equipment_id,
        'title': '测试保养计划',
        'description': '这是一个测试保养计划',
        'trigger_type': 'time',
        'frequency_value': 30,
        'frequency_unit': 'day',
        'priority': 'medium',
        'estimated_hours': 2.0,
        'estimated_cost': 100.00,
        'required_skills': '机械师',
        'checklist_template': ['检查机油', '检查皮带', '清洁滤网'],
        'is_active': True
    }
    
    response = requests.post(url, json=data, headers=headers)
    if response.status_code == 201:
        result = response.json()
        print(f"✅ 保养计划创建成功: {result.get('code')} (ID: {result.get('id')})")
        return result
    else:
        print(f"❌ 创建保养计划失败: {response.text}")
        return None

def test_update_maintenance_plan(token, plan_id):
    """更新保养计划"""
    url = f'{BASE_URL}/maintenance/plans/{plan_id}/'
    headers = {'Authorization': f'Bearer {token}', 'Content-Type': 'application/json'}
    
    data = {
        'title': '更新后的测试保养计划',
        'description': '这是一个更新后的测试保养计划',
        'frequency_value': 15,  # 改为15天
        'estimated_hours': 3.0  # 改为3小时
    }
    
    response = requests.patch(url, json=data, headers=headers)
    if response.status_code == 200:
        result = response.json()
        print(f"✅ 保养计划更新成功: {result.get('title')}")
        return result
    else:
        print(f"❌ 更新保养计划失败: {response.text}")
        return None

def test_generate_work_order(token, plan_id):
    """生成工单"""
    url = f'{BASE_URL}/maintenance/plans/{plan_id}/generate_work_order/'
    headers = {'Authorization': f'Bearer {token}', 'Content-Type': 'application/json'}
    
    response = requests.post(url, headers=headers)
    if response.status_code == 200:
        result = response.json()
        print(f"✅ 工单生成成功: {result.get('wo_code')}")
        return result
    else:
        print(f"❌ 生成工单失败: {response.text}")
        return None

def test_activate_deactivate_plan(token, plan_id):
    """测试激活/停用保养计划"""
    # 先停用
    url = f'{BASE_URL}/maintenance/plans/{plan_id}/deactivate/'
    headers = {'Authorization': f'Bearer {token}'}
    
    response = requests.post(url, headers=headers)
    if response.status_code == 200:
        print("✅ 保养计划停用成功")
    else:
        print(f"❌ 停用保养计划失败: {response.text}")
        return False
    
    time.sleep(1)
    
    # 再激活
    url = f'{BASE_URL}/maintenance/plans/{plan_id}/activate/'
    response = requests.post(url, headers=headers)
    if response.status_code == 200:
        print("✅ 保养计划激活成功")
        return True
    else:
        print(f"❌ 激活保养计划失败: {response.text}")
        return False

def test_delete_maintenance_plan(token, plan_id):
    """删除保养计划"""
    url = f'{BASE_URL}/maintenance/plans/{plan_id}/'
    headers = {'Authorization': f'Bearer {token}'}
    
    response = requests.delete(url, headers=headers)
    if response.status_code == 204:
        print("✅ 保养计划删除成功")
        return True
    else:
        print(f"❌ 删除保养计划失败: {response.text}")
        return False

def test_spare_parts_api(token):
    """测试备件API"""
    url = f'{BASE_URL}/spareparts/'
    headers = {'Authorization': f'Bearer {token}'}
    
    response = requests.get(url, headers=headers)
    print(f"备件API响应: {response.status_code}")
    if response.status_code == 200:
        result = response.json()
        parts = result.get('results', [])
        print(f"✅ 获取备件列表: {len(parts)} 个备件")
        return parts
    else:
        print(f"❌ 获取备件失败: {response.text}")
        return []

def main():
    print("🚀 开始测试保养计划完整流程...")
    print("=" * 60)
    
    # 1. 登录
    token = test_login()
    if not token:
        print("❌ 登录失败，测试终止")
        return
    
    # 2. 获取设备列表
    assets = test_get_assets(token)
    if not assets:
        print("❌ 没有设备数据，测试终止")
        return
    
    equipment_id = assets[0]['id']
    print(f"📝 使用设备: {assets[0]['code']} - {assets[0]['name']}")
    print("-" * 60)
    
    # 3. 测试保养计划API
    print("\n📋 步骤 1: 获取保养计划列表")
    existing_plans = test_get_maintenance_plans(token)
    
    # 4. 创建保养计划
    print("\n📝 步骤 2: 创建保养计划")
    plan = test_create_maintenance_plan(token, equipment_id)
    if not plan:
        return
    
    plan_id = plan['id']
    time.sleep(1)
    
    # 5. 更新保养计划
    print("\n✏️ 步骤 3: 更新保养计划")
    updated_plan = test_update_maintenance_plan(token, plan_id)
    if not updated_plan:
        return
    time.sleep(1)
    
    # 6. 生成工单
    print("\n🔧 步骤 4: 生成工单")
    work_order = test_generate_work_order(token, plan_id)
    time.sleep(1)
    
    # 7. 测试激活/停用
    print("\n🔄 步骤 5: 测试激活/停用")
    activate_result = test_activate_deactivate_plan(token, plan_id)
    time.sleep(1)
    
    # 8. 测试备件API
    print("\n📦 步骤 6: 测试备件API")
    spare_parts = test_spare_parts_api(token)
    
    # 9. 删除测试数据
    print("\n🗑️ 步骤 7: 清理测试数据")
    delete_result = test_delete_maintenance_plan(token, plan_id)
    
    print("\n🎉 保养计划流程测试完成！")
    print("测试流程: 获取列表 → 创建计划 → 更新计划 → 生成工单 → 激活/停用 → 删除计划")

if __name__ == '__main__':
    main()