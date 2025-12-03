/**
 * 应收账款函证节点
 * 
 * @description 对应收账款进行函证，验证应收账款的存在性和准确性
 * 生成函证文件，记录回函情况，分析差异原因
 * 
 * @author SHENJI Team
 * @date 2025-12-03
 * @version 1.0.0
 * @since Week 2: 核心节点开发 - 收入循环
 * 
 * @example
 * ```typescript
 * const node = new AccountsReceivableConfirmationNode();
 * const result = await node.execute({
 *   receivableList: '/path/to/receivable.xlsx',
 *   customerList: '/path/to/customers.xlsx'
 * }, {
 *   confirmationRatio: 1.0,
 *   materialityAmount: 100000
 * });
 * ```
 */

import { BaseNode, NodeExecutionResult } from './BaseNode';
import { BusinessError, ErrorCode } from '../constants/ErrorCode';

/**
 * 应收账款函证记录接口
 */
interface ReceivableRecord {
  /** 客户编号 */
  customerCode: string;
  /** 客户名称 */
  customerName: string;
  /** 应收金额 */
  amount: number;
  /** 账龄（天数） */
  ageDays: number;
  /** 联系人 */
  contact?: string;
  /** 联系电话 */
  phone?: string;
  /** 联系邮箱 */
  email?: string;
  /** 地址 */
  address?: string;
}

/**
 * 客户信息接口
 */
interface CustomerInfo {
  /** 客户编号 */
  customerCode: string;
  /** 客户名称 */
  customerName: string;
  /** 联系人 */
  contact: string;
  /** 联系电话 */
  phone: string;
  /** 联系邮箱 */
  email: string;
  /** 联系地址 */
  address: string;
}

/**
 * 函证记录接口
 */
interface ConfirmationRecord extends ReceivableRecord {
  /** 是否发函 */
  sent: boolean;
  /** 发函日期 */
  sentDate?: string;
  /** 是否回函 */
  responded: boolean;
  /** 回函日期 */
  responseDate?: string;
  /** 回函金额 */
  confirmedAmount?: number;
  /** 是否相符 */
  matched: boolean;
  /** 差异金额 */
  difference: number;
  /** 差异原因 */
  reason?: string;
}

/**
 * 函证结果汇总接口
 */
interface ConfirmationSummary {
  /** 总记录数 */
  totalRecords: number;
  /** 发函数量 */
  sentCount: number;
  /** 发函金额 */
  sentAmount: number;
  /** 回函数量 */
  respondedCount: number;
  /** 回函金额 */
  respondedAmount: number;
  /** 回函率 */
  responseRate: number;
  /** 相符数量 */
  matchedCount: number;
  /** 相符金额 */
  matchedAmount: number;
  /** 相符率 */
  matchRate: number;
  /** 不符数量 */
  unmatchedCount: number;
  /** 不符金额 */
  unmatchedAmount: number;
  /** 差异总额 */
  totalDifference: number;
  /** 未回函数量 */
  noResponseCount: number;
  /** 未回函金额 */
  noResponseAmount: number;
}

/**
 * 应收账款函证节点
 * 
 * @description 执行应收账款函证程序的审计节点
 * 包括函证对象选择、函证文件生成、回函记录、差异分析等完整流程
 * 
 * @extends {BaseNode}
 */
export class AccountsReceivableConfirmationNode extends BaseNode {
  /**
   * 节点元数据
   */
  static metadata = {
    id: 'accounts-receivable-confirmation',
    name: '应收账款函证',
    category: '收入循环',
    description: '对应收账款进行函证，验证应收账款的存在性和准确性，生成函证文件并分析回函差异',
    icon: 'confirmation',
    version: '1.0.0',
  };

