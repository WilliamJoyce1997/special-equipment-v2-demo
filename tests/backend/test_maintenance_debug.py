#!/usr/bin/env python3
"""
保养计划前端功能调试测试
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

def test_maintenance_api(token):
    """测试保养计划API"""
    headers = {'Authorization': f'Bearer {token}'}
    
    print("\n📋 测试保养计划API...")
    
    # 获取保养计划列表
    response = requests.get(f'{BASE_URL}/api/maintenance/plans/', headers=headers)
    if response.status_code == 200:
        data = response.json()
        print(f"✅ 获取保养计划列表成功: {data.get('count', 0)} 个计划")
        return True
    else:
        print(f"❌ 获取保养计划列表失败: {response.status_code}")
        return False

def test_frontend_files():
    """测试前端文件是否可访问"""
    print("\n📁 测试前端文件...")
    
    files_to_test = [
        '/static/js/api.js',
        '/static/js/maintenance.js', 
        '/static/js/index.js',
        '/static/css/common.css'
    ]
    
    for file_path in files_to_test:
        response = requests.get(f'{BASE_URL}{file_path}')
        if response.status_code == 200:
            print(f"✅ {file_path}: 可访问 ({len(response.text)} 字符)")
        else:
            print(f"❌ {file_path}: 无法访问 ({response.status_code})")

def main():
    print("🧪 保养计划前端功能调试测试")
    print("=" * 50)
    
    # 测试登录
    token = test_login()
    if not token:
        return
    
    # 测试API
    if not test_maintenance_api(token):
        return
    
    # 测试前端文件
    test_frontend_files()
    
    print("\n🎉 所有测试完成！")
    print("\n💡 如果前端仍有问题，请检查浏览器控制台错误信息")

if __name__ == '__main__':
    main()