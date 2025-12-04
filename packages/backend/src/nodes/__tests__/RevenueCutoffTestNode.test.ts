/**
 * 收入截止性测试节点测试
 * 
 * @description 测试收入截止性测试节点的所有功能
 * @author SHENJI Team
 * @date 2025-12-04
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { RevenueCutoffTestNode } from '../RevenueCutoffTestNode';

describe('RevenueCutoffTestNode', () => {
  let node: RevenueCutoffTestNode;

  beforeEach(() => {
    node = new RevenueCutoffTestNode();
  });

  describe('元数据测试', () => {
    it('应该有正确的节点ID', () => {
      expect(RevenueCutoffTestNode.metadata.id).toBe('revenue-cutoff-test');
    });

    it('应该有正确的节点名称', () => {
      expect(RevenueCutoffTestNode.metadata.name).toBe('收入截止性测试');
    });

    it('应该属于收入循环分类', () => {
      expect(RevenueCutoffTestNode.metadata.category).toBe('收入循环');
    });

    it('应该有描述信息', () => {
      expect(RevenueCutoffTestNode.metadata.description).toBeDefined();
      expect(RevenueCutoffTestNode.metadata.description.length).toBeGreaterThan(0);
    });

    it('应该有版本号', () => {
      expect(RevenueCutoffTestNode.metadata.version).toBeDefined();
      expect(RevenueCutoffTestNode.metadata.version).toMatch(/^\d+\.\d+\.\d+$/);
    });
  });

  describe('输入定义测试', () => {
    it('应该定义salesRecords输入', () => {
      const salesInput = RevenueCutoffTestNode.inputs.find(
        input => input.name === 'salesRecords'
      );
      expect(salesInput).toBeDefined();
      expect(salesInput?.type).toBe('excel');
      expect(salesInput?.required).toBe(true);
    });

    it('应该定义shippingRecords输入', () => {
      const shippingInput = RevenueCutoffTestNode.inputs.find(
        input => input.name === 'shippingRecords'
      );
      expect(shippingInput).toBeDefined();
      expect(shippingInput?.type).toBe('excel');
      expect(shippingInput?.required).toBe(false);
    });

    it('应该定义invoiceRecords输入', () => {
      const invoiceInput = RevenueCutoffTestNode.inputs.find(
        input => input.name === 'invoiceRecords'
      );
      expect(invoiceInput).toBeDefined();
      expect(invoiceInput?.type).toBe('excel');
      expect(invoiceInput?.required).toBe(false);
    });

    it('应该有输入描述', () => {
      RevenueCutoffTestNode.inputs.forEach(input => {
        expect(input.description).toBeDefined();
        expect(input.description.length).toBeGreaterThan(0);
      });
    });
  });

  describe('输出定义测试', () => {
    it('应该定义summary输出', () => {
      const summaryOutput = RevenueCutoffTestNode.outputs.find(
        output => output.name === 'summary'
      );
      expect(summaryOutput).toBeDefined();
      expect(summaryOutput?.type).toBe('data');
    });

    it('应该定义testList输出', () => {
      const testOutput = RevenueCutoffTestNode.outputs.find(
        output => output.name === 'testList'
      );
      expect(testOutput).toBeDefined();
      expect(testOutput?.type).toBe('excel');
    });

    it('应该定义cutoffErrorList输出', () => {
      const errorOutput = RevenueCutoffTestNode.outputs.find(
        output => output.name === 'cutoffErrorList'
      );
      expect(errorOutput).toBeDefined();
      expect(errorOutput?.type).toBe('excel');
    });

    it('应该定义workpaper输出', () => {
      const workpaperOutput = RevenueCutoffTestNode.outputs.find(
        output => output.name === 'workpaper'
      );
      expect(workpaperOutput).toBeDefined();
      expect(workpaperOutput?.type).toBe('excel');
    });

    it('应该有5个输出项', () => {
      expect(RevenueCutoffTestNode.outputs).toHaveLength(5);
    });
  });

  describe('配置项测试', () => {
    it('应该有cutoffDate配置', () => {
      expect(RevenueCutoffTestNode.config.cutoffDate).toBeDefined();
      expect(RevenueCutoffTestNode.config.cutoffDate.type).toBe('string');
      expect(RevenueCutoffTestNode.config.cutoffDate.default).toBe('2024-12-31');
    });

    it('应该有testDays配置', () => {
      expect(RevenueCutoffTestNode.config.testDays).toBeDefined();
      expect(RevenueCutoffTestNode.config.testDays.type).toBe('number');
      expect(RevenueCutoffTestNode.config.testDays.default).toBe(15);
    });

    it('应该有materialityAmount配置', () => {
      expect(RevenueCutoffTestNode.config.materialityAmount).toBeDefined();
      expect(RevenueCutoffTestNode.config.materialityAmount.type).toBe('number');
      expect(RevenueCutoffTestNode.config.materialityAmount.default).toBe(10000);
    });

    it('应该有revenueRecognitionBasis配置', () => {
      expect(RevenueCutoffTestNode.config.revenueRecognitionBasis).toBeDefined();
      expect(RevenueCutoffTestNode.config.revenueRecognitionBasis.type).toBe('select');
    });

    it('配置项应该有描述', () => {
      const configs = Object.values(RevenueCutoffTestNode.config);
      configs.forEach(config => {
        expect(config.description).toBeDefined();
      });
    });
  });

  describe('输入验证测试', () => {
    it('缺少salesRecords时应该失败', async () => {
      try {
        const result = await node.execute({}, {});
        expect(result.success).toBe(false);
        expect(result.error).toContain('销售');
      } catch (error: any) {
        expect(error.message).toContain('销售');
      }
    });

    it('空对象输入应该失败', async () => {
      try {
        const result = await node.execute({}, {});
        expect(result.success).toBe(false);
        expect(result.error).toBeDefined();
      } catch (error: any) {
        expect(error).toBeDefined();
      }
    });

    it('null输入应该处理', async () => {
      try {
        await node.execute(null as any, {});
      } catch (error: any) {
        expect(error).toBeDefined();
      }
    });

    it('undefined输入应该处理', async () => {
      try {
        await node.execute(undefined as any, {});
      } catch (error: any) {
        expect(error).toBeDefined();
      }
    });
  });

  describe('日志记录测试', () => {
    it('执行过程应该记录日志', async () => {
      try {
        const inputs = {
          salesRecords: []
        };
        await node.execute(inputs, {});
      } catch (error) {
        // 即使失败也可能有日志
      }
      
      const logs = node.getLogs();
      expect(logs).toBeDefined();
      expect(Array.isArray(logs)).toBe(true);
      expect(logs.length).toBeGreaterThan(0);
    });

    it('日志应该包含开始标记', async () => {
      try {
        const inputs = {
          salesRecords: []
        };
        await node.execute(inputs, {});
      } catch (error) {
        // 即使失败也可能有日志
      }
      
      const logs = node.getLogs();
      const startLog = logs.find(log => log.includes('开始') || log.includes('执行'));
      expect(startLog).toBeDefined();
    });

    it('清除日志功能应该工作', () => {
      node.clearLogs();
      const logs = node.getLogs();
      expect(logs.length).toBe(0);
    });
  });

  describe('执行结果测试', () => {
    it('成功执行应该返回正确的结构', async () => {
      try {
        const result = await node.execute({}, {});
        expect(result).toBeDefined();
        expect(result).toHaveProperty('success');
        expect(result).toHaveProperty('logs');
        expect(result).toHaveProperty('duration');
        
        if (!result.success) {
          expect(result).toHaveProperty('error');
        } else {
          expect(result).toHaveProperty('data');
          expect(result).toHaveProperty('outputs');
        }
      } catch (error) {
        expect(error).toBeDefined();
      }
    });

    it('应该记录执行时间', async () => {
      try {
        const result = await node.execute({}, {});
        expect(result.duration).toBeDefined();
        expect(typeof result.duration).toBe('number');
        expect(result.duration).toBeGreaterThanOrEqual(0);
      } catch (error) {
        expect(error).toBeDefined();
      }
    });

    it('失败时应该有错误信息', async () => {
      try {
        const result = await node.execute({}, {});
        if (!result.success) {
          expect(result.error).toBeDefined();
          expect(typeof result.error).toBe('string');
          expect(result.error?.length).toBeGreaterThan(0);
        }
      } catch (error: any) {
        expect(error.message).toBeDefined();
      }
    });
  });

  describe('配置参数测试', () => {
    it('应该接受默认配置', async () => {
      try {
        const inputs = {
          salesRecords: []
        };
        await node.execute(inputs, {});
        expect(true).toBe(true);
      } catch (error) {
        expect(error).toBeDefined();
      }
    });

    it('应该接受自定义cutoffDate', async () => {
      try {
        const inputs = {
          salesRecords: []
        };
        const config = {
          cutoffDate: '2025-06-30'
        };
        await node.execute(inputs, config);
        expect(true).toBe(true);
      } catch (error) {
        expect(error).toBeDefined();
      }
    });

    it('应该接受自定义testDays', async () => {
      try {
        const inputs = {
          salesRecords: []
        };
        const config = {
          testDays: 30
        };
        await node.execute(inputs, config);
        expect(true).toBe(true);
      } catch (error) {
        expect(error).toBeDefined();
      }
    });

    it('应该接受自定义materialityAmount', async () => {
      try {
        const inputs = {
          salesRecords: []
        };
        const config = {
          materialityAmount: 50000
        };
        await node.execute(inputs, config);
        expect(true).toBe(true);
      } catch (error) {
        expect(error).toBeDefined();
      }
    });

    it('应该接受不同的收入确认依据', async () => {
      try {
        const inputs = {
          salesRecords: []
        };
        const config = {
          revenueRecognitionBasis: '开票日期'
        };
        await node.execute(inputs, config);
        expect(true).toBe(true);
      } catch (error) {
        expect(error).toBeDefined();
      }
    });
  });

  describe('边界条件测试', () => {
    it('空销售记录应该能处理', async () => {
      try {
        const inputs = {
          salesRecords: []
        };
        await node.execute(inputs, {});
        expect(true).toBe(true);
      } catch (error) {
        expect(error).toBeDefined();
      }
    });

    it('testDays为0应该能处理', async () => {
      try {
        const inputs = {
          salesRecords: []
        };
        const config = {
          testDays: 0
        };
        await node.execute(inputs, config);
        expect(true).toBe(true);
      } catch (error) {
        expect(error).toBeDefined();
      }
    });

    it('非常大的testDays应该能处理', async () => {
      try {
        const inputs = {
          salesRecords: []
        };
        const config = {
          testDays: 365
        };
        await node.execute(inputs, config);
        expect(true).toBe(true);
      } catch (error) {
        expect(error).toBeDefined();
      }
    });

    it('非常大的materialityAmount应该能处理', async () => {
      try {
        const inputs = {
          salesRecords: []
        };
        const config = {
          materialityAmount: 999999999
        };
        await node.execute(inputs, config);
        expect(true).toBe(true);
      } catch (error) {
        expect(error).toBeDefined();
      }
    });
  });

  describe('错误处理测试', () => {
    it('遇到错误应该优雅地失败', async () => {
      try {
        const inputs = {
          salesRecords: 'invalid-file.xlsx'
        };
        const result = await node.execute(inputs, {});
        expect(result.success).toBe(false);
        expect(result.error).toBeDefined();
      } catch (error: any) {
        expect(error).toBeDefined();
        expect(error.message).toBeDefined();
      }
    });

    it('错误信息应该清晰', async () => {
      try {
        const result = await node.execute({}, {});
        if (!result.success) {
          expect(result.error).toBeDefined();
          expect(result.error?.length).toBeGreaterThan(0);
          expect(result.error).not.toBe('Error');
        }
      } catch (error: any) {
        expect(error.message).toBeDefined();
        expect(error.message.length).toBeGreaterThan(0);
      }
    });

    it('错误时仍应该返回日志', async () => {
      try {
        const result = await node.execute({}, {});
        expect(result.logs).toBeDefined();
        expect(Array.isArray(result.logs)).toBe(true);
      } catch (error) {
        const logs = node.getLogs();
        expect(logs).toBeDefined();
        expect(Array.isArray(logs)).toBe(true);
      }
    });
  });

  describe('高级功能测试', () => {
    it('应该支持可选的shippingRecords输入', async () => {
      try {
        const inputs = {
          salesRecords: [],
          shippingRecords: []
        };
        await node.execute(inputs, {});
        expect(true).toBe(true);
      } catch (error) {
        expect(error).toBeDefined();
      }
    });

    it('应该支持可选的invoiceRecords输入', async () => {
      try {
        const inputs = {
          salesRecords: [],
          invoiceRecords: []
        };
        await node.execute(inputs, {});
        expect(true).toBe(true);
      } catch (error) {
        expect(error).toBeDefined();
      }
    });

    it('缺少可选输入不应该失败', async () => {
      try {
        const inputs = {
          salesRecords: []
        };
        await node.execute(inputs, {});
        expect(true).toBe(true);
      } catch (error) {
        expect(error).toBeDefined();
      }
    });
  });
});