  /**
   * 输入定义
   */
  static inputs = [
    {
      name: 'receivableList',
      label: '应收账款明细表',
      type: 'excel' as const,
      required: true,
      description: '从财务系统导出的应收账款明细（包含：客户编号、客户名称、应收金额、账龄等）',
      validation: (value: any) => {
        if (!value) return false;
        // 可以添加更多验证逻辑
        return true;
      },
    },
    {
      name: 'customerList',
      label: '客户基本信息表',
      type: 'excel' as const,
      required: true,
      description: '客户基本信息（包含：客户编号、客户名称、联系人、联系方式、地址等）',
    },
    {
      name: 'responseRecords',
      label: '回函记录表',
      type: 'excel' as const,
      required: false,
      description: '已收到的回函记录（可选，包含：客户编号、回函日期、确认金额等）',
    },
  ];

  /**
   * 输出定义
   */
  static outputs = [
    {
      name: 'summary',
      label: '函证结果汇总',
      type: 'data' as const,
      description: '函证程序执行的汇总数据（发函率、回函率、相符率等关键指标）',
    },
    {
      name: 'confirmationList',
      label: '函证明细表',
      type: 'excel' as const,
      description: '详细的函证记录清单（发函情况、回函情况、差异分析）',
    },
    {
      name: 'differenceList',
      label: '差异清单',
      type: 'excel' as const,
      description: '回函不符项的详细清单及差异分析',
    },
    {
      name: 'confirmationLetters',
      label: '函证文件',
      type: 'pdf' as const,
      description: '批量生成的函证信PDF文件',
    },
    {
      name: 'workpaper',
      label: '审计底稿',
      type: 'excel' as const,
      description: '应收账款函证审计工作底稿',
    },
  ];

  /**
   * 配置项定义
   */
  static config = {
    confirmationRatio: {
      label: '函证比例',
      type: 'number' as const,
      default: 1.0,
      description: '应发函证的比例（0-1之间，1表示100%发函）',
    },
    materialityAmount: {
      label: '重要性金额',
      type: 'number' as const,
      default: 100000,
      description: '重要性水平金额（元），超过此金额的必须发函',
    },
    includeElectronic: {
      label: '是否使用电子函证',
      type: 'boolean' as const,
      default: false,
      description: '是否同时发送电子邮件函证',
    },
    includeSmallBalance: {
      label: '是否函证小额余额',
      type: 'boolean' as const,
      default: false,
      description: '是否对小于重要性金额的客户也发函',
    },
    autoMatchTolerance: {
      label: '自动匹配容差',
      type: 'number' as const,
      default: 10,
      description: '自动判定相符的金额容差（元），差异在此范围内视为相符',
    },
  };

