/**
 * 期后事项核查节点
 * 
 * @description 检查资产负债表日后至审计报告日之间的重大事项
 * 评估期后事项对财务报表的影响，确定是否需要调整或披露
 * 
 * @author SHENJI Team
 * @date 2025-12-04
 * @version 1.0.0
 * @since Week 2: 核心节点开发 - 后续事项
 * 
 * @example
 * ```typescript
 * const node = new SubsequentEventsNode();
 * const result = await node.execute({
 *   eventsList: '/path/to/events.xlsx',
 *   financialData: '/path/to/financial.xlsx'
 * }, {
 *   balanceSheetDate: '2024-12-31',
 *   auditReportDate: '2025-03-31'
 * });
 * ```
 */

import { BaseNode, NodeExecutionResult } from './BaseNode';
import { BusinessError, ErrorCode } from '../constants/ErrorCode';

/**
 * 期后事项记录接口
 */
interface SubsequentEvent {
  /** 事项编号 */
  eventNo: string;
  /** 事项名称 */
  eventName: string;
  /** 发生日期 */
  occurrenceDate: string;
  /** 事项类型 */
  eventType: string;
  /** 事项描述 */
  description: string;
  /** 涉及金额 */
  amount?: number;
  /** 影响科目 */
  affectedAccounts?: string[];
  /** 信息来源 */
  source?: string;
}

/**
 * 期后事项分析记录接口
 */
interface AnalyzedEvent extends SubsequentEvent {
  /** 事项性质 */
  nature: '调整事项' | '非调整事项' | '无需处理';
  /** 重要性程度 */
  significance: '重大' | '一般' | '轻微';
  /** 影响金额 */
  impactAmount: number;
  /** 是否需要调整 */
  requiresAdjustment: boolean;
  /** 是否需要披露 */
  requiresDisclosure: boolean;
  /** 建议处理 */
  recommendation: string;
  /** 影响分析 */
  impactAnalysis: string;
}

/**
 * 期后事项汇总接口
 */
interface SubsequentEventsSummary {
  /** 资产负债表日 */
  balanceSheetDate: string;
  /** 审计报告日 */
  auditReportDate: string;
  /** 期后天数 */
  daysAfter: number;
  /** 事项总数 */
  totalEvents: number;
  /** 调整事项数 */
  adjustingEventsCount: number;
  /** 非调整事项数 */
  nonAdjustingEventsCount: number;
  /** 重大事项数 */
  significantEventsCount: number;
  /** 需要调整的事项数 */
  requireAdjustmentCount: number;
  /** 需要披露的事项数 */
  requireDisclosureCount: number;
  /** 调整金额合计 */
  totalAdjustmentAmount: number;
  /** 最重大的事项 */
  mostSignificantEvent?: AnalyzedEvent;
}

/**
 * 期后事项核查节点
 * 
 * @description 执行期后事项核查程序的审计节点
 * 包括事项识别、性质判断、影响评估、处理建议等完整流程
 * 
 * @extends {BaseNode}
 */
export class SubsequentEventsNode extends BaseNode {
  /**
   * 节点元数据
   */
  static metadata = {
    id: 'subsequent-events',
    name: '期后事项核查',
    category: '后续事项',
    description: '检查和评估资产负债表日后的重大事项，确定调整和披露要求',
    icon: 'calendar-after',
    version: '1.0.0',
  };

  /**
   * 输入定义
   */
  static inputs = [
    {
      name: 'eventsList',
      label: '期后事项清单',
      type: 'excel' as const,
      required: true,
      description: '资产负债表日后发生的事项清单（包含：事项名称、发生日期、金额、描述等）',
    },
    {
      name: 'financialData',
      label: '财务数据',
      type: 'excel' as const,
      required: false,
      description: '相关财务数据（可选，用于评估影响金额）',
    },
    {
      name: 'boardMinutes',
      label: '董事会会议纪要',
      type: 'pdf' as const,
      required: false,
      description: '期后董事会会议纪要（可选，重大事项的信息来源）',
    },
    {
      name: 'newsClippings',
      label: '新闻报道',
      type: 'text' as const,
      required: false,
      description: '期后相关新闻报道（可选，外部信息来源）',
    },
  ];

