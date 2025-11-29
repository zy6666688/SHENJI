/**
 * 自动保存工具
 * 提供防抖保存、版本管理、离线缓存等功能
 */

import { ref } from 'vue';
import { PlatformAdapter } from './platform';

interface SaveData {
  nodes: any[];
  connections: any[];
  metadata: {
    version: number;
    lastModified: string;
    autoSaved: boolean;
  };
}

interface SaveOptions {
  immediate?: boolean;  // 是否立即保存
  showToast?: boolean;  // 是否显示提示
}

class AutoSaveManager {
  private saveTimer: number | null = null;
  private saveDelay: number = 2000; // 2秒防抖
  private maxVersions: number = 50;  // 最多保存50个版本
  
  // 保存状态
  public isSaving = ref(false);
  public lastSaveTime = ref<string>('');
  public hasUnsavedChanges = ref(false);

  /**
   * 防抖保存函数
   */
  public debounceSave(
    workpaperId: string,
    data: SaveData,
    saveFn: (id: string, data: SaveData) => Promise<void>,
    options: SaveOptions = {}
  ): void {
    const { immediate = false, showToast = true } = options;

    // 标记有未保存的更改
    this.hasUnsavedChanges.value = true;

    // 如果需要立即保存
    if (immediate) {
      this.save(workpaperId, data, saveFn, showToast);
      return;
    }

    // 清除之前的定时器
    if (this.saveTimer) {
      clearTimeout(this.saveTimer);
    }

    // 设置新的定时器
    this.saveTimer = setTimeout(() => {
      this.save(workpaperId, data, saveFn, showToast);
    }, this.saveDelay) as unknown as number;
  }

  /**
   * 执行保存
   */
  private async save(
    workpaperId: string,
    data: SaveData,
    saveFn: (id: string, data: SaveData) => Promise<void>,
    showToast: boolean
  ): Promise<void> {
    try {
      this.isSaving.value = true;

      // 添加元数据
      const saveData: SaveData = {
        ...data,
        metadata: {
          version: Date.now(),
          lastModified: new Date().toISOString(),
          autoSaved: true
        }
      };

      // 保存到云端
      await saveFn(workpaperId, saveData);

      // 保存到本地缓存
      await this.saveToLocal(workpaperId, saveData);

      // 保存历史版本
      await this.saveVersion(workpaperId, saveData);

      // 更新状态
      this.lastSaveTime.value = new Date().toLocaleTimeString('zh-CN');
      this.hasUnsavedChanges.value = false;

      if (showToast) {
        uni.showToast({
          title: '自动保存成功',
          icon: 'success',
          duration: 1500
        });
      }
    } catch (error) {
      console.error('自动保存失败:', error);
      
      // 即使云端保存失败，也要保存到本地
      try {
        await this.saveToLocal(workpaperId, data);
        
        if (showToast) {
          uni.showToast({
            title: '已保存到本地',
            icon: 'none',
            duration: 2000
          });
        }
      } catch (localError) {
        console.error('本地保存失败:', localError);
        
        if (showToast) {
          uni.showToast({
            title: '保存失败',
            icon: 'error'
          });
        }
      }
    } finally {
      this.isSaving.value = false;
    }
  }

  /**
   * 保存到本地存储
   */
  private async saveToLocal(workpaperId: string, data: SaveData): Promise<void> {
    const key = `workpaper_${workpaperId}`;
    await PlatformAdapter.setStorage(key, data);
  }

  /**
   * 从本地存储加载
   */
  public async loadFromLocal(workpaperId: string): Promise<SaveData | null> {
    try {
      const key = `workpaper_${workpaperId}`;
      const data = await PlatformAdapter.getStorage(key);
      return data as SaveData;
    } catch (error) {
      console.error('从本地加载失败:', error);
      return null;
    }
  }

  /**
   * 保存历史版本
   */
  private async saveVersion(workpaperId: string, data: SaveData): Promise<void> {
    try {
      const versionsKey = `workpaper_versions_${workpaperId}`;
      
      // 获取现有版本列表
      let versions: SaveData[] = [];
      try {
        const stored = await PlatformAdapter.getStorage(versionsKey);
        versions = (stored as SaveData[]) || [];
      } catch (e) {
        versions = [];
      }

      // 添加新版本
      versions.push(data);

      // 只保留最新的N个版本
      if (versions.length > this.maxVersions) {
        versions = versions.slice(-this.maxVersions);
      }

      // 保存版本列表
      await PlatformAdapter.setStorage(versionsKey, versions);
    } catch (error) {
      console.error('保存版本失败:', error);
    }
  }

  /**
   * 获取历史版本列表
   */
  public async getVersions(workpaperId: string): Promise<SaveData[]> {
    try {
      const versionsKey = `workpaper_versions_${workpaperId}`;
      const versions = await PlatformAdapter.getStorage(versionsKey);
      return (versions as SaveData[]) || [];
    } catch (error) {
      console.error('获取版本列表失败:', error);
      return [];
    }
  }

  /**
   * 恢复到指定版本
   */
  public async restoreVersion(
    workpaperId: string,
    version: SaveData,
    saveFn: (id: string, data: SaveData) => Promise<void>
  ): Promise<void> {
    try {
      // 恢复到云端
      await saveFn(workpaperId, version);

      // 恢复到本地
      await this.saveToLocal(workpaperId, version);

      uni.showToast({
        title: '版本恢复成功',
        icon: 'success'
      });
    } catch (error) {
      console.error('版本恢复失败:', error);
      uni.showToast({
        title: '版本恢复失败',
        icon: 'error'
      });
      throw error;
    }
  }

  /**
   * 清除定时器
   */
  public clearTimer(): void {
    if (this.saveTimer) {
      clearTimeout(this.saveTimer);
      this.saveTimer = null;
    }
  }

  /**
   * 清除指定底稿的所有缓存
   */
  public async clearCache(workpaperId: string): Promise<void> {
    try {
      await PlatformAdapter.removeStorage(`workpaper_${workpaperId}`);
      await PlatformAdapter.removeStorage(`workpaper_versions_${workpaperId}`);
    } catch (error) {
      console.error('清除缓存失败:', error);
    }
  }
}

// 导出单例
export const autoSaveManager = new AutoSaveManager();