  /**
   * 执行节点逻辑
   * 
   * @description 执行应收账款函证的完整流程
   * 
   * @param {Record<string, any>} inputs - 输入数据
   * @param {Record<string, any>} config - 配置参数
   * @returns {Promise<NodeExecutionResult>} 节点执行结果
   * 
   * @throws {BusinessError} 当输入数据不完整或执行失败时
   */
  async execute(
    inputs: Record<string, any>,
    config: Record<string, any>
  ): Promise<NodeExecutionResult> {
    const startTime = Date.now();
    this.clearLogs();

    try {
      this.log('========== 开始执行应收账款函证节点 ==========');

      // 1. 验证输入
      await this.validateInputs(inputs);
      this.log('✓ 输入验证通过');

      // 2. 解析输入数据
      this.log('开始解析数据文件...');
      const receivables = await this.parseExcel(inputs.receivableList);
      this.log(`✓ 成功解析应收账款明细：${receivables.length}条记录`);

      const customers = await this.parseExcel(inputs.customerList);
      this.log(`✓ 成功解析客户信息：${customers.length}条记录`);

      let responses: any[] = [];
      if (inputs.responseRecords) {
        responses = await this.parseExcel(inputs.responseRecords);
        this.log(`✓ 成功解析回函记录：${responses.length}条记录`);
      }

      // 3. 数据清洗和规范化
      this.log('开始数据清洗和规范化...');
      const cleanedReceivables = this.cleanReceivables(receivables);
      const customerMap = this.buildCustomerMap(customers);
      this.log('✓ 数据清洗完成');

      // 4. 合并客户信息
      this.log('合并客户联系信息...');
      const receivablesWithContact = this.mergeCustomerInfo(
        cleanedReceivables,
        customerMap
      );
      this.log('✓ 客户信息合并完成');

      // 5. 选择函证对象
      this.log('根据配置选择函证对象...');
      const confirmationTargets = this.selectConfirmationTargets(
        receivablesWithContact,
        config
      );
      this.log(`✓ 已选择${confirmationTargets.length}个函证对象`);

      // 6. 处理回函记录
      this.log('处理回函记录...');
      const confirmationRecords = this.processResponses(
        confirmationTargets,
        responses,
        config.autoMatchTolerance || 10
      );
      this.log('✓ 回函记录处理完成');

      // 7. 计算汇总数据
      this.log('计算函证结果汇总...');
      const summary = this.calculateSummary(confirmationRecords);
      this.log('✓ 汇总数据计算完成');

      // 8. 生成差异清单
      this.log('生成差异清单...');
      const differences = confirmationRecords.filter(r => !r.matched && r.responded);
      this.log(`✓ 识别出${differences.length}条差异记录`);

      // 9. 导出数据
      this.log('导出函证明细表...');
      const confirmationListPath = await this.exportConfirmationList(confirmationRecords);
      this.log(`✓ 函证明细表已导出：${confirmationListPath}`);

      let differenceListPath = '';
      if (differences.length > 0) {
        this.log('导出差异清单...');
        differenceListPath = await this.exportDifferenceList(differences);
        this.log(`✓ 差异清单已导出：${differenceListPath}`);
      }

      // 10. 生成审计底稿
      this.log('生成审计底稿...');
      const workpaperPath = await this.generateConfirmationWorkpaper(
        summary,
        confirmationRecords,
        differences
      );
      this.log(`✓ 审计底稿已生成：${workpaperPath}`);

      // 11. 完成执行
      const duration = Date.now() - startTime;
      this.log(`========== 函证节点执行完成，耗时：${duration}ms ==========`);

      return {
        success: true,
        data: {
          summary,
          confirmationRecords,
          differences,
        },
        outputs: {
          summary,
          confirmationList: confirmationListPath,
          differenceList: differenceListPath || null,
          workpaper: workpaperPath,
        },
        logs: this.getLogs(),
        duration,
      };
    } catch (error: any) {
      this.log(`❌ 执行失败：${error.message}`);
      return {
        success: false,
        error: error.message,
        logs: this.getLogs(),
        duration: Date.now() - startTime,
      };
    }
  }

  /**
   * 清洗应收账款数据
   * 
   * @description 规范化数据格式，过滤无效记录
   * 
   * @private
   * @param {any[]} receivables - 原始应收账款数据
   * @returns {ReceivableRecord[]} 清洗后的数据
   */
  private cleanReceivables(receivables: any[]): ReceivableRecord[] {
    return receivables
      .filter(r => r.客户编号 && r.客户名称 && r.应收金额)
      .map(r => ({
        customerCode: String(r.客户编号).trim(),
        customerName: String(r.客户名称).trim(),
        amount: Number(r.应收金额) || 0,
        ageDays: Number(r.账龄 || 0),
        contact: r.联系人 ? String(r.联系人).trim() : undefined,
        phone: r.联系电话 ? String(r.联系电话).trim() : undefined,
        email: r.邮箱 ? String(r.邮箱).trim() : undefined,
        address: r.地址 ? String(r.地址).trim() : undefined,
      }));
  }

  /**
   * 构建客户信息映射表
   * 
   * @description 将客户数组转换为以客户编号为键的Map，便于快速查找
   * 
   * @private
   * @param {any[]} customers - 客户信息数组
   * @returns {Map<string, CustomerInfo>} 客户信息Map
   */
  private buildCustomerMap(customers: any[]): Map<string, CustomerInfo> {
    const map = new Map<string, CustomerInfo>();
    
    customers.forEach(c => {
      if (c.客户编号) {
        map.set(String(c.客户编号).trim(), {
          customerCode: String(c.客户编号).trim(),
          customerName: String(c.客户名称 || '').trim(),
          contact: String(c.联系人 || '').trim(),
          phone: String(c.联系电话 || '').trim(),
          email: String(c.邮箱 || '').trim(),
          address: String(c.地址 || '').trim(),
        });
      }
    });

    return map;
  }

