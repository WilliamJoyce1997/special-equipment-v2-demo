#!/usr/bin/env python3
"""
测试保养计划生成工单功能
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

def get_maintenance_plans(token):
    """获取保养计划列表"""
    headers = {'Authorization': f'Bearer {token}'}
    
    print("\n📋 获取保养计划列表...")
    response = requests.get(f'{BASE_URL}/api/maintenance/plans/', headers=headers)
    
    if response.status_code == 200:
        data = response.json()
        plans = data.get('results', [])
        print(f"✅ 获取到 {len(plans)} 个保养计划")
        
        for plan in plans:
            print(f"  - {plan['code']}: {plan['title']} (状态: {'启用' if plan['is_active'] else '停用'})")
        
        return plans
    else:
        print(f"❌ 获取保养计划失败: {response.status_code}")
        return []

def test_generate_work_order(token, plan_id, plan_code):
    """测试生成工单"""
    headers = {'Authorization': f'Bearer {token}'}
    
    print(f"\n🔧 测试生成工单 (计划ID: {plan_id}, 编号: {plan_code})...")
    
    response = requests.post(f'{BASE_URL}/api/maintenance/plans/{plan_id}/generate_work_order/', 
                           headers=headers)
    
    if response.status_code == 200:
        data = response.json()
        print(f"✅ 工单生成成功!")
        print(f"   工单编号: {data.get('wo_code', 'Unknown')}")
        print(f"   工单ID: {data.get('work_order_id', 'Unknown')}")
        print(f"   消息: {data.get('message', 'No message')}")
        return data.get('work_order_id')
    else:
        print(f"❌ 工单生成失败: {response.status_code}")
        try:
            error_data = response.json()
            print(f"   错误详情: {error_data}")
        except:
            print(f"   响应内容: {response.text}")
        return None

def verify_work_order(token, wo_id):
    """验证生成的工单"""
    if not wo_id:
        return
    
    headers = {'Authorization': f'Bearer {token}'}
    
    print(f"\n✅ 验证生成的工单 (ID: {wo_id})...")
    
    response = requests.get(f'{BASE_URL}/api/workorders/{wo_id}/', headers=headers)
    
    if response.status_code == 200:
        data = response.json()
        print(f"✅ 工单验证成功!")
        print(f"   工单编号: {data.get('wo_code', 'Unknown')}")
        print(f"   摘要: {data.get('summary', 'Unknown')}")
        print(f"   状态: {data.get('status', 'Unknown')}")
        print(f"   类型: {data.get('wo_type', 'Unknown')}")
        print(f"   设备: {data.get('equipment_name', 'Unknown')}")
        return True
    else:
        print(f"❌ 工单验证失败: {response.status_code}")
        return False

def create_test_plan(token):
    """创建测试保养计划"""
    headers = {'Authorization': f'Bearer {token}', 'Content-Type': 'application/json'}
    
    print("\n➕ 创建测试保养计划...")
    
    # 先获取设备列表
    assets_response = requests.get(f'{BASE_URL}/api/assets/', headers={'Authorization': f'Bearer {token}'})
    if assets_response.status_code != 200:
        print("❌ 无法获取设备列表")
        return None
    
    assets = assets_response.json().get('results', [])
    if not assets:
        print("❌ 没有可用设备")
        return None
    
    # 创建保养计划
    plan_data = {
        'code': f'TEST-PLAN-{int(__import__("time").time())}',
        'equipment': assets[0]['id'],
        'title': '测试保养计划-生成工单',
        'description': '这是一个用于测试生成工单功能的保养计划',
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
    
    response = requests.post(f'{BASE_URL}/api/maintenance/plans/', 
                           headers=headers, 
                           json=plan_data)
    
    if response.status_code == 201:
        data = response.json()
        print(f"✅ 测试保养计划创建成功: {data['code']} (ID: {data['id']})")
        return data
    else:
        print(f"❌ 测试保养计划创建失败: {response.status_code}")
        try:
            error_data = response.json()
            print(f"   错误详情: {error_data}")
        except:
            print(f"   响应内容: {response.text}")
        return None

def cleanup_test_plan(token, plan_id):
    """清理测试保养计划"""
    headers = {'Authorization': f'Bearer {token}'}
    
    print(f"\n🗑️ 清理测试保养计划 (ID: {plan_id})...")
    
    response = requests.delete(f'{BASE_URL}/api/maintenance/plans/{plan_id}/', headers=headers)
    
    if response.status_code == 204:
        print("✅ 测试保养计划删除成功")
    else:
        print(f"❌ 测试保养计划删除失败: {response.status_code}")

def main():
    print("🧪 保养计划生成工单功能测试")
    print("=" * 50)
    
    # 测试登录
    token = test_login()
    if not token:
        return
    
    # 获取现有保养计划
    existing_plans = get_maintenance_plans(token)
    
    # 创建测试保养计划
    test_plan = create_test_plan(token)
    if not test_plan:
        return
    
    try:
        # 测试生成工单
        wo_id = test_generate_work_order(token, test_plan['id'], test_plan['code'])
        
        # 验证生成的工单
        verify_work_order(token, wo_id)
        
    finally:
        # 清理测试数据
        cleanup_test_plan(token, test_plan['id'])
    
    print("\n🎉 测试完成！")

if __name__ == '__main__':
    main()