/**
 * 证据相关API
 */

import { get, post, del, uploadFile } from './request';

/**
 * 获取证据列表
 */
export function getEvidenceList(params?: {
  projectId?: string;
  workpaperId?: string;
  page?: number;
  pageSize?: number;
}) {
  return get('/evidences', params);
}

/**
 * 获取证据详情
 */
export function getEvidenceDetail(id: string) {
  return get(`/evidences/${id}`);
}

/**
 * 上传证据
 */
export function uploadEvidence(filePath: string, data: {
  projectId: string;
  workpaperId?: string;
  title?: string;
  description?: string;
}) {
  return uploadFile(filePath, {
    formData: data
  });
}

/**
 * 删除证据
 */
export function deleteEvidence(id: string) {
  return del(`/evidences/${id}`);
}

/**
 * OCR识别
 */
export function ocrRecognize(data: {
  evidenceId: string;
  type: 'invoice' | 'voucher' | 'contract';
}) {
  return post('/evidences/ocr', data);
}
