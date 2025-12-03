/**
 * 应收账款函证节点测试
 * 
 * @description 测试应收账款函证节点的各项功能
 * @author SHENJI Team
 * @date 2025-12-03
 */

import { AccountsReceivableConfirmationNode } from '../AccountsReceivableConfirmationNode';
import * as path from 'path';
import * as fs from 'fs/promises';

describe('AccountsReceivableConfirmationNode', () => {
  let node: AccountsReceivableConfirmationNode;

  beforeEach(() => {
    node = new AccountsReceivableConfirmationNode();
  });

  describe('元数据', () => {
    it('应该有正确的节点元数据', () => {
      expect(AccountsReceivableConfirmationNode.metadata.id).toBe('accounts-receivable-confirmation');
      expect(AccountsReceivableConfirmationNode.metadata.name).toBe('应收账款函证');
      expect(AccountsReceivableConfirmationNode.metadata.category).toBe('收入循环');
      expect(AccountsReceivableConfirmationNode.metadata.version).toBe('1.0.0');
    });

    it('应该定义必需的输入项', () => {
      expect(AccountsReceivableConfirmationNode.inputs).toHaveLength(3);
      expect(AccountsReceivableConfirmationNode.inputs[0].name).toBe('receivableList');
      expect(AccountsReceivableConfirmationNode.inputs[1].name).toBe('customerList');
      expect(AccountsReceivableConfirmationNode.inputs[2].name).toBe('responseRecords');
    });

    it('应该定义所有输出项', () => {
      expect(AccountsReceivableConfirmationNode.outputs).toHaveLength(5);
      expect(AccountsReceivableConfirmationNode.outputs[0].name).toBe('summary');
      expect(AccountsReceivableConfirmationNode.outputs[1].name).toBe('confirmationList');
    });

    it('应该定义配置项', () => {
      expect(AccountsReceivableConfirmationNode.config.confirmationRatio).toBeDefined();
      expect(AccountsReceivableConfirmationNode.config.materialityAmount).toBeDefined();
      expect(AccountsReceivableConfirmationNode.config.includeElectronic).toBeDefined();
    });
  });

  describe('execute - 模拟数据测试', () => {
    it('应该正确处理空输入', async () => {
      const result = await node.execute({}, {});
      
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('应该验证必需的输入项', async () => {
      const result = await node.execute(
        {
          receivableList: 'test.xlsx',
          // 缺少 customerList
        },
        {}
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('缺少必需参数');
    });
  });

  describe('数据处理逻辑', () => {
    it('应该能够计算回函率', () => {
      const records = [
        { sent: true, responded: true, matched: true, amount: 100000, difference: 0, customerCode: 'C001', customerName: 'Test1', ageDays: 30 },
        { sent: true, responded: true, matched: false, amount: 50000, difference: 1000, customerCode: 'C002', customerName: 'Test2', ageDays: 60 },
        { sent: true, responded: false, matched: false, amount: 30000, difference: 30000, customerCode: 'C003', customerName: 'Test3', ageDays: 90 },
      ];

      const summary = (node as any).calculateSummary(records);

      expect(summary.totalRecords).toBe(3);
      expect(summary.sentCount).toBe(3);
      expect(summary.respondedCount).toBe(2);
      expect(summary.responseRate).toBeCloseTo(0.67, 2);
      expect(summary.matchedCount).toBe(1);
      expect(summary.noResponseCount).toBe(1);
    });

    it('应该正确识别相符和不符记录', () => {
      const records = [
        { sent: true, responded: true, matched: true, amount: 100000, difference: 0, customerCode: 'C001', customerName: 'Test1', ageDays: 30 },
        { sent: true, responded: true, matched: false, amount: 50000, difference: 5000, customerCode: 'C002', customerName: 'Test2', ageDays: 60 },
      ];

      const summary = (node as any).calculateSummary(records);

      expect(summary.matchedCount).toBe(1);
      expect(summary.unmatchedCount).toBe(1);
      expect(summary.totalDifference).toBe(5000);
    });

    it('应该正确计算金额汇总', () => {
      const records = [
        { sent: true, responded: true, matched: true, amount: 100000, difference: 0, customerCode: 'C001', customerName: 'Test1', ageDays: 30 },
        { sent: true, responded: true, matched: true, amount: 50000, difference: 0, customerCode: 'C002', customerName: 'Test2', ageDays: 60 },
        { sent: true, responded: false, matched: false, amount: 30000, difference: 30000, customerCode: 'C003', customerName: 'Test3', ageDays: 90 },
      ];

      const summary = (node as any).calculateSummary(records);

      expect(summary.sentAmount).toBe(180000);
      expect(summary.respondedAmount).toBe(150000);
      expect(summary.matchedAmount).toBe(150000);
      expect(summary.noResponseAmount).toBe(30000);
    });
  });

  describe('函证对象选择', () => {
    it('应该优先选择大额客户', () => {
      const receivables = [
        { customerCode: 'C001', customerName: 'Customer1', amount: 200000, ageDays: 30 },
        { customerCode: 'C002', customerName: 'Customer2', amount: 50000, ageDays: 60 },
        { customerCode: 'C003', customerName: 'Customer3', amount: 10000, ageDays: 90 },
      ];

      const config = {
        confirmationRatio: 0.5,
        materialityAmount: 100000,
        includeSmallBalance: false,
      };

      const targets = (node as any).selectConfirmationTargets(receivables, config);

      // 大于100000的必须发函
      expect(targets).toContainEqual(expect.objectContaining({ customerCode: 'C001' }));
      expect(targets.length).toBeGreaterThanOrEqual(1);
    });

    it('应该按比例抽样小额客户', () => {
      const receivables = Array.from({ length: 10 }, (_, i) => ({
        customerCode: `C${i.toString().padStart(3, '0')}`,
        customerName: `Customer${i}`,
        amount: 10000,
        ageDays: 30,
      }));

      const config = {
        confirmationRatio: 0.5,
        materialityAmount: 100000,
        includeSmallBalance: true,
      };

      const targets = (node as any).selectConfirmationTargets(receivables, config);

      // 应该抽样约50%
      expect(targets.length).toBeGreaterThanOrEqual(4);
      expect(targets.length).toBeLessThanOrEqual(6);
    });
  });

  describe('差异分析', () => {
    it('应该识别金额差异', () => {
      const targets = [
        { customerCode: 'C001', customerName: 'Customer1', amount: 100000, ageDays: 30 },
      ];

      const responses = [
        { 客户编号: 'C001', 确认金额: 95000, 回函日期: '2025-12-03' },
      ];

      const records = (node as any).processResponses(targets, responses, 10);

      expect(records[0].responded).toBe(true);
      expect(records[0].confirmedAmount).toBe(95000);
      expect(records[0].difference).toBe(5000);
      expect(records[0].matched).toBe(false); // 差异超过容差
    });

    it('应该识别容差范围内的小差异为相符', () => {
      const targets = [
        { customerCode: 'C001', customerName: 'Customer1', amount: 100000, ageDays: 30 },
      ];

      const responses = [
        { 客户编号: 'C001', 确认金额: 99995, 回函日期: '2025-12-03' },
      ];

      const records = (node as any).processResponses(targets, responses, 10);

      expect(records[0].responded).toBe(true);
      expect(records[0].difference).toBe(5);
      expect(records[0].matched).toBe(true); // 差异在容差范围内
    });

    it('应该正确处理未回函情况', () => {
      const targets = [
        { customerCode: 'C001', customerName: 'Customer1', amount: 100000, ageDays: 30 },
      ];

      const responses: any[] = [];

      const records = (node as any).processResponses(targets, responses, 10);

      expect(records[0].sent).toBe(true);
      expect(records[0].responded).toBe(false);
      expect(records[0].matched).toBe(false);
      expect(records[0].difference).toBe(100000);
    });
  });

  describe('客户信息合并', () => {
    it('应该正确合并客户联系信息', () => {
      const receivables = [
        { 
          customerCode: 'C001', 
          customerName: 'Customer1', 
          amount: 100000, 
          ageDays: 30,
          contact: undefined,
          phone: undefined,
        },
      ];

      const customerMap = new Map([
        ['C001', {
          customerCode: 'C001',
          customerName: 'Customer1',
          contact: 'Zhang San',
          phone: '1380000000',
          email: 'zhangsan@example.com',
          address: 'Beijing',
        }],
      ]);

      const merged = (node as any).mergeCustomerInfo(receivables, customerMap);

      expect(merged[0].contact).toBe('Zhang San');
      expect(merged[0].phone).toBe('1380000000');
      expect(merged[0].email).toBe('zhangsan@example.com');
    });

    it('应该保留已有的联系信息', () => {
      const receivables = [
        { 
          customerCode: 'C001', 
          customerName: 'Customer1', 
          amount: 100000, 
          ageDays: 30,
          contact: 'Li Si',
          phone: '1390000000',
        },
      ];

      const customerMap = new Map([
        ['C001', {
          customerCode: 'C001',
          customerName: 'Customer1',
          contact: 'Zhang San',
          phone: '1380000000',
          email: 'zhangsan@example.com',
          address: 'Beijing',
        }],
      ]);

      const merged = (node as any).mergeCustomerInfo(receivables, customerMap);

      // 应该保留原有信息
      expect(merged[0].contact).toBe('Li Si');
      expect(merged[0].phone).toBe('1390000000');
    });
  });

  describe('日志记录', () => {
    it('应该记录执行日志', async () => {
      const result = await node.execute({}, {});

      expect(result.logs).toBeDefined();
      expect(result.logs!.length).toBeGreaterThan(0);
    });
  });

  describe('错误处理', () => {
    it('应该捕获并返回错误信息', async () => {
      const result = await node.execute(
        {
          receivableList: '/nonexistent/file.xlsx',
          customerList: '/nonexistent/file.xlsx',
        },
        {}
      );

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('性能', () => {
    it('应该在合理时间内完成执行', async () => {
      const startTime = Date.now();
      
      await node.execute({}, {});
      
      const duration = Date.now() - startTime;
      
      // 应该在10秒内完成（即使失败也应该快速返回）
      expect(duration).toBeLessThan(10000);
    });
  });
});

describe('集成测试', () => {
  it('应该与其他节点配合工作', () => {
    // TODO: 添加与工作流引擎的集成测试
    expect(true).toBe(true);
  });
});
