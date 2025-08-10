# -*- coding: utf-8 -*-
import requests
import json

def test_stats_api(domain, api_key=None):
    """测试日记统计API"""
    url = f"https://{domain}/api/stats"
    
    headers = {'Accept': 'application/json'}
    if api_key:
        headers['X-API-Key'] = api_key
    
    try:
        print(f"🧪 测试API: {url}")
        if api_key:
            print(f"🔑 使用API密钥: {api_key[:8]}...")
        
        response = requests.get(url, headers=headers, timeout=10)
        
        print(f"📡 状态码: {response.status_code}")
        print(f"⏱️  响应时间: {response.elapsed.total_seconds():.2f}秒")
        
        if response.headers.get('content-type', '').startswith('application/json'):
            data = response.json()
            print("📊 响应数据:")
            print(json.dumps(data, indent=2, ensure_ascii=False))
            
            if data.get('success') and 'data' in data:
                stats = data['data']
                print("\n✨ 统计摘要:")
                print(f"   连续记录: {stats.get('consecutive_days', 0)} 天")
                print(f"   总记录天数: {stats.get('total_days_with_entries', 0)} 天")
                print(f"   日记总数: {stats.get('total_entries', 0)} 篇")
                if stats.get('latest_entry_date'):
                    print(f"   最近记录: {stats['latest_entry_date']}")
        else:
            print("📄 响应内容:")
            print(response.text)
            
    except requests.RequestException as e:
        print(f"❌ 请求失败: {e}")

if __name__ == "__main__":
    # 配置域名和API密钥
    domain = input("请输入域名 (例如: your-domain.pages.dev): ").strip()
    api_key = input("请输入API密钥 (可选，直接回车跳过): ").strip()
    
    if not domain:
        print("❌ 域名不能为空")
        exit(1)
    
    # 移除协议前缀
    domain = domain.replace('https://', '').replace('http://', '')
    
    # 测试API
    test_stats_api(domain, api_key if api_key else None)
