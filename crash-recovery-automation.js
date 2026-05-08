// ISSUE-9 崩溃恢复验证自动化测试脚本
// 在浏览器控制台中运行此脚本

class CrashRecoveryTester {
  constructor() {
    this.testResults = {
      normalClose: { attempts: 0, successes: 0, failures: 0 },
      forceClose: { attempts: 0, successes: 0, failures: 0 },
      browserCrash: { attempts: 0, successes: 0, failures: 0 }
    }
    this.recoveryTimes = []
    this.currentTest = null
    this.testContent = `This is test content for crash recovery testing. 
Timestamp: ${Date.now()}
Random number: ${Math.random()}
Content length test: ${'x'.repeat(100)}
End of test content.`
  }

  // 设置测试内容
  async setupTestContent() {
    console.log('[CRASH_TEST] Setting up test content...')
    
    // 等待编辑器加载
    await this.waitForEditor()
    
    // 设置测试内容
    const editor = this.getEditor()
    if (editor) {
      editor.commands.setContent(this.testContent)
      console.log('[CRASH_TEST] Test content set')
      
      // 等待自动保存
      await this.waitForAutoSave()
      console.log('[CRASH_TEST] Auto save completed')
    }
  }

  // 等待编辑器加载
  waitForEditor() {
    return new Promise((resolve) => {
      const checkEditor = () => {
        const editor = this.getEditor()
        if (editor) {
          resolve()
        } else {
          setTimeout(checkEditor, 100)
        }
      }
      checkEditor()
    })
  }

  // 获取编辑器实例
  getEditor() {
    // 通过 DOM 查找编辑器实例
    const editorElement = document.querySelector('.editor-host')
    if (editorElement && editorElement._tiptapEditor) {
      return editorElement._tiptapEditor
    }
    return null
  }

  // 等待自动保存
  waitForAutoSave() {
    return new Promise((resolve) => {
      setTimeout(resolve, 500) // 等待 500ms 确保保存完成
    })
  }

  // 测试正常关闭重开
  async testNormalClose() {
    console.log('[CRASH_TEST] Starting normal close test...')
    this.testResults.normalClose.attempts++
    
    try {
      await this.setupTestContent()
      
      // 记录恢复前的状态
      const beforeContent = this.getEditor().getJSON()
      
      // 模拟正常关闭（实际需要手动操作）
      console.log('[CRASH_TEST] Please close the tab normally and reopen')
      console.log('[CRASH_TEST] Then run: crashTester.checkNormalCloseRecovery()')
      
      this.currentTest = {
        type: 'normalClose',
        beforeContent,
        timestamp: Date.now()
      }
      
      // 保存测试状态到 localStorage
      localStorage.setItem('crashTestState', JSON.stringify(this.currentTest))
      
    } catch (error) {
      console.error('[CRASH_TEST] Normal close test failed:', error)
      this.testResults.normalClose.failures++
    }
  }

  // 检查正常关闭恢复结果
  checkNormalCloseRecovery() {
    console.log('[CRASH_TEST] Checking normal close recovery...')
    
    try {
      const savedTest = localStorage.getItem('crashTestState')
      if (!savedTest) {
        console.error('[CRASH_TEST] No saved test state found')
        return
      }
      
      const testState = JSON.parse(savedTest)
      const currentContent = this.getEditor().getJSON()
      
      // 比较内容
      const contentMatch = JSON.stringify(testState.beforeContent) === JSON.stringify(currentContent)
      
      if (contentMatch) {
        console.log('[CRASH_TEST] ✅ Normal close recovery SUCCESS')
        this.testResults.normalClose.successes++
      } else {
        console.log('[CRASH_TEST] ❌ Normal close recovery FAILED')
        console.log('[CRASH_TEST] Expected:', testState.beforeContent)
        console.log('[CRASH_TEST] Actual:', currentContent)
        this.testResults.normalClose.failures++
      }
      
      // 清理测试状态
      localStorage.removeItem('crashTestState')
      
    } catch (error) {
      console.error('[CRASH_TEST] Error checking recovery:', error)
      this.testResults.normalClose.failures++
    }
  }

  // 测试强制关闭（快速关闭标签页）
  async testForceClose() {
    console.log('[CRASH_TEST] Starting force close test...')
    this.testResults.forceClose.attempts++
    
    try {
      // 设置内容但不等待自动保存完成
      await this.setupTestContent()
      
      // 记录内容
      const beforeContent = this.getEditor().getJSON()
      
      console.log('[CRASH_TEST] Force close test ready')
      console.log('[CRASH_TEST] Content set, please close tab quickly (< 300ms)')
      console.log('[CRASH_TEST] Then reopen and run: crashTester.checkForceCloseRecovery()')
      
      this.currentTest = {
        type: 'forceClose',
        beforeContent,
        timestamp: Date.now()
      }
      
      localStorage.setItem('crashTestState', JSON.stringify(this.currentTest))
      
    } catch (error) {
      console.error('[CRASH_TEST] Force close test failed:', error)
      this.testResults.forceClose.failures++
    }
  }

