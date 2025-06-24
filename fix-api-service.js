// 在浏览器控制台中运行这个脚本来修复API服务问题

console.log('🔧 开始修复API服务问题...');

// 1. 清除可能导致问题的本地存储
function clearProblematicStorage() {
    console.log('📝 清除可能有问题的本地存储...');
    
    // 清除强制本地模式设置
    localStorage.removeItem('diary_force_local');
    
    // 清除可能损坏的Mock数据
    const mockData = localStorage.getItem('diary_app_data');
    if (mockData) {
        try {
            const data = JSON.parse(mockData);
            console.log(`发现本地Mock数据: ${data.length} 条日记`);
            
            // 备份数据
            localStorage.setItem('diary_app_data_backup', mockData);
            console.log('✅ 已备份Mock数据到 diary_app_data_backup');
            
            // 清除原数据
            localStorage.removeItem('diary_app_data');
            console.log('✅ 已清除可能有问题的Mock数据');
        } catch (error) {
            console.log('❌ Mock数据格式错误，直接清除');
            localStorage.removeItem('diary_app_data');
        }
    }
    
    console.log('✅ 本地存储清理完成');
}

// 2. 测试API连接
async function testApiConnection() {
    console.log('🌐 测试API连接...');
    
    try {
        const response = await fetch('/api/entries');
        const result = await response.json();
        
        if (response.ok && result.success) {
            console.log(`✅ API连接正常，找到 ${result.data?.length || 0} 条日记`);
            return true;
        } else {
            console.log(`❌ API响应异常: ${result.error || '未知错误'}`);
            console.log('响应详情:', result);
            return false;
        }
    } catch (error) {
        console.log(`❌ API连接失败: ${error.message}`);
        return false;
    }
}

// 3. 测试创建功能
async function testCreateFunction() {
    console.log('📝 测试创建功能...');
    
    const testEntry = {
        title: `修复测试日记 ${new Date().toLocaleString()}`,
        content: '这是一个用于测试API修复的日记',
        content_type: 'markdown',
        mood: 'neutral',
        weather: 'unknown',
        tags: ['测试', '修复'],
        images: [],
        hidden: false
    };
    
    try {
        const response = await fetch('/api/entries', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(testEntry)
        });
        
        const result = await response.json();
        
        if (result.success) {
            console.log(`✅ 创建功能正常，新日记ID: ${result.data.id}`);
            return result.data.id;
        } else {
            console.log(`❌ 创建功能异常: ${result.error}`);
            return null;
        }
    } catch (error) {
        console.log(`❌ 创建请求失败: ${error.message}`);
        return null;
    }
}

// 4. 测试更新功能
async function testUpdateFunction(entryId) {
    if (!entryId) {
        console.log('⏭️ 跳过更新测试（没有可用的日记ID）');
        return false;
    }
    
    console.log(`🔄 测试更新功能 (ID: ${entryId})...`);
    
    try {
        const updateData = {
            title: `修复测试日记 [已更新 ${new Date().toLocaleTimeString()}]`
        };
        
        const response = await fetch(`/api/entries/${entryId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updateData)
        });
        
        const result = await response.json();
        
        if (result.success) {
            console.log('✅ 更新功能正常');
            return true;
        } else {
            console.log(`❌ 更新功能异常: ${result.error}`);
            return false;
        }
    } catch (error) {
        console.log(`❌ 更新请求失败: ${error.message}`);
        return false;
    }
}

// 5. 检查数据库状态
async function checkDatabaseStatus() {
    console.log('🗄️ 检查数据库状态...');
    
    try {
        const response = await fetch('/api/entries');
        const result = await response.json();
        
        if (result.success) {
            const entries = result.data || [];
            console.log(`📊 数据库状态: ${entries.length} 条日记`);
            
            if (entries.length === 0) {
                console.log('⚠️ 数据库为空，这可能是问题的根源');
                console.log('💡 建议: 尝试创建一些日记来初始化数据库');
            } else {
                console.log('📋 日记列表:');
                entries.slice(0, 5).forEach((entry, index) => {
                    console.log(`  ${index + 1}. ID: ${entry.id}, 标题: "${entry.title || '无标题'}"`);
                });
                if (entries.length > 5) {
                    console.log(`  ... 还有 ${entries.length - 5} 条日记`);
                }
            }
            return entries.length;
        } else {
            console.log(`❌ 数据库查询失败: ${result.error}`);
            return -1;
        }
    } catch (error) {
        console.log(`❌ 数据库检查失败: ${error.message}`);
        return -1;
    }
}

// 6. 主修复流程
async function runFix() {
    console.log('🚀 开始执行修复流程...\n');
    
    // 步骤1: 清理本地存储
    clearProblematicStorage();
    console.log('');
    
    // 步骤2: 测试API连接
    const apiWorking = await testApiConnection();
    console.log('');
    
    if (!apiWorking) {
        console.log('❌ API连接失败，无法继续修复');
        console.log('💡 建议检查:');
        console.log('  1. 网络连接是否正常');
        console.log('  2. Cloudflare Pages 部署是否成功');
        console.log('  3. 数据库配置是否正确');
        return;
    }
    
    // 步骤3: 检查数据库状态
    const entryCount = await checkDatabaseStatus();
    console.log('');
    
    // 步骤4: 测试创建功能
    const newEntryId = await testCreateFunction();
    console.log('');
    
    // 步骤5: 测试更新功能
    const updateWorking = await testUpdateFunction(newEntryId);
    console.log('');
    
    // 总结
    console.log('📋 修复结果总结:');
    console.log(`  API连接: ${apiWorking ? '✅ 正常' : '❌ 异常'}`);
    console.log(`  数据库: ${entryCount >= 0 ? `✅ 正常 (${entryCount} 条日记)` : '❌ 异常'}`);
    console.log(`  创建功能: ${newEntryId ? '✅ 正常' : '❌ 异常'}`);
    console.log(`  更新功能: ${updateWorking ? '✅ 正常' : '❌ 异常'}`);
    
    if (apiWorking && entryCount >= 0 && newEntryId && updateWorking) {
        console.log('\n🎉 所有功能正常！问题已修复');
        console.log('💡 建议刷新页面以确保更改生效');
    } else {
        console.log('\n⚠️ 仍有问题需要解决');
        console.log('💡 建议联系技术支持或查看详细错误日志');
    }
}

// 执行修复
runFix().catch(error => {
    console.error('❌ 修复过程中发生错误:', error);
});

// 导出一些有用的函数供手动调用
window.diaryDebug = {
    clearStorage: clearProblematicStorage,
    testApi: testApiConnection,
    testCreate: testCreateFunction,
    testUpdate: testUpdateFunction,
    checkDb: checkDatabaseStatus,
    runFix: runFix
};

console.log('\n💡 修复脚本已加载，你也可以手动调用:');
console.log('  window.diaryDebug.runFix() - 重新运行完整修复');
console.log('  window.diaryDebug.testApi() - 仅测试API连接');
console.log('  window.diaryDebug.checkDb() - 仅检查数据库状态');
console.log('  window.diaryDebug.clearStorage() - 仅清理本地存储');