  /**
   * 合并客户联系信息
   * 
   * @description 将应收账款数据与客户基本信息合并
   * 
   * @private
   * @param {ReceivableRecord[]} receivables - 应收账款记录
   * @param {Map<string, CustomerInfo>} customerMap - 客户信息Map
   * @returns {ReceivableRecord[]} 合并后的记录
   */
  private mergeCustomerInfo(
    receivables: ReceivableRecord[],
    customerMap: Map<string, CustomerInfo>
  ): ReceivableRecord[] {
    return receivables.map(r => {
      const customer = customerMap.get(r.customerCode);
      if (customer) {
        return {
          ...r,
          contact: r.contact || customer.contact,
          phone: r.phone || customer.phone,
          email: r.email || customer.email,
          address: r.address || customer.address,
        };
      }
      return r;
    });
  }

  /**
   * 选择函证对象
   * 
   * @description 根据配置的函证比例和重要性水平选择需要发函的客户
   * 
   * @private
   * @param {ReceivableRecord[]} receivables - 应收账款记录
   * @param {Record<string, any>} config - 配置参数
   * @returns {ReceivableRecord[]} 需要发函的记录
   */
  private selectConfirmationTargets(
    receivables: ReceivableRecord[],
    config: Record<string, any>
  ): ReceivableRecord[] {
    const ratio = config.confirmationRatio || 1.0;
    const materialityAmount = config.materialityAmount || 100000;
    const includeSmallBalance = config.includeSmallBalance || false;

    // 1. 大额必须发函
    const largeBalances = receivables.filter(r => r.amount >= materialityAmount);

    // 2. 小额按比例抽样
    const smallBalances = receivables.filter(r => r.amount < materialityAmount);
    const sampleSize = Math.ceil(smallBalances.length * ratio);
    const sampledSmall = includeSmallBalance
      ? this.randomSample(smallBalances, sampleSize)
      : [];

    return [...largeBalances, ...sampledSmall];
  }