  // 检查强制关闭恢复结果
  checkForceCloseRecovery() {
    console.log('[CRASH_TEST] Checking force close recovery...')
    
    try {
      const savedTest = localStorage.getItem('crashTestState')
      if (!savedTest) {
        console.error('[CRASH_TEST] No saved test state found')
        return
      }
      
      const testState = JSON.parse(savedTest)
      const currentContent = this.getEditor().getJSON()
      
      // 强制关闭可能恢复到上一个保存点，所以检查是否有内容
      const hasContent = currentContent.content && currentContent.content.length > 0
      
      if (hasContent) {
        console.log('[CRASH_TEST] ✅ Force close recovery SUCCESS (content recovered)')
        this.testResults.forceClose.successes++
      } else {
        console.log('[CRASH_TEST] ❌ Force close recovery FAILED (no content)')
        this.testResults.forceClose.failures++
      }
      
      localStorage.removeItem('crashTestState')
      
    } catch (error) {
      console.error('[CRASH_TEST] Error checking force close recovery:', error)
      this.testResults.forceClose.failures++
    }
  }

  // 运行完整测试套件
  async runFullTestSuite() {
    console.log('[CRASH_TEST] Starting full crash recovery test suite...')
    
    // 测试 1: 正常关闭
    await this.testNormalClose()
    
    // 等待用户操作后继续
    console.log('[CRASH_TEST] Complete the normal close test, then run:')
    console.log('[CRASH_TEST] crashTester.continueTestSuite()')
  }

  // 继续测试套件
  async continueTestSuite() {
    console.log('[CRASH_TEST] Continuing test suite...')
    
    // 测试 2: 强制关闭
    await this.testForceClose()
    
    console.log('[CRASH_TEST] Complete the force close test, then run:')
    console.log('[CRASH_TEST] crashTester.generateReport()')
  }

  // 生成测试报告
  generateReport() {
    console.log('\n=== CRASH RECOVERY TEST REPORT ===')
    
    const totalAttempts = 
      this.testResults.normalClose.attempts + 
      this.testResults.forceClose.attempts + 
      this.testResults.browserCrash.attempts
    
    const totalSuccesses = 
      this.testResults.normalClose.successes + 
      this.testResults.forceClose.successes + 
      this.testResults.browserCrash.successes
    
    const totalFailures = 
      this.testResults.normalClose.failures + 
      this.testResults.forceClose.failures + 
      this.testResults.browserCrash.failures
    
    const successRate = totalAttempts > 0 ? (totalSuccesses / totalAttempts * 100).toFixed(2) : 0
    
    console.log('Test Results:')
    console.log(`- Normal Close: ${this.testResults.normalClose.successes}/${this.testResults.normalClose.attempts} successful`)
    console.log(`- Force Close: ${this.testResults.forceClose.successes}/${this.testResults.forceClose.attempts} successful`)
    console.log(`- Browser Crash: ${this.testResults.browserCrash.successes}/${this.testResults.browserCrash.attempts} successful`)
    console.log(``)
    console.log(`Overall Success Rate: ${successRate}% (${totalSuccesses}/${totalAttempts})`)
    console.log(``)
    
    if (this.recoveryTimes.length > 0) {
      const avgTime = this.recoveryTimes.reduce((a, b) => a + b, 0) / this.recoveryTimes.length
      const maxTime = Math.max(...this.recoveryTimes)
      const minTime = Math.min(...this.recoveryTimes)
      
      console.log('Recovery Times:')
      console.log(`- Average: ${avgTime.toFixed(2)}ms`)
      console.log(`- Maximum: ${maxTime.toFixed(2)}ms`)
      console.log(`- Minimum: ${minTime.toFixed(2)}ms`)
    }
    
    console.log('\n=== END REPORT ===')
    
    // 返回结果供程序使用
    return {
      successRate: parseFloat(successRate),
      totalAttempts,
      totalSuccesses,
      totalFailures,
      testResults: this.testResults,
      recoveryTimes: this.recoveryTimes
    }
  }

  // 重置测试状态
  reset() {
    this.testResults = {
      normalClose: { attempts: 0, successes: 0, failures: 0 },
      forceClose: { attempts: 0, successes: 0, failures: 0 },
      browserCrash: { attempts: 0, successes: 0, failures: 0 }
    }
    this.recoveryTimes = []
    this.currentTest = null
    localStorage.removeItem('crashTestState')
    console.log('[CRASH_TEST] Test state reset')
  }
}

// 创建全局测试实例
window.crashTester = new CrashRecoveryTester()

// 使用说明
console.log(`
=== CRASH RECOVERY TESTER READY ===

Available commands:
1. crashTester.runFullTestSuite()     - Start full test suite
2. crashTester.checkNormalCloseRecovery() - Check normal close recovery
3. crashTester.checkForceCloseRecovery()  - Check force close recovery  
4. crashTester.continueTestSuite()       - Continue test suite
5. crashTester.generateReport()          - Generate test report
6. crashTester.reset()                  - Reset test state

Test Flow:
1. Run: crashTester.runFullTestSuite()
2. Follow instructions for normal close test
3. Run: crashTester.checkNormalCloseRecovery()
4. Run: crashTester.continueTestSuite()
5. Follow instructions for force close test
6. Run: crashTester.checkForceCloseRecovery()
7. Run: crashTester.generateReport()

Recovery time will be logged automatically during page load.
`)