  /**
   * 输出定义
   */
  static outputs = [
    {
      name: 'summary',
      label: '核查结果汇总',
      type: 'data' as const,
      description: '期后事项核查的汇总数据（事项数量、性质、影响等关键指标）',
    },
    {
      name: 'eventsList',
      label: '期后事项清单',
      type: 'excel' as const,
      description: '详细的期后事项清单及分析',
    },
    {
      name: 'adjustingEventsList',
      label: '调整事项清单',
      type: 'excel' as const,
      description: '需要调整财务报表的事项清单',
    },
    {
      name: 'disclosureList',
      label: '披露事项清单',
      type: 'excel' as const,
      description: '需要在财务报表附注中披露的事项清单',
    },
    {
      name: 'impactAnalysis',
      label: '影响分析报告',
      type: 'excel' as const,
      description: '期后事项对财务报表的影响分析',
    },
    {
      name: 'workpaper',
      label: '审计底稿',
      type: 'excel' as const,
      description: '期后事项核查审计工作底稿',
    },
  ];

  /**
   * 配置项定义
   */
  static config = {
    balanceSheetDate: {
      label: '资产负债表日',
      type: 'string' as const,
      default: '2024-12-31',
      description: '资产负债表日期（格式：YYYY-MM-DD）',
    },
    auditReportDate: {
      label: '审计报告日',
      type: 'string' as const,
      default: '2025-03-31',
      description: '审计报告日期（格式：YYYY-MM-DD）',
    },
    materialityAmount: {
      label: '重要性金额',
      type: 'number' as const,
      default: 100000,
      description: '重要性金额阈值（元），超过此金额的事项视为重大',
    },
    significanceThreshold: {
      label: '重要性比例',
      type: 'number' as const,
      default: 0.05,
      description: '重要性比例阈值（如0.05表示5%），影响超过此比例的事项视为重大',
    },
    checkScope: {
      label: '检查范围',
      type: 'select' as const,
      default: '全面检查',
      options: ['全面检查', '重点检查', '抽样检查'],
      description: '期后事项的检查范围',
    },
  };

