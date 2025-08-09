// 错误处理和用户友好错误消息工具

export interface ApiError {
  code: string;
  message: string;
  details?: any;
  userMessage: string;
}

// 错误码映射表 - 将后端错误码转换为用户友好的消息
export const ERROR_MESSAGES: Record<string, string> = {
  // 认证相关错误
  'UNAUTHORIZED': '请先登录后再进行此操作',
  'FORBIDDEN': '您没有权限执行此操作',
  'TOKEN_EXPIRED': '登录已过期，请重新登录',
  
  // 事件相关错误
  'EVENT_NOT_FOUND': '找不到该活动',
  'EVENT_PAST': '无法申请已过期的活动',
  'EVENT_FULL': '活动人数已满，无法申请',
  'INVALID_EVENT_ID': '无效的活动ID',
  'OWN_EVENT': '无法申请参加自己创建的活动',
  
  // 申请相关错误
  'DUPLICATE_PENDING': '您已经提交过申请，请等待审核结果',
  'DUPLICATE_REQUEST': '您已经申请过此活动了',
  'ALREADY_APPROVED': '您的申请已经被批准了',
  'ALREADY_ATTENDING': '您已经是该活动的参与者了',
  'TOO_MANY_PENDING': '您的待处理申请过多，请等待部分申请处理完成后再试',
  'REJECTION_COOLDOWN': '被拒绝后需要等待一段时间才能重新申请',
  
  // 容量相关错误
  'CAPACITY_EXCEEDED': '活动人数已满，无法批准更多申请',
  'REQUEST_NOT_PENDING': '该申请已经被处理过了',
  'ALREADY_ATTENDING_ERROR': '该用户已经是活动参与者',
  
  // 地点解锁错误
  'LOCATION_ALREADY_UNLOCKED': '活动地点已经解锁',
  'NOT_EVENT_HOST': '只有活动主办方可以解锁地点',
  'NO_EXACT_LOCATION': '该活动没有设置精确地点',
  
  // 通用错误
  'INTERNAL_ERROR': '服务器内部错误，请稍后重试',
  'NETWORK_ERROR': '网络连接错误，请检查您的网络连接',
  'VALIDATION_ERROR': '输入数据格式错误',
  'RATE_LIMIT_EXCEEDED': '操作过于频繁，请稍后再试',
  
  // 数据库错误
  'DATABASE_ERROR': '数据库操作失败，请稍后重试',
  'CONSTRAINT_VIOLATION': '数据完整性错误',
  'FOREIGN_KEY_VIOLATION': '关联数据不存在',
  
  // 文件上传错误
  'UPLOAD_ERROR': '文件上传失败',
  'FILE_TOO_LARGE': '文件大小超出限制',
  'INVALID_FILE_TYPE': '不支持的文件类型',
  
  // 时间相关错误
  'INVALID_DATE_TIME': '无效的日期时间格式',
  'DATE_IN_PAST': '日期时间必须是未来时间',
  'TIME_CONFLICT': '时间冲突',
  
  // 权限相关错误
  'INSUFFICIENT_PERMISSIONS': '权限不足',
  'ACCOUNT_SUSPENDED': '账户已被暂停',
  'ACCOUNT_VERIFICATION_REQUIRED': '账户需要验证',
};

// 根据错误码和上下文生成用户友好的错误消息
export const getErrorMessage = (errorCode: string, context?: any): string => {
  const baseMessage = ERROR_MESSAGES[errorCode] || '发生了未知错误，请稍后重试';
  
  // 根据上下文自定义特定错误消息
  switch (errorCode) {
    case 'TOO_MANY_PENDING':
      const { currentPendingCount, maxAllowed } = context || {};
      return `您当前有 ${currentPendingCount} 个待处理申请，已达到最大限制 ${maxAllowed} 个。请等待部分申请被处理后再提交新申请。`;
      
    case 'REJECTION_COOLDOWN':
      const { daysRemaining, hoursRemaining } = context || {};
      if (daysRemaining > 1) {
        return `您需要等待 ${daysRemaining} 天后才能重新申请该活动`;
      } else {
        return `您需要等待 ${hoursRemaining} 小时后才能重新申请该活动`;
      }
      
    case 'EVENT_FULL':
      const { capacity, currentAttendees } = context || {};
      return `活动人数已满 (${currentAttendees}/${capacity})，目前无法申请`;
      
    case 'CAPACITY_EXCEEDED':
      const { eventCapacity, currentCount } = context || {};
      return `活动容量已满 (${currentCount}/${eventCapacity})，无法批准更多申请`;
      
    default:
      return baseMessage;
  }
};

