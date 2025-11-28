/**
 * HTTP请求封装
 */

import { PlatformAdapter } from '@/utils/platform';

// API基础配置
const API_CONFIG = {
  baseURL: import.meta.env.VITE_API_BASE || 'https://api.audit.example.com',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json'
  }
};

// 请求拦截器
async function requestInterceptor(config: any) {
  // 添加Token
  const token = await PlatformAdapter.getStorage('token');
  if (token) {
    config.headers = config.headers || {};
    config.headers['Authorization'] = `Bearer ${token}`;
  }

  // 添加时间戳
  config.headers['X-Request-Time'] = Date.now().toString();

  return config;
}

// 响应拦截器
function responseInterceptor(response: any) {
  const { code, data, message } = response.data;

  // 根据业务状态码处理
  if (code === 200 || code === 0) {
    return data;
  }

  // 未登录
  if (code === 401) {
    PlatformAdapter.removeStorage('token');
    PlatformAdapter.removeStorage('userInfo');
    uni.reLaunch({ url: '/pages/login/index' });
    throw new Error('未登录或登录已过期');
  }

  // 权限不足
  if (code === 403) {
    PlatformAdapter.showToast('权限不足', 'none');
    throw new Error('权限不足');
  }

  // 其他错误
  throw new Error(message || '请求失败');
}

// 错误处理
function handleError(error: any) {
  console.error('请求错误:', error);

  let message = '网络错误，请稍后重试';

  if (error.message) {
    message = error.message;
  } else if (error.statusCode === 404) {
    message = '请求的资源不存在';
  } else if (error.statusCode === 500) {
    message = '服务器错误';
  } else if (error.statusCode === 503) {
    message = '服务暂不可用';
  }

  PlatformAdapter.showToast(message, 'none');

  throw error;
}

/**
 * 发送HTTP请求
 */
export async function request<T = any>(options: {
  url: string;
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  data?: any;
  params?: any;
  headers?: any;
  timeout?: number;
}): Promise<T> {
  try {
    // 构建配置
    let config: any = {
      url: options.url.startsWith('http') ? options.url : API_CONFIG.baseURL + options.url,
      method: options.method || 'GET',
      data: options.data,
      header: { ...API_CONFIG.headers, ...options.headers },
      timeout: options.timeout || API_CONFIG.timeout
    };

    // 处理GET请求参数
    if (options.params && config.method === 'GET') {
      const queryString = Object.keys(options.params)
        .map(key => `${key}=${encodeURIComponent(options.params[key])}`)
        .join('&');
      config.url += (config.url.includes('?') ? '&' : '?') + queryString;
    }

    // 请求拦截
    config = await requestInterceptor(config);

    // 发送请求
    const response = await uni.request(config);

    // 响应拦截
    return responseInterceptor(response);
  } catch (error) {
    handleError(error);
    throw error; // handleError会抛出错误，这行代码实际不会执行
  }
}

/**
 * GET请求
 */
export function get<T = any>(url: string, params?: any, options?: any): Promise<T> {
  return request<T>({ url, method: 'GET', params, ...options });
}

/**
 * POST请求
 */
export function post<T = any>(url: string, data?: any, options?: any): Promise<T> {
  return request<T>({ url, method: 'POST', data, ...options });
}

/**
 * PUT请求
 */
export function put<T = any>(url: string, data?: any, options?: any): Promise<T> {
  return request<T>({ url, method: 'PUT', data, ...options });
}

/**
 * DELETE请求
 */
export function del<T = any>(url: string, data?: any, options?: any): Promise<T> {
  return request<T>({ url, method: 'DELETE', data, ...options });
}

/**
 * 上传文件
 */
export async function uploadFile(filePath: string, options?: {
  name?: string;
  formData?: any;
  onProgress?: (progress: number) => void;
}): Promise<any> {
  try {
    const token = await PlatformAdapter.getStorage('token');

    const result = await uni.uploadFile({
      url: API_CONFIG.baseURL + '/upload',
      filePath,
      name: options?.name || 'file',
      formData: options?.formData || {},
      header: {
        'Authorization': `Bearer ${token}`
      }
    });

    const data = JSON.parse(result.data);
    return responseInterceptor({ data });
  } catch (error) {
    handleError(error);
    throw error;
  }
}

export default request;