  /**
   * 随机抽样
   * 
   * @description 从数组中随机抽取指定数量的元素
   * 
   * @private
   * @template T
   * @param {T[]} array - 原始数组
   * @param {number} size - 抽样数量
   * @returns {T[]} 抽样结果
   */
  private randomSample<T>(array: T[], size: number): T[] {
    const shuffled = [...array].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, size);
  }

  /**
   * 处理回函记录
   * 
   * @description 将回函记录与发函记录匹配，分析差异
   * 
   * @private
   * @param {ReceivableRecord[]} targets - 发函对象
   * @param {any[]} responses - 回函记录
   * @param {number} tolerance - 容差金额
   * @returns {ConfirmationRecord[]} 处理后的函证记录
   */
  private processResponses(
    targets: ReceivableRecord[],
    responses: any[],
    tolerance: number
  ): ConfirmationRecord[] {
    const responseMap = new Map<string, any>();
    responses.forEach(r => {
      if (r.客户编号) {
        responseMap.set(String(r.客户编号).trim(), r);
      }
    });

    return targets.map(target => {
      const response = responseMap.get(target.customerCode);
      
      if (!response) {
        // 未回函
        return {
          ...target,
          sent: true,
          sentDate: new Date().toISOString().split('T')[0],
          responded: false,
          matched: false,
          difference: target.amount,
        };
      }

      // 已回函
      const confirmedAmount = Number(response.确认金额 || 0);
      const difference = Math.abs(target.amount - confirmedAmount);
      const matched = difference <= tolerance;

      return {
        ...target,
        sent: true,
        sentDate: new Date().toISOString().split('T')[0],
        responded: true,
        responseDate: response.回函日期 || new Date().toISOString().split('T')[0],
        confirmedAmount,
        matched,
        difference,
        reason: response.差异原因 || (matched ? '' : '金额不符'),
      };
    });
  }

  /**
   * 计算函证结果汇总
   * 
   * @description 统计发函率、回函率、相符率等关键指标
   * 
   * @private
   * @param {ConfirmationRecord[]} records - 函证记录
   * @returns {ConfirmationSummary} 汇总数据
   */
  private calculateSummary(records: ConfirmationRecord[]): ConfirmationSummary {
    const totalRecords = records.length;
    const sentRecords = records.filter(r => r.sent);
    const respondedRecords = records.filter(r => r.responded);
    const matchedRecords = respondedRecords.filter(r => r.matched);
    const unmatchedRecords = respondedRecords.filter(r => !r.matched);
    const noResponseRecords = records.filter(r => r.sent && !r.responded);

    const sentAmount = sentRecords.reduce((sum, r) => sum + r.amount, 0);
    const respondedAmount = respondedRecords.reduce((sum, r) => sum + r.amount, 0);
    const matchedAmount = matchedRecords.reduce((sum, r) => sum + r.amount, 0);
    const unmatchedAmount = unmatchedRecords.reduce((sum, r) => sum + r.amount, 0);
    const totalDifference = unmatchedRecords.reduce((sum, r) => sum + r.difference, 0);
    const noResponseAmount = noResponseRecords.reduce((sum, r) => sum + r.amount, 0);

    return {
      totalRecords,
      sentCount: sentRecords.length,
      sentAmount,
      respondedCount: respondedRecords.length,
      respondedAmount,
      responseRate: sentRecords.length > 0 ? respondedRecords.length / sentRecords.length : 0,
      matchedCount: matchedRecords.length,
      matchedAmount,
      matchRate: respondedRecords.length > 0 ? matchedRecords.length / respondedRecords.length : 0,
      unmatchedCount: unmatchedRecords.length,
      unmatchedAmount,
      totalDifference,
      noResponseCount: noResponseRecords.length,
      noResponseAmount,
    };
  }

  /**
   * 导出函证明细表
   * 
   * @description 将函证记录导出为Excel文件
   * 
   * @private
   * @param {ConfirmationRecord[]} records - 函证记录
   * @returns {Promise<string>} 文件路径
   */
  private async exportConfirmationList(records: ConfirmationRecord[]): Promise<string> {
    const headers = [
      '客户编号',
      '客户名称',
      '应收金额',
      '账龄',
      '是否发函',
      '发函日期',
      '是否回函',
      '回函日期',
      '确认金额',
      '是否相符',
      '差异金额',
      '差异原因',
    ];

    const data = records.map(r => ({
      客户编号: r.customerCode,
      客户名称: r.customerName,
      应收金额: r.amount,
      账龄: r.ageDays,
      是否发函: r.sent ? '是' : '否',
      发函日期: r.sentDate || '',
      是否回函: r.responded ? '是' : '否',
      回函日期: r.responseDate || '',
      确认金额: r.confirmedAmount || '',
      是否相符: r.matched ? '是' : '否',
      差异金额: r.difference,
      差异原因: r.reason || '',
    }));

    return await this.exportExcel(
      data,
      headers,
      `应收账款函证明细_${Date.now()}.xlsx`
    );
  }

  /**
   * 导出差异清单
   * 
   * @description 导出回函不符项的详细清单
   * 
   * @private
   * @param {ConfirmationRecord[]} differences - 差异记录
   * @returns {Promise<string>} 文件路径
   */
  private async exportDifferenceList(differences: ConfirmationRecord[]): Promise<string> {
    const headers = [
      '客户编号',
      '客户名称',
      '账面金额',
      '确认金额',
      '差异金额',
      '差异率',
      '差异原因',
      '建议处理',
    ];

    const data = differences.map(r => ({
      客户编号: r.customerCode,
      客户名称: r.customerName,
      账面金额: r.amount,
      确认金额: r.confirmedAmount || 0,
      差异金额: r.difference,
      差异率: ((r.difference / r.amount) * 100).toFixed(2) + '%',
      差异原因: r.reason || '未说明',
      建议处理: r.difference > r.amount * 0.1 ? '重点关注，建议进一步核实' : '建议补充审计程序',
    }));

    return await this.exportExcel(
      data,
      headers,
      `应收账款函证差异清单_${Date.now()}.xlsx`
    );
  }

  /**
   * 生成函证审计底稿
   * 
   * @description 生成标准格式的应收账款函证审计工作底稿
   * 
   * @private
   * @param {ConfirmationSummary} summary - 汇总数据
   * @param {ConfirmationRecord[]} records - 函证记录
   * @param {ConfirmationRecord[]} differences - 差异记录
   * @returns {Promise<string>} 底稿文件路径
   */
  private async generateConfirmationWorkpaper(
    summary: ConfirmationSummary,
    records: ConfirmationRecord[],
    differences: ConfirmationRecord[]
  ): Promise<string> {
    const sections = [
      {
        title: '一、函证程序执行情况',
        headers: ['指标', '数量', '金额（元）', '比率'],
        data: [
          {
            指标: '发函总数',
            数量: summary.sentCount,
            '金额（元）': summary.sentAmount.toFixed(2),
            比率: '100%',
          },
          {
            指标: '回函数量',
            数量: summary.respondedCount,
            '金额（元）': summary.respondedAmount.toFixed(2),
            比率: (summary.responseRate * 100).toFixed(2) + '%',
          },
          {
            指标: '相符数量',
            数量: summary.matchedCount,
            '金额（元）': summary.matchedAmount.toFixed(2),
            比率: (summary.matchRate * 100).toFixed(2) + '%',
          },
          {
            指标: '不符数量',
            数量: summary.unmatchedCount,
            '金额（元）': summary.unmatchedAmount.toFixed(2),
            比率: ((1 - summary.matchRate) * 100).toFixed(2) + '%',
          },
          {
            指标: '未回函数量',
            数量: summary.noResponseCount,
            '金额（元）': summary.noResponseAmount.toFixed(2),
            比率: ((summary.noResponseCount / summary.sentCount) * 100).toFixed(2) + '%',
          },
        ],
      },
      {
        title: '二、函证明细记录（前20条）',
        headers: ['客户名称', '应收金额', '是否回函', '确认金额', '是否相符', '差异金额'],
        data: records.slice(0, 20).map(r => ({
          客户名称: r.customerName,
          应收金额: r.amount,
          是否回函: r.responded ? '是' : '否',
          确认金额: r.confirmedAmount || '',
          是否相符: r.matched ? '是' : '否',
          差异金额: r.difference,
        })),
      },
    ];

    if (differences.length > 0) {
      sections.push({
        title: '三、差异项分析',
        headers: ['客户名称', '账面金额', '确认金额', '差异金额', '差异原因'],
        data: differences.map(r => ({
          客户名称: r.customerName,
          账面金额: r.amount,
          确认金额: r.confirmedAmount || 0,
          差异金额: r.difference,
          差异原因: r.reason || '未说明',
        })),
      });
    }

    sections.push({
      title: '四、审计结论',
      headers: ['项目', '结论'],
      data: [
        {
          项目: '函证程序执行情况',
          结论: `本次共发函${summary.sentCount}份，回函${summary.respondedCount}份，回函率${(summary.responseRate * 100).toFixed(2)}%`,
        },
        {
          项目: '函证结果评价',
          结论: summary.matchRate >= 0.95
            ? '函证结果总体相符，应收账款真实性得到验证'
            : summary.matchRate >= 0.85
            ? '函证结果基本相符，部分差异需要进一步核实'
            : '函证结果存在较多差异，需要执行替代程序',
        },
        {
          项目: '差异处理建议',
          结论: differences.length > 0
            ? `识别出${differences.length}项差异，差异总额${summary.totalDifference.toFixed(2)}元，建议进一步核实原因并评估对财务报表的影响`
            : '无差异项',
        },
        {
          项目: '后续审计程序',
          结论: summary.noResponseCount > 0
            ? `对${summary.noResponseCount}笔未回函的应收账款，建议执行替代审计程序（如检查期后回款、核对合同和发货单等）`
            : '所有发函均已收到回函',
        },
      ],
    });

    return await this.generateWorkpaper(
      '应收账款函证审计工作底稿',
      sections
    );
  }
}
