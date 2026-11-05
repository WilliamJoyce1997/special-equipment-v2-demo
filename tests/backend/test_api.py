#!/usr/bin/env python
"""
测试工单创建API
"""
import requests
import json

# 配置
BASE_URL = 'http://127.0.0.1:8000/api'
USERNAME = 'admin'
PASSWORD = 'admin123'  # 需要确认密码

def test_login():
    """测试登录"""
    url = f'{BASE_URL}/auth/login/'
    data = {
        'username': USERNAME,
        'password': PASSWORD
    }
    
    response = requests.post(url, json=data)
    print(f"登录响应: {response.status_code}")
    if response.status_code == 200:
        result = response.json()
        print(f"登录成功: {result.get('user', {}).get('username')}")
        return result.get('access')
    else:
        print(f"登录失败: {response.text}")
        return None

def test_create_workorder(token, equipment_id):
    """测试创建工单"""
    url = f'{BASE_URL}/workorders/'
    headers = {
        'Authorization': f'Bearer {token}',
        'Content-Type': 'application/json'
    }
    
    data = {
        'equipment': equipment_id,
        'wo_type': 'CM',
        'status': 'open',
        'summary': '测试工单',
        'description': '这是一个测试工单',
        'priority': 'medium'
    }
    
    response = requests.post(url, json=data, headers=headers)
    print(f"创建工单响应: {response.status_code}")
    if response.status_code == 201:
        result = response.json()
        print(f"工单创建成功: {result.get('wo_code')}")
        return result
    else:
        print(f"创建工单失败: {response.text}")
        return None

def test_get_assets(token):
    """测试获取设备列表"""
    url = f'{BASE_URL}/assets/'
    headers = {
        'Authorization': f'Bearer {token}',
        'Content-Type': 'application/json'
    }
    
    response = requests.get(url, headers=headers)
    print(f"获取设备响应: {response.status_code}")
    if response.status_code == 200:
        result = response.json()
        print(f"设备数量: {len(result.get('results', []))}")
        for asset in result.get('results', [])[:3]:  # 显示前3个
            print(f"  - {asset.get('code')}: {asset.get('name')}")
        return result.get('results', [])
    else:
        print(f"获取设备失败: {response.text}")
        return []

if __name__ == '__main__':
    print("开始测试API...")
    
    # 1. 测试登录
    token = test_login()
    if not token:
        print("登录失败，无法继续测试")
        exit(1)
    
    # 2. 测试获取设备
    assets = test_get_assets(token)
    if not assets:
        print("没有设备数据")
        exit(1)
    
    # 3. 测试创建工单
    if assets:
        equipment_id = assets[0]['id']  # 使用第一个设备的ID
        workorder = test_create_workorder(token, equipment_id)
    else:
        workorder = None
        
    if workorder:
        print("所有测试通过！")
    else:
        print("工单创建测试失败")