// 处理 API 响应错误
export const handleApiError = (error: any): ApiError => {
  // 如果是我们的自定义错误响应
  if (error?.code && typeof error.code === 'string') {
    return {
      code: error.code,
      message: error.message || error.error || '未知错误',
      details: error,
      userMessage: getErrorMessage(error.code, error)
    };
  }
  
  // 如果是网络错误
  if (error?.message?.includes('fetch')) {
    return {
      code: 'NETWORK_ERROR',
      message: error.message,
      details: error,
      userMessage: getErrorMessage('NETWORK_ERROR')
    };
  }
  
  // 如果是 Supabase 错误
  if (error?.message && typeof error.message === 'string') {
    // 根据错误消息推断错误类型
    if (error.message.includes('JWT')) {
      return {
        code: 'TOKEN_EXPIRED',
        message: error.message,
        details: error,
        userMessage: getErrorMessage('TOKEN_EXPIRED')
      };
    }
    
    if (error.message.includes('permission') || error.message.includes('policy')) {
      return {
        code: 'FORBIDDEN',
        message: error.message,
        details: error,
        userMessage: getErrorMessage('FORBIDDEN')
      };
    }
    
    if (error.message.includes('violates') || error.message.includes('constraint')) {
      return {
        code: 'CONSTRAINT_VIOLATION',
        message: error.message,
        details: error,
        userMessage: getErrorMessage('CONSTRAINT_VIOLATION')
      };
    }
  }
  
  // 默认内部错误
  return {
    code: 'INTERNAL_ERROR',
    message: error?.message || '未知错误',
    details: error,
    userMessage: getErrorMessage('INTERNAL_ERROR')
  };
};

// 日志记录函数（用于错误追踪）
export const logError = (error: ApiError, context?: string) => {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    context,
    code: error.code,
    message: error.message,
    details: error.details,
    userAgent: navigator.userAgent,
    url: window.location.href
  };
  
  // 在开发环境中打印到控制台
  if (process.env.NODE_ENV === 'development') {
    console.error('[ERROR LOG]', logEntry);
  }
  
  // 在生产环境中，这里可以发送到错误监控服务
  // 例如: sendToErrorTracking(logEntry);
};

// React Hook 用于错误处理
export const useErrorHandler = () => {
  const handleError = (error: any, context?: string): string => {
    const apiError = handleApiError(error);
    logError(apiError, context);
    return apiError.userMessage;
  };
  
  return { handleError };
};

// 错误边界组件的错误处理
export const handleComponentError = (error: Error, errorInfo: any) => {
  const apiError: ApiError = {
    code: 'COMPONENT_ERROR',
    message: error.message,
    details: { error, errorInfo },
    userMessage: '页面渲染出错，请刷新页面重试'
  };
  
  logError(apiError, 'React Error Boundary');
  return apiError;
};

// 成功消息映射表
export const SUCCESS_MESSAGES: Record<string, string> = {
  'JOIN_REQUEST_SUBMITTED': '申请已提交，请等待审核',
  'REQUEST_APPROVED': '申请已批准',
  'REQUEST_REJECTED': '申请已拒绝',
  'LOCATION_UNLOCKED': '地点已解锁，参与者现在可以查看精确地址',
  'EVENT_CREATED': '活动创建成功',
  'EVENT_UPDATED': '活动更新成功',
  'EVENT_DELETED': '活动删除成功',
  'PROFILE_UPDATED': '个人资料更新成功',
  'IMAGE_UPLOADED': '图片上传成功',
};

export const getSuccessMessage = (code: string): string => {
  return SUCCESS_MESSAGES[code] || '操作成功';
};
