#!/usr/bin/env python3
"""
测试用户API是否正常工作
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

def test_users_api(token):
    """测试用户API"""
    headers = {'Authorization': f'Bearer {token}'}
    
    print("\n👥 测试用户API...")
    
    # 测试正确的路径
    response = requests.get(f'{BASE_URL}/api/auth/users/', headers=headers)
    if response.status_code == 200:
        data = response.json()
        users = data.get('results', [])
        print(f"✅ 用户API正常: 获取到 {len(users)} 个用户")
        
        # 显示前几个用户
        for i, user in enumerate(users[:3]):
            print(f"  {i+1}. {user.get('full_name', user.get('username', 'Unknown'))} ({user.get('role', 'Unknown')})")
        
        return True
    else:
        print(f"❌ 用户API失败: {response.status_code}")
        try:
            error_data = response.json()
            print(f"   错误详情: {error_data}")
        except:
            print(f"   响应内容: {response.text}")
        return False

def test_wrong_path(token):
    """测试错误的路径（重复/api前缀）"""
    headers = {'Authorization': f'Bearer {token}'}
    
    print("\n❌ 测试错误路径（重复/api前缀）...")
    
    # 测试错误的路径
    response = requests.get(f'{BASE_URL}/api/api/auth/users/', headers=headers)
    print(f"   /api/api/auth/users/ 返回状态码: {response.status_code}")
    
    if response.status_code == 404:
        print("✅ 确认错误路径返回404，这是预期的")
    else:
        print(f"⚠️  意外的状态码: {response.status_code}")

def main():
    print("🧪 用户API测试")
    print("=" * 40)
    
    # 测试登录
    token = test_login()
    if not token:
        return
    
    # 测试正确的API
    if not test_users_api(token):
        return
    
    # 测试错误的路径
    test_wrong_path(token)
    
    print("\n🎉 测试完成！")

if __name__ == '__main__':
    main()