  /**
   * 执行节点逻辑
   * 
   * @description 执行期后事项核查的完整流程
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
      this.log('========== 开始执行期后事项核查节点 ==========');

      // 1. 验证输入
      await this.validateInputs(inputs);
      this.log('✓ 输入验证通过');

      // 2. 解析配置
      const balanceSheetDate = config.balanceSheetDate || '2024-12-31';
      const auditReportDate = config.auditReportDate || '2025-03-31';
      const materialityAmount = config.materialityAmount || 100000;

      this.log(`资产负债表日：${balanceSheetDate}`);
      this.log(`审计报告日：${auditReportDate}`);
      this.log(`重要性金额：${materialityAmount}元`);

      // 3. 解析期后事项清单
      this.log('开始解析期后事项清单...');
      const events = await this.parseExcel(inputs.eventsList);
      this.log(`✓ 成功解析期后事项：${events.length}个`);

      // 4. 解析财务数据（如果有）
      let financialData: any = null;
      if (inputs.financialData) {
        const financialRecords = await this.parseExcel(inputs.financialData);
        financialData = this.processFinancialData(financialRecords);
        this.log('✓ 成功解析财务数据');
      }

      // 5. 数据清洗
      this.log('开始数据清洗...');
      const cleanedEvents = this.cleanEvents(events);
      this.log('✓ 数据清洗完成');

      // 6. 验证期后期间
      this.log('验证事项发生时间...');
      const validEvents = this.validateEventPeriod(
        cleanedEvents,
        balanceSheetDate,
        auditReportDate
      );
      this.log(`✓ ${validEvents.length}个事项在期后期间内`);

      // 7. 判断事项性质
      this.log('判断事项性质...');
      const classifiedEvents = this.classifyEvents(validEvents, balanceSheetDate);
      this.log('✓ 事项性质判断完成');

      // 8. 评估重要性
      this.log('评估事项重要性...');
      const assessedEvents = this.assessSignificance(
        classifiedEvents,
        financialData,
        config
      );
      this.log('✓ 重要性评估完成');

      // 9. 确定处理方式
      this.log('确定处理方式...');
      const analyzedEvents = this.determineAction(assessedEvents);
      this.log('✓ 处理方式确定完成');

      // 10. 计算汇总数据
      this.log('计算汇总数据...');
      const summary = this.calculateSummary(
        analyzedEvents,
        balanceSheetDate,
        auditReportDate
      );
      this.log('✓ 汇总数据计算完成');

      // 11. 识别需要特别关注的事项
      const adjustingEvents = analyzedEvents.filter(e => e.requiresAdjustment);
      const disclosureEvents = analyzedEvents.filter(e => e.requiresDisclosure);
      const significantEvents = analyzedEvents.filter(e => e.significance === '重大');

      this.log(`识别出${adjustingEvents.length}个调整事项`);
      this.log(`识别出${disclosureEvents.length}个需披露事项`);
      this.log(`识别出${significantEvents.length}个重大事项`);

      // 12. 导出期后事项清单
      this.log('导出期后事项清单...');
      const eventsListPath = await this.exportEventsList(analyzedEvents);
      this.log(`✓ 期后事项清单已导出：${eventsListPath}`);

      // 13. 导出调整事项清单
      let adjustingEventsPath = '';
      if (adjustingEvents.length > 0) {
        this.log('导出调整事项清单...');
        adjustingEventsPath = await this.exportAdjustingEvents(adjustingEvents);
        this.log(`✓ 调整事项清单已导出：${adjustingEventsPath}`);
      }

      // 14. 导出披露事项清单
      let disclosureListPath = '';
      if (disclosureEvents.length > 0) {
        this.log('导出披露事项清单...');
        disclosureListPath = await this.exportDisclosureList(disclosureEvents);
        this.log(`✓ 披露事项清单已导出：${disclosureListPath}`);
      }

      // 15. 导出影响分析报告
      this.log('导出影响分析报告...');
      const impactAnalysisPath = await this.exportImpactAnalysis(
        analyzedEvents,
        financialData
      );
      this.log(`✓ 影响分析报告已导出：${impactAnalysisPath}`);

      // 16. 生成审计底稿
      this.log('生成审计底稿...');
      const workpaperPath = await this.generateSubsequentEventsWorkpaper(
        summary,
        analyzedEvents,
        adjustingEvents,
        disclosureEvents
      );
      this.log(`✓ 审计底稿已生成：${workpaperPath}`);

      // 17. 完成执行
      const duration = Date.now() - startTime;
      this.log(`========== 期后事项核查节点执行完成，耗时：${duration}ms ==========`);

      return {
        success: true,
        data: {
          summary,
          analyzedEvents,
          adjustingEvents,
          disclosureEvents,
        },
        outputs: {
          summary,
          eventsList: eventsListPath,
          adjustingEventsList: adjustingEventsPath || null,
          disclosureList: disclosureListPath || null,
          impactAnalysis: impactAnalysisPath,
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
   * 清洗事项数据
   * 
   * @private
   * @param {any[]} events - 原始事项数据
   * @returns {SubsequentEvent[]} 清洗后的数据
   */
  private cleanEvents(events: any[]): SubsequentEvent[] {
    return events
      .filter(e => e.事项名称 && e.发生日期)
      .map((e, index) => ({
        eventNo: e.事项编号 ? String(e.事项编号).trim() : `SE${String(index + 1).padStart(4, '0')}`,
        eventName: String(e.事项名称).trim(),
        occurrenceDate: this.normalizeDate(e.发生日期),
        eventType: String(e.事项类型 || '其他').trim(),
        description: String(e.事项描述 || e.描述 || '').trim(),
        amount: e.涉及金额 ? Number(e.涉及金额) : undefined,
        affectedAccounts: e.影响科目 ? String(e.影响科目).split(/[,，、]/).map(s => s.trim()) : undefined,
        source: e.信息来源 ? String(e.信息来源).trim() : undefined,
      }));
  }

