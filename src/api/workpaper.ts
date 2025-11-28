/**
 * 底稿相关API
 */

import { get, post, put, del } from './request';

/**
 * 获取底稿列表
 */
export function getWorkpaperList(params?: {
  projectId?: string;
  page?: number;
  pageSize?: number;
  keyword?: string;
}) {
  return get('/workpapers', params);
}

/**
 * 获取底稿详情
 */
export function getWorkpaperDetail(id: string) {
  return get(`/workpapers/${id}`);
}

/**
 * 创建底稿
 */
export function createWorkpaper(data: {
  projectId: string;
  title: string;
  type: string;
  content?: any;
}) {
  return post('/workpapers', data);
}

/**
 * 更新底稿
 */
export function updateWorkpaper(id: string, data: any) {
  return put(`/workpapers/${id}`, data);
}

/**
 * 删除底稿
 */
export function deleteWorkpaper(id: string) {
  return del(`/workpapers/${id}`);
}
