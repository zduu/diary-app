/**
 * Cloudflare D1 数据库一致性工具函数
 * 
 * D1是分布式数据库，写操作可能需要时间同步到所有边缘节点
 * 这些工具函数帮助处理一致性问题
 */

export interface RetryOptions {
  maxRetries?: number;
  baseDelay?: number;
  maxDelay?: number;
  backoffFactor?: number;
}

/**
 * 带重试的异步操作
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxRetries = 3,
    baseDelay = 100,
    maxDelay = 2000,
    backoffFactor = 2
  } = options;

  let lastError: Error;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      if (attempt === maxRetries) {
        break;
      }
      
      // 计算延迟时间（指数退避）
      const delay = Math.min(baseDelay * Math.pow(backoffFactor, attempt), maxDelay);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError!;
}

/**
 * 验证删除操作是否成功
 */
export async function verifyDeletion(
  checkFunction: () => Promise<boolean>,
  options: RetryOptions = {}
): Promise<boolean> {
  const {
    maxRetries = 5,
    baseDelay = 200,
    maxDelay = 1000,
    backoffFactor = 1.5
  } = options;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const delay = Math.min(baseDelay * Math.pow(backoffFactor, attempt), maxDelay);
    await new Promise(resolve => setTimeout(resolve, delay));
    
    try {
      const isDeleted = await checkFunction();
      if (isDeleted) {
        return true;
      }
    } catch (error) {
      // 如果检查函数抛出错误（比如404），可能意味着删除成功
      if (error instanceof Error && error.message.includes('不存在')) {
        return true;
      }
    }
  }
  
  return false;
}

/**
 * 处理D1数据库操作的一致性问题
 */
export class D1ConsistencyHelper {
  /**
   * 执行删除操作并验证结果
   */
  static async deleteWithVerification<T>(
    deleteOperation: () => Promise<T>,
    verifyOperation: () => Promise<boolean>,
    options: RetryOptions = {}
  ): Promise<T> {
    // 执行删除操作
    const result = await deleteOperation();
    
    // 验证删除是否成功
    const isDeleted = await verifyDeletion(verifyOperation, options);
    
    if (!isDeleted) {
      throw new Error('删除操作未能完全同步，请稍后重试');
    }
    
    return result;
  }

  /**
   * 等待数据库同步
   */
  static async waitForSync(delay: number = 500): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, delay));
  }

  /**
   * 检查操作是否需要重试
   */
  static shouldRetry(error: Error, attempt: number, maxRetries: number): boolean {
    if (attempt >= maxRetries) {
      return false;
    }
    
    // 对于某些特定错误，不进行重试
    const nonRetryableErrors = [
      '无效的ID',
      '权限不足',
      '参数错误'
    ];
    
    return !nonRetryableErrors.some(msg => error.message.includes(msg));
  }
}

/**
 * 创建一个带有一致性处理的API客户端装饰器
 */
export function withConsistency<T extends (...args: any[]) => Promise<any>>(
  apiFunction: T,
  options: RetryOptions = {}
): T {
  return (async (...args: Parameters<T>) => {
    return withRetry(() => apiFunction(...args), options);
  }) as T;
}

/**
 * 用于显示用户友好的错误消息
 */
export function getConsistencyErrorMessage(error: Error): string {
  if (error.message.includes('同步')) {
    return '数据正在同步中，请稍后刷新页面查看最新状态';
  }
  
  if (error.message.includes('网络')) {
    return '网络连接问题，请检查网络后重试';
  }
  
  if (error.message.includes('不存在')) {
    return '数据不存在或已被删除';
  }
  
  return error.message || '操作失败，请重试';
}