  /**
   * 规范化日期
   * 
   * @private
   * @param {any} date - 日期值
   * @returns {string} 规范化后的日期
   */
  private normalizeDate(date: any): string {
    if (!date) return '';
    if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return date;
    }
    const dateObj = new Date(date);
    if (!isNaN(dateObj.getTime())) {
      return dateObj.toISOString().split('T')[0];
    }
    return String(date);
  }

  /**
   * 处理财务数据
   * 
   * @private
   * @param {any[]} records - 财务记录
   * @returns {any} 财务数据对象
   */
  private processFinancialData(records: any[]): any {
    // 简化处理，实际应根据具体格式解析
    const data: any = {
      revenue: 0,
      totalAssets: 0,
      totalEquity: 0,
      netProfit: 0,
    };

    records.forEach(r => {
      if (r.科目 === '营业收入' || r.科目 === '主营业务收入') {
        data.revenue += Number(r.金额 || 0);
      } else if (r.科目 === '资产总计') {
        data.totalAssets = Number(r.金额 || 0);
      } else if (r.科目 === '所有者权益合计' || r.科目 === '净资产') {
        data.totalEquity = Number(r.金额 || 0);
      } else if (r.科目 === '净利润') {
        data.netProfit = Number(r.金额 || 0);
      }
    });

    return data;
  }

  /**
   * 验证事项发生期间
   * 
   * @private
   * @param {SubsequentEvent[]} events - 事项列表
   * @param {string} balanceSheetDate - 资产负债表日
   * @param {string} auditReportDate - 审计报告日
   * @returns {SubsequentEvent[]} 期后期间内的事项
   */
  private validateEventPeriod(
    events: SubsequentEvent[],
    balanceSheetDate: string,
    auditReportDate: string
  ): SubsequentEvent[] {
    const bsDate = new Date(balanceSheetDate);
    const arDate = new Date(auditReportDate);

    return events.filter(e => {
      const eventDate = new Date(e.occurrenceDate);
      return eventDate > bsDate && eventDate <= arDate;
    });
  }

  /**
   * 分类事项性质
   * 
   * @private
   * @param {SubsequentEvent[]} events - 事项列表
   * @param {string} balanceSheetDate - 资产负债表日
   * @returns {AnalyzedEvent[]} 分类后的事项
   */
  private classifyEvents(
    events: SubsequentEvent[],
    balanceSheetDate: string
  ): AnalyzedEvent[] {
    return events.map(event => {
      const nature = this.determineEventNature(event, balanceSheetDate);

      return {
        ...event,
        nature,
        significance: '一般' as const,
        impactAmount: event.amount || 0,
        requiresAdjustment: nature === '调整事项',
        requiresDisclosure: nature !== '无需处理',
        recommendation: '',
        impactAnalysis: '',
      };
    });
  }

  /**
   * 判断事项性质
   * 
   * @private
   * @param {SubsequentEvent} event - 事项
   * @param {string} balanceSheetDate - 资产负债表日
   * @returns {'调整事项' | '非调整事项' | '无需处理'} 事项性质
   */
  private determineEventNature(
    event: SubsequentEvent,
    balanceSheetDate: string
  ): '调整事项' | '非调整事项' | '无需处理' {
    const eventName = event.eventName.toLowerCase();
    const eventType = event.eventType.toLowerCase();
    const description = event.description.toLowerCase();

    // 调整事项的典型特征
    const adjustingIndicators = [
      '诉讼', '仲裁', '结案', '判决', '和解',
      '应收账款', '坏账', '无法收回',
      '存货', '毁损', '跌价', '减值',
      '债务重组', '破产', '清算',
      '税务稽查', '补缴', '退税',
    ];

    // 非调整事项的典型特征
    const nonAdjustingIndicators = [
      '股票发行', '债券发行', '增资',
      '重大投资', '收购', '兼并', '资产购买',
      '自然灾害', '火灾', '洪水', '地震',
      '重大合同', '新政策', '汇率变动',
      '停业', '重组', '业务调整',
    ];

    // 检查是否为调整事项
    if (adjustingIndicators.some(indicator => 
      eventName.includes(indicator) || 
      eventType.includes(indicator) || 
      description.includes(indicator)
    )) {
      return '调整事项';
    }

    // 检查是否为非调整事项
    if (nonAdjustingIndicators.some(indicator => 
      eventName.includes(indicator) || 
      eventType.includes(indicator) || 
      description.includes(indicator)
    )) {
      return '非调整事项';
    }

    // 默认为非调整事项，需要人工判断
    return '非调整事项';
  }

  /**
   * 评估重要性
   * 
   * @private
   * @param {AnalyzedEvent[]} events - 分类后的事项
   * @param {any} financialData - 财务数据
   * @param {Record<string, any>} config - 配置参数
   * @returns {AnalyzedEvent[]} 评估后的事项
   */
  private assessSignificance(
    events: AnalyzedEvent[],
    financialData: any,
    config: Record<string, any>
  ): AnalyzedEvent[] {
    const materialityAmount = config.materialityAmount || 100000;
    const significanceThreshold = config.significanceThreshold || 0.05;

    return events.map(event => {
      let significance: '重大' | '一般' | '轻微' = '轻微';

      // 1. 绝对金额判断
      if (event.impactAmount >= materialityAmount * 5) {
        significance = '重大';
      } else if (event.impactAmount >= materialityAmount) {
        significance = '一般';
      }

      // 2. 相对金额判断（如果有财务数据）
      if (financialData) {
        const relativeImpact = this.calculateRelativeImpact(event, financialData);
        if (relativeImpact >= significanceThreshold * 2) {
          significance = '重大';
        } else if (relativeImpact >= significanceThreshold) {
          significance = significance === '重大' ? '重大' : '一般';
        }
      }

      // 3. 性质判断
      if (event.nature === '调整事项' && event.impactAmount > 0) {
        significance = significance === '轻微' ? '一般' : significance;
      }

      return {
        ...event,
        significance,
      };
    });
  }

  /**
   * 计算相对影响
   * 
   * @private
   * @param {AnalyzedEvent} event - 事项
   * @param {any} financialData - 财务数据
   * @returns {number} 相对影响比例
   */
  private calculateRelativeImpact(event: AnalyzedEvent, financialData: any): number {
    if (!event.impactAmount || event.impactAmount === 0) return 0;

    // 根据影响科目选择比较基准
    if (event.affectedAccounts) {
      if (event.affectedAccounts.some(a => a.includes('收入') || a.includes('利润'))) {
        return Math.abs(event.impactAmount / (financialData.revenue || financialData.netProfit || 1));
      }
      if (event.affectedAccounts.some(a => a.includes('资产'))) {
        return Math.abs(event.impactAmount / (financialData.totalAssets || 1));
      }
      if (event.affectedAccounts.some(a => a.includes('权益') || a.includes('净资产'))) {
        return Math.abs(event.impactAmount / (financialData.totalEquity || 1));
      }
    }

    // 默认使用净利润作为基准
    return Math.abs(event.impactAmount / (financialData.netProfit || financialData.revenue || 1));
  }

  /**
   * 确定处理方式
   * 
   * @private
   * @param {AnalyzedEvent[]} events - 评估后的事项
   * @returns {AnalyzedEvent[]} 确定处理方式后的事项
   */
  private determineAction(events: AnalyzedEvent[]): AnalyzedEvent[] {
    return events.map(event => {
      let recommendation = '';
      let impactAnalysis = '';

      if (event.nature === '调整事项') {
        event.requiresAdjustment = true;
        event.requiresDisclosure = true;
        recommendation = '建议调整财务报表相关科目金额，并在附注中披露';
        impactAnalysis = `该事项属于调整事项，需要调整资产负债表日的财务报表。影响金额：${event.impactAmount}元`;
      } else if (event.nature === '非调整事项') {
        event.requiresAdjustment = false;
        
        if (event.significance === '重大') {
          event.requiresDisclosure = true;
          recommendation = '无需调整财务报表，但应在附注中充分披露';
          impactAnalysis = `该事项属于非调整事项，虽然不影响资产负债表日的财务报表，但对理解财务状况有重要意义，需要充分披露`;
        } else if (event.significance === '一般') {
          event.requiresDisclosure = true;
          recommendation = '建议在附注中简要披露';
          impactAnalysis = `该事项属于非调整事项，重要性一般，建议简要披露`;
        } else {
          event.requiresDisclosure = false;
          recommendation = '可不予披露';
          impactAnalysis = `该事项重要性较低，可不予披露`;
        }
      } else {
        event.requiresAdjustment = false;
        event.requiresDisclosure = false;
        recommendation = '无需特别处理';
        impactAnalysis = '该事项不具有重要性，无需特别处理';
      }

      return {
        ...event,
        recommendation,
        impactAnalysis,
      };
    });
  }

  /**
   * 计算汇总数据
   * 
   * @private
   * @param {AnalyzedEvent[]} events - 分析后的事项
   * @param {string} balanceSheetDate - 资产负债表日
   * @param {string} auditReportDate - 审计报告日
   * @returns {SubsequentEventsSummary} 汇总数据
   */
  private calculateSummary(
    events: AnalyzedEvent[],
    balanceSheetDate: string,
    auditReportDate: string
  ): SubsequentEventsSummary {
    const bsDate = new Date(balanceSheetDate);
    const arDate = new Date(auditReportDate);
    const daysAfter = Math.floor((arDate.getTime() - bsDate.getTime()) / (1000 * 60 * 60 * 24));

    const adjustingEvents = events.filter(e => e.nature === '调整事项');
    const nonAdjustingEvents = events.filter(e => e.nature === '非调整事项');
    const significantEvents = events.filter(e => e.significance === '重大');
    const requireAdjustment = events.filter(e => e.requiresAdjustment);
    const requireDisclosure = events.filter(e => e.requiresDisclosure);

    const totalAdjustmentAmount = requireAdjustment.reduce((sum, e) => sum + e.impactAmount, 0);

    // 找出最重大的事项
    const mostSignificant = events.reduce((max, e) => 
      (!max || e.impactAmount > max.impactAmount) ? e : max
    , undefined as AnalyzedEvent | undefined);

    return {
      balanceSheetDate,
      auditReportDate,
      daysAfter,
      totalEvents: events.length,
      adjustingEventsCount: adjustingEvents.length,
      nonAdjustingEventsCount: nonAdjustingEvents.length,
      significantEventsCount: significantEvents.length,
      requireAdjustmentCount: requireAdjustment.length,
      requireDisclosureCount: requireDisclosure.length,
      totalAdjustmentAmount,
      mostSignificantEvent: mostSignificant,
    };
  }

  /**
   * 导出期后事项清单
   * 
   * @private
   * @param {AnalyzedEvent[]} events - 分析后的事项
   * @returns {Promise<string>} 文件路径
   */
  private async exportEventsList(events: AnalyzedEvent[]): Promise<string> {
    const headers = [
      '事项编号',
      '事项名称',
      '发生日期',
      '事项类型',
      '事项性质',
      '重要性程度',
      '影响金额',
      '是否需要调整',
      '是否需要披露',
      '建议处理',
    ];

    const data = events.map(e => ({
      事项编号: e.eventNo,
      事项名称: e.eventName,
      发生日期: e.occurrenceDate,
      事项类型: e.eventType,
      事项性质: e.nature,
      重要性程度: e.significance,
      影响金额: e.impactAmount,
      是否需要调整: e.requiresAdjustment ? '是' : '否',
      是否需要披露: e.requiresDisclosure ? '是' : '否',
      建议处理: e.recommendation,
    }));

    return await this.exportExcel(
      data,
      headers,
      `期后事项清单_${Date.now()}.xlsx`
    );
  }

  /**
   * 导出调整事项清单
   * 
   * @private
   * @param {AnalyzedEvent[]} events - 调整事项
   * @returns {Promise<string>} 文件路径
   */
  private async exportAdjustingEvents(events: AnalyzedEvent[]): Promise<string> {
    const headers = [
      '事项编号',
      '事项名称',
      '发生日期',
      '影响金额',
      '影响科目',
      '调整说明',
      '影响分析',
    ];

    const data = events.map(e => ({
      事项编号: e.eventNo,
      事项名称: e.eventName,
      发生日期: e.occurrenceDate,
      影响金额: e.impactAmount,
      影响科目: e.affectedAccounts?.join('、') || '',
      调整说明: e.recommendation,
      影响分析: e.impactAnalysis,
    }));

    return await this.exportExcel(
      data,
      headers,
      `调整事项清单_${Date.now()}.xlsx`
    );
  }

  /**
   * 导出披露清单
   * 
   * @private
   * @param {AnalyzedEvent[]} events - 需披露事项
   * @returns {Promise<string>} 文件路径
   */
  private async exportDisclosureList(events: AnalyzedEvent[]): Promise<string> {
    const headers = [
      '事项编号',
      '事项名称',
      '发生日期',
      '事项性质',
      '重要性',
      '影响金额',
      '披露要点',
    ];

    const data = events.map(e => ({
      事项编号: e.eventNo,
      事项名称: e.eventName,
      发生日期: e.occurrenceDate,
      事项性质: e.nature,
      重要性: e.significance,
      影响金额: e.impactAmount,
      披露要点: this.getDisclosurePoints(e),
    }));

    return await this.exportExcel(
      data,
      headers,
      `披露事项清单_${Date.now()}.xlsx`
    );
  }

  /**
   * 获取披露要点
   * 
   * @private
   * @param {AnalyzedEvent} event - 事项
   * @returns {string} 披露要点
   */
  private getDisclosurePoints(event: AnalyzedEvent): string {
    const points: string[] = [];

    points.push(`事项内容：${event.description || event.eventName}`);
    points.push(`发生时间：${event.occurrenceDate}`);
    
    if (event.impactAmount > 0) {
      points.push(`影响金额：${event.impactAmount}元`);
    }

    if (event.affectedAccounts && event.affectedAccounts.length > 0) {
      points.push(`影响科目：${event.affectedAccounts.join('、')}`);
    }

    if (event.nature === '调整事项') {
      points.push('已对财务报表进行相应调整');
    }

    return points.join('；');
  }

  /**
   * 导出影响分析报告
   * 
   * @private
   * @param {AnalyzedEvent[]} events - 分析后的事项
   * @param {any} financialData - 财务数据
   * @returns {Promise<string>} 文件路径
   */
  private async exportImpactAnalysis(
    events: AnalyzedEvent[],
    financialData: any
  ): Promise<string> {
    const headers = [
      '事项名称',
      '事项性质',
      '影响金额',
      '相对影响',
      '影响分析',
      '处理建议',
    ];

    const data = events.map(e => ({
      事项名称: e.eventName,
      事项性质: e.nature,
      影响金额: e.impactAmount,
      相对影响: financialData 
        ? (this.calculateRelativeImpact(e, financialData) * 100).toFixed(2) + '%'
        : 'N/A',
      影响分析: e.impactAnalysis,
      处理建议: e.recommendation,
    }));

    return await this.exportExcel(
      data,
      headers,
      `期后事项影响分析_${Date.now()}.xlsx`
    );
  }

  /**
   * 生成期后事项核查审计底稿
   * 
   * @private
   * @param {SubsequentEventsSummary} summary - 汇总数据
   * @param {AnalyzedEvent[]} allEvents - 所有事项
   * @param {AnalyzedEvent[]} adjustingEvents - 调整事项
   * @param {AnalyzedEvent[]} disclosureEvents - 披露事项
   * @returns {Promise<string>} 底稿文件路径
   */
  private async generateSubsequentEventsWorkpaper(
    summary: SubsequentEventsSummary,
    allEvents: AnalyzedEvent[],
    adjustingEvents: AnalyzedEvent[],
    disclosureEvents: AnalyzedEvent[]
  ): Promise<string> {
    const sections: Array<{
      title: string;
      headers: string[];
      data: any[];
    }> = [
      {
        title: '一、期后事项核查程序执行情况',
        headers: ['指标', '数值', '说明'],
        data: [
          {
            指标: '资产负债表日',
            数值: summary.balanceSheetDate,
            说明: '财务报表截止日期',
          },
          {
            指标: '审计报告日',
            数值: summary.auditReportDate,
            说明: '审计报告签发日期',
          },
          {
            指标: '期后天数',
            数值: summary.daysAfter + '天',
            说明: '期后期间长度',
          },
          {
            指标: '识别事项总数',
            数值: summary.totalEvents + '个',
            说明: '期后期间内识别的事项',
          },
          {
            指标: '调整事项',
            数值: summary.adjustingEventsCount + '个',
            说明: '需要调整财务报表的事项',
          },
          {
            指标: '非调整事项',
            数值: summary.nonAdjustingEventsCount + '个',
            说明: '无需调整但需关注的事项',
          },
          {
            指标: '重大事项',
            数值: summary.significantEventsCount + '个',
            说明: '具有重大影响的事项',
          },
          {
            指标: '调整金额合计',
            数值: summary.totalAdjustmentAmount.toFixed(2) + '元',
            说明: '调整事项的影响金额',
          },
        ],
      },
      {
        title: '二、期后事项明细（前20项）',
        headers: ['事项名称', '发生日期', '事项性质', '重要性', '影响金额', '处理方式'],
        data: allEvents.slice(0, 20).map(e => ({
          事项名称: e.eventName,
          发生日期: e.occurrenceDate,
          事项性质: e.nature,
          重要性: e.significance,
          影响金额: e.impactAmount,
          处理方式: e.requiresAdjustment ? '调整+披露' : e.requiresDisclosure ? '仅披露' : '无需处理',
        })),
      },
    ];

    if (adjustingEvents.length > 0) {
      sections.push({
        title: '三、调整事项分析',
        headers: ['事项名称', '影响金额', '影响科目', '影响分析'],
        data: adjustingEvents.map(e => ({
          事项名称: e.eventName,
          影响金额: e.impactAmount,
          影响科目: e.affectedAccounts?.join('、') || '',
          影响分析: e.impactAnalysis,
        })),
      });
    }

    if (disclosureEvents.length > 0 && disclosureEvents.length !== adjustingEvents.length) {
      sections.push({
        title: '四、需披露的非调整事项',
        headers: ['事项名称', '发生日期', '重要性', '披露要点'],
        data: disclosureEvents
          .filter(e => e.nature === '非调整事项')
          .map(e => ({
            事项名称: e.eventName,
            发生日期: e.occurrenceDate,
            重要性: e.significance,
            披露要点: this.getDisclosurePoints(e),
          })),
      });
    }

    sections.push({
      title: '五、审计结论',
      headers: ['项目', '结论'],
      data: [
        {
          项目: '期后事项识别',
          结论: `在期后期间（${summary.daysAfter}天）内识别了${summary.totalEvents}个事项`,
        },
        {
          项目: '调整事项处理',
          结论: adjustingEvents.length > 0
            ? `识别出${adjustingEvents.length}个调整事项，合计影响金额${summary.totalAdjustmentAmount.toFixed(2)}元，已建议调整财务报表`
            : '未发现需要调整财务报表的期后事项',
        },
        {
          项目: '披露事项评估',
          结论: disclosureEvents.length > 0
            ? `识别出${disclosureEvents.length}个需要披露的事项，已建议在财务报表附注中充分披露`
            : '未发现需要特别披露的重大期后事项',
        },
        {
          项目: '重大事项关注',
          结论: summary.mostSignificantEvent
            ? `最重大的期后事项为"${summary.mostSignificantEvent.eventName}"，影响金额${summary.mostSignificantEvent.impactAmount}元`
            : '期后事项均不具有特别重大影响',
        },
        {
          项目: '审计意见',
          结论: this.getAuditOpinion(summary, adjustingEvents, disclosureEvents),
        },
      ],
    });

    return await this.generateWorkpaper(
      '期后事项核查审计工作底稿',
      sections
    );
  }

  /**
   * 获取审计意见
   * 
   * @private
   * @param {SubsequentEventsSummary} summary - 汇总数据
   * @param {AnalyzedEvent[]} adjustingEvents - 调整事项
   * @param {AnalyzedEvent[]} disclosureEvents - 披露事项
   * @returns {string} 审计意见
   */
  private getAuditOpinion(
    summary: SubsequentEventsSummary,
    adjustingEvents: AnalyzedEvent[],
    disclosureEvents: AnalyzedEvent[]
  ): string {
    const opinions: string[] = [];

    if (adjustingEvents.length === 0 && disclosureEvents.length === 0) {
      return '期后事项核查未发现需要调整或披露的重大事项，财务报表在资产负债表日的列报是恰当的';
    }

    if (adjustingEvents.length > 0) {
      if (summary.totalAdjustmentAmount > 1000000) {
        opinions.push(`识别出重大调整事项，合计影响金额${summary.totalAdjustmentAmount.toFixed(2)}元，建议调整财务报表并充分披露`);
      } else {
        opinions.push(`识别出${adjustingEvents.length}个调整事项，建议对财务报表进行相应调整`);
      }
    }

    if (disclosureEvents.length > adjustingEvents.length) {
      const nonAdjustingDisclosure = disclosureEvents.length - adjustingEvents.length;
      opinions.push(`识别出${nonAdjustingDisclosure}个需要披露的非调整事项，虽然不影响报表金额，但对理解财务状况有重要意义`);
    }

    if (summary.significantEventsCount > 3) {
      opinions.push('期后发生了较多重大事项，建议与被审计单位充分沟通，确保披露的完整性和准确性');
    }

    return opinions.join('；');
  }
}
