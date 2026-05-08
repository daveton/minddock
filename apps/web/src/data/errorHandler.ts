// Error handling for IndexedDB operations

export enum StorageErrorType {
  QUOTA_EXCEEDED = 'QuotaExceededError',
  UNKNOWN_ERROR = 'UnknownError',
  TRANSACTION_INACTIVE = 'TransactionInactiveError',
  READ_ONLY = 'ReadOnlyError',
  VERSION_ERROR = 'VersionError',
}

export interface StorageError {
  type: StorageErrorType;
  message: string;
  originalError?: Error;
}

export function handleStorageError(error: Error): StorageError {
  if (error.name === 'QuotaExceededError') {
    return {
      type: StorageErrorType.QUOTA_EXCEEDED,
      message: '存储空间不足，请清理旧笔记或升级存储空间',
      originalError: error,
    };
  }
  
  if (error.name === 'TransactionInactiveError') {
    return {
      type: StorageErrorType.TRANSACTION_INACTIVE,
      message: '数据库事务已关闭，请重试',
      originalError: error,
    };
  }
  
  if (error.name === 'ReadOnlyError') {
    return {
      type: StorageErrorType.READ_ONLY,
      message: '存储处于只读模式，无法保存数据',
      originalError: error,
    };
  }
  
  return {
    type: StorageErrorType.UNKNOWN_ERROR,
    message: '保存失败，请检查网络连接或重试',
    originalError: error,
  };
}

export async function checkStorageQuota(): Promise<{
  used: number;
  total: number;
  available: number;
}> {
  if ('storage' in navigator && 'estimate' in navigator.storage) {
    try {
      const estimate = await navigator.storage.estimate();
      return {
        used: estimate.usage || 0,
        total: estimate.quota || 0,
        available: (estimate.quota || 0) - (estimate.usage || 0),
      };
    } catch {
      // Fallback for browsers that don't support storage estimation
      return { used: 0, total: 0, available: 0 };
    }
  }
  
  return { used: 0, total: 0, available: 0 };
}

export async function isStorageQuotaLow(): Promise<boolean> {
  const quota = await checkStorageQuota();
  return quota.available < quota.total * 0.1; // Less than 10% available
}
