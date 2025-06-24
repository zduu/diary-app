// 简单的测试脚本来验证更新功能
// 使用方法: node test-update.js

const API_BASE = 'https://your-app-domain.pages.dev/api'; // 替换为你的实际域名

async function testUpdateEntry() {
  try {
    console.log('开始测试更新功能...');
    
    // 1. 首先获取所有日记
    console.log('1. 获取所有日记...');
    const entriesResponse = await fetch(`${API_BASE}/entries`);
    const entriesResult = await entriesResponse.json();
    
    if (!entriesResult.success || !entriesResult.data || entriesResult.data.length === 0) {
      console.log('没有找到日记条目，无法测试');
      return;
    }
    
    const firstEntry = entriesResult.data[0];
    console.log(`找到日记: ID=${firstEntry.id}, 标题="${firstEntry.title}"`);
    
    // 2. 测试隐藏功能（只更新 hidden 字段）
    console.log('2. 测试隐藏功能...');
    const hideResponse = await fetch(`${API_BASE}/entries/${firstEntry.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        hidden: !firstEntry.hidden
      })
    });
    
    const hideResult = await hideResponse.json();
    console.log('隐藏功能测试结果:', hideResult);
    
    if (hideResult.success) {
      console.log('✅ 隐藏功能测试成功');
      
      // 3. 恢复原状态
      console.log('3. 恢复原状态...');
      const restoreResponse = await fetch(`${API_BASE}/entries/${firstEntry.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          hidden: firstEntry.hidden
        })
      });
      
      const restoreResult = await restoreResponse.json();
      console.log('恢复状态结果:', restoreResult);
      
      if (restoreResult.success) {
        console.log('✅ 恢复状态成功');
      } else {
        console.log('❌ 恢复状态失败:', restoreResult.error);
      }
    } else {
      console.log('❌ 隐藏功能测试失败:', hideResult.error);
    }
    
    // 4. 测试编辑功能（更新标题）
    console.log('4. 测试编辑功能...');
    const originalTitle = firstEntry.title;
    const testTitle = originalTitle + ' [测试修改]';
    
    const editResponse = await fetch(`${API_BASE}/entries/${firstEntry.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title: testTitle
      })
    });
    
    const editResult = await editResponse.json();
    console.log('编辑功能测试结果:', editResult);
    
    if (editResult.success) {
      console.log('✅ 编辑功能测试成功');
      
      // 5. 恢复原标题
      console.log('5. 恢复原标题...');
      const restoreTitleResponse = await fetch(`${API_BASE}/entries/${firstEntry.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: originalTitle
        })
      });
      
      const restoreTitleResult = await restoreTitleResponse.json();
      console.log('恢复标题结果:', restoreTitleResult);
      
      if (restoreTitleResult.success) {
        console.log('✅ 恢复标题成功');
      } else {
        console.log('❌ 恢复标题失败:', restoreTitleResult.error);
      }
    } else {
      console.log('❌ 编辑功能测试失败:', editResult.error);
    }
    
    console.log('测试完成！');
    
  } catch (error) {
    console.error('测试过程中发生错误:', error);
  }
}

// 运行测试
testUpdateEntry();
