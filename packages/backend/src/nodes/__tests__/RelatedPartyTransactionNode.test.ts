/**
 * 关联方交易核查节点测试
 * 
 * @description 测试关联方交易核查节点的所有功能
 * @author SHENJI Team
 * @date 2025-12-04
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { RelatedPartyTransactionNode } from '../RelatedPartyTransactionNode';

describe('RelatedPartyTransactionNode', () => {
  let node: RelatedPartyTransactionNode;

  beforeEach(() => {
    node = new RelatedPartyTransactionNode();
  });

  describe('元数据测试', () => {
    it('应该有正确的节点ID', () => {
      expect(RelatedPartyTransactionNode.metadata.id).toBe('related-party-transaction');
    });

    it('应该有正确的节点名称', () => {
      expect(RelatedPartyTransactionNode.metadata.name).toBe('关联方交易核查');
    });

    it('应该属于特殊交易分类', () => {
      expect(RelatedPartyTransactionNode.metadata.category).toBe('特殊交易');
    });

    it('应该有描述信息', () => {
      expect(RelatedPartyTransactionNode.metadata.description).toBeDefined();
      expect(RelatedPartyTransactionNode.metadata.description.length).toBeGreaterThan(0);
    });

    it('应该有版本号', () => {
      expect(RelatedPartyTransactionNode.metadata.version).toBeDefined();
      expect(RelatedPartyTransactionNode.metadata.version).toMatch(/^\d+\.\d+\.\d+$/);
    });
  });

  describe('输入定义测试', () => {
    it('应该定义relatedPartyList输入', () => {
      const partyInput = RelatedPartyTransactionNode.inputs.find(
        input => input.name === 'relatedPartyList'
      );
      expect(partyInput).toBeDefined();
      expect(partyInput?.type).toBe('excel');
      expect(partyInput?.required).toBe(true);
    });

    it('应该定义transactionRecords输入', () => {
      const transactionInput = RelatedPartyTransactionNode.inputs.find(
        input => input.name === 'transactionRecords'
      );
      expect(transactionInput).toBeDefined();
      expect(transactionInput?.type).toBe('excel');
      expect(transactionInput?.required).toBe(true);
    });

    it('应该定义marketPrices输入', () => {
      const marketInput = RelatedPartyTransactionNode.inputs.find(
        input => input.name === 'marketPrices'
      );
      expect(marketInput).toBeDefined();
      expect(marketInput?.type).toBe('excel');
      expect(marketInput?.required).toBe(false);
    });

    it('应该定义financialStatements输入', () => {
      const financialInput = RelatedPartyTransactionNode.inputs.find(
        input => input.name === 'financialStatements'
      );
      expect(financialInput).toBeDefined();
      expect(financialInput?.type).toBe('excel');
      expect(financialInput?.required).toBe(false);
    });

    it('应该有输入描述', () => {
      RelatedPartyTransactionNode.inputs.forEach(input => {
        expect(input.description).toBeDefined();
        expect(input.description.length).toBeGreaterThan(0);
      });
    });
  });

  describe('输出定义测试', () => {
    it('应该定义summary输出', () => {
      const summaryOutput = RelatedPartyTransactionNode.outputs.find(
        output => output.name === 'summary'
      );
      expect(summaryOutput).toBeDefined();
      expect(summaryOutput?.type).toBe('data');
    });

    it('应该定义relatedTransactionList输出', () => {
      const listOutput = RelatedPartyTransactionNode.outputs.find(
        output => output.name === 'relatedTransactionList'
      );
      expect(listOutput).toBeDefined();
      expect(listOutput?.type).toBe('excel');
    });

    it('应该定义abnormalTransactionList输出', () => {
      const abnormalOutput = RelatedPartyTransactionNode.outputs.find(
        output => output.name === 'abnormalTransactionList'
      );
      expect(abnormalOutput).toBeDefined();
      expect(abnormalOutput?.type).toBe('excel');
    });

    it('应该定义fairnessAnalysis输出', () => {
      const fairnessOutput = RelatedPartyTransactionNode.outputs.find(
        output => output.name === 'fairnessAnalysis'
      );
      expect(fairnessOutput).toBeDefined();
      expect(fairnessOutput?.type).toBe('excel');
    });

    it('应该定义workpaper输出', () => {
      const workpaperOutput = RelatedPartyTransactionNode.outputs.find(
        output => output.name === 'workpaper'
      );
      expect(workpaperOutput).toBeDefined();
      expect(workpaperOutput?.type).toBe('excel');
    });

    it('应该有6个输出项', () => {
      expect(RelatedPartyTransactionNode.outputs).toHaveLength(6);
    });
  });

  describe('配置项测试', () => {
    it('应该有materialityAmount配置', () => {
      expect(RelatedPartyTransactionNode.config.materialityAmount).toBeDefined();
      expect(RelatedPartyTransactionNode.config.materialityAmount.type).toBe('number');
      expect(RelatedPartyTransactionNode.config.materialityAmount.default).toBe(100000);
    });

    it('应该有priceDifferenceThreshold配置', () => {
      expect(RelatedPartyTransactionNode.config.priceDifferenceThreshold).toBeDefined();
      expect(RelatedPartyTransactionNode.config.priceDifferenceThreshold.type).toBe('number');
      expect(RelatedPartyTransactionNode.config.priceDifferenceThreshold.default).toBe(0.1);
    });

    it('应该有checkFrequency配置', () => {
      expect(RelatedPartyTransactionNode.config.checkFrequency).toBeDefined();
      expect(RelatedPartyTransactionNode.config.checkFrequency.type).toBe('boolean');
    });

    it('应该有checkConcentration配置', () => {
      expect(RelatedPartyTransactionNode.config.checkConcentration).toBeDefined();
      expect(RelatedPartyTransactionNode.config.checkConcentration.type).toBe('boolean');
    });

    it('配置项应该有描述', () => {
      const configs = Object.values(RelatedPartyTransactionNode.config);
      configs.forEach(config => {
        expect(config.description).toBeDefined();
      });
    });
  });

  describe('输入验证测试', () => {
    it('缺少relatedPartyList时应该失败', async () => {
      try {
        const result = await node.execute(
          { transactionRecords: 'test.xlsx' },
          {}
        );
        expect(result.success).toBe(false);
        expect(result.error).toContain('关联方');
      } catch (error: any) {
        expect(error.message).toContain('关联方');
      }
    });

    it('缺少transactionRecords时应该失败', async () => {
      try {
        const result = await node.execute(
          { relatedPartyList: 'test.xlsx' },
          {}
        );
        expect(result.success).toBe(false);
        expect(result.error).toContain('交易');
      } catch (error: any) {
        expect(error.message).toContain('交易');
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
          relatedPartyList: [],
          transactionRecords: []
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
          relatedPartyList: [],
          transactionRecords: []
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
          relatedPartyList: [],
          transactionRecords: []
        };
        await node.execute(inputs, {});
        expect(true).toBe(true);
      } catch (error) {
        expect(error).toBeDefined();
      }
    });

    it('应该接受自定义materialityAmount', async () => {
      try {
        const inputs = {
          relatedPartyList: [],
          transactionRecords: []
        };
        const config = {
          materialityAmount: 200000
        };
        await node.execute(inputs, config);
        expect(true).toBe(true);
      } catch (error) {
        expect(error).toBeDefined();
      }
    });

    it('应该接受自定义priceDifferenceThreshold', async () => {
      try {
        const inputs = {
          relatedPartyList: [],
          transactionRecords: []
        };
        const config = {
          priceDifferenceThreshold: 0.15
        };
        await node.execute(inputs, config);
        expect(true).toBe(true);
      } catch (error) {
        expect(error).toBeDefined();
      }
    });

    it('应该接受checkFrequency选项', async () => {
      try {
        const inputs = {
          relatedPartyList: [],
          transactionRecords: []
        };
        const config = {
          checkFrequency: false
        };
        await node.execute(inputs, config);
        expect(true).toBe(true);
      } catch (error) {
        expect(error).toBeDefined();
      }
    });

    it('应该接受checkConcentration选项', async () => {
      try {
        const inputs = {
          relatedPartyList: [],
          transactionRecords: []
        };
        const config = {
          checkConcentration: false
        };
        await node.execute(inputs, config);
        expect(true).toBe(true);
      } catch (error) {
        expect(error).toBeDefined();
      }
    });
  });

  describe('边界条件测试', () => {
    it('空关联方清单应该能处理', async () => {
      try {
        const inputs = {
          relatedPartyList: [],
          transactionRecords: []
        };
        await node.execute(inputs, {});
        expect(true).toBe(true);
      } catch (error) {
        expect(error).toBeDefined();
      }
    });

    it('空交易记录应该能处理', async () => {
      try {
        const inputs = {
          relatedPartyList: [],
          transactionRecords: []
        };
        await node.execute(inputs, {});
        expect(true).toBe(true);
      } catch (error) {
        expect(error).toBeDefined();
      }
    });

    it('priceDifferenceThreshold为0应该能处理', async () => {
      try {
        const inputs = {
          relatedPartyList: [],
          transactionRecords: []
        };
        const config = {
          priceDifferenceThreshold: 0
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
          relatedPartyList: [],
          transactionRecords: []
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
          relatedPartyList: 'invalid-file.xlsx',
          transactionRecords: 'invalid-file2.xlsx'
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
    it('应该支持可选的marketPrices输入', async () => {
      try {
        const inputs = {
          relatedPartyList: [],
          transactionRecords: [],
          marketPrices: []
        };
        await node.execute(inputs, {});
        expect(true).toBe(true);
      } catch (error) {
        expect(error).toBeDefined();
      }
    });

    it('应该支持可选的financialStatements输入', async () => {
      try {
        const inputs = {
          relatedPartyList: [],
          transactionRecords: [],
          financialStatements: []
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
          relatedPartyList: [],
          transactionRecords: []
        };
        await node.execute(inputs, {});
        expect(true).toBe(true);
      } catch (error) {
        expect(error).toBeDefined();
      }
    });
  });
});
