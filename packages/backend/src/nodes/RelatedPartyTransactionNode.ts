/**
 * 关联方交易核查节点
 * 
 * @description 识别和分析关联方交易，评估交易公允性
 * 检查关联方披露的完整性，识别异常交易和潜在风险
 * 
 * @author SHENJI Team
 * @date 2025-12-04
 * @version 1.0.0
 * @since Week 2: 核心节点开发 - 特殊交易
 * 
 * @example
 * ```typescript
 * const node = new RelatedPartyTransactionNode();
 * const result = await node.execute({
 *   relatedPartyList: '/path/to/parties.xlsx',
 *   transactionRecords: '/path/to/transactions.xlsx'
 * }, {
 *   materialityAmount: 100000
 * });
 * ```
 */

import { BaseNode, NodeExecutionResult } from './BaseNode';
import { BusinessError, ErrorCode } from '../constants/ErrorCode';

/**
 * 关联方信息接口
 */
interface RelatedParty {
  /** 关联方编号 */
  partyCode: string;
  /** 关联方名称 */
  partyName: string;
  /** 关联关系类型 */
  relationshipType: string;
  /** 关联关系说明 */
  relationshipDesc?: string;
  /** 是否为法人 */
  isLegalEntity: boolean;
  /** 统一社会信用代码/身份证号 */
  identityCode?: string;
  /** 持股比例 */
  shareholdingRatio?: number;
  /** 职务 */
  position?: string;
}

/**
 * 交易记录接口
 */
interface TransactionRecord {
  /** 交易编号 */
  transactionNo: string;
  /** 交易日期 */
  transactionDate: string;
  /** 交易对手方 */
  counterparty: string;
  /** 交易类型 */
  transactionType: string;
  /** 交易金额 */
  amount: number;
  /** 交易内容 */
  description?: string;
  /** 定价方式 */
  pricingMethod?: string;
  /** 结算方式 */
  settlementMethod?: string;
}

/**
 * 关联交易记录接口
 */
interface RelatedTransaction extends TransactionRecord {
  /** 关联方编号 */
  partyCode: string;
  /** 关联方名称 */
  partyName: string;
  /** 关联关系类型 */
  relationshipType: string;
  /** 是否异常 */
  isAbnormal: boolean;
  /** 异常类型 */
  abnormalType?: string[];
  /** 异常原因 */
  abnormalReason?: string;
  /** 公允性评估 */
  fairnessAssessment?: '公允' | '基本公允' | '可能不公允' | '无法判断';
  /** 市场价格 */
  marketPrice?: number;
  /** 价格差异率 */
  priceDifferenceRate?: number;
  /** 风险等级 */
  riskLevel?: '低' | '中' | '高';
}

/**
 * 关联交易汇总接口
 */
interface RelatedTransactionSummary {
  /** 关联方总数 */
  totalParties: number;
  /** 关联交易总笔数 */
  totalTransactions: number;
  /** 关联交易总金额 */
  totalAmount: number;
  /** 按关系类型分类 */
  byRelationshipType: Map<string, { count: number; amount: number }>;
  /** 按交易类型分类 */
  byTransactionType: Map<string, { count: number; amount: number }>;
  /** 异常交易数 */
  abnormalCount: number;
  /** 异常交易金额 */
  abnormalAmount: number;
  /** 高风险交易数 */
  highRiskCount: number;
  /** 高风险交易金额 */
  highRiskAmount: number;
  /** 公允交易占比 */
  fairnessRate: number;
  /** 披露完整性评分 */
  disclosureScore: number;
}

/**
 * 关联方交易核查节点
 * 
 * @description 执行关联方交易核查程序的审计节点
 * 包括关联方识别、交易匹配、公允性分析、风险评估等完整流程
 * 
 * @extends {BaseNode}
 */
export class RelatedPartyTransactionNode extends BaseNode {
  /**
   * 节点元数据
   */
  static metadata = {
    id: 'related-party-transaction',
    name: '关联方交易核查',
    category: '特殊交易',
    description: '识别和分析关联方交易，评估交易公允性和披露完整性',
    icon: 'users-link',
    version: '1.0.0',
  };

  /**
   * 输入定义
   */
  static inputs = [
    {
      name: 'relatedPartyList',
      label: '关联方清单',
      type: 'excel' as const,
      required: true,
      description: '企业提供的关联方清单（包含：关联方名称、关联关系、持股比例等）',
    },
    {
      name: 'transactionRecords',
      label: '交易记录',
      type: 'excel' as const,
      required: true,
      description: '全年交易记录（包含：交易日期、对手方、金额、交易类型等）',
    },
    {
      name: 'marketPrices',
      label: '市场价格参考',
      type: 'excel' as const,
      required: false,
      description: '市场价格参考数据（可选，用于公允性评估）',
    },
    {
      name: 'financialStatements',
      label: '财务报表',
      type: 'excel' as const,
      required: false,
      description: '财务报表数据（可选，用于计算关联交易占比）',
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
      description: '关联交易核查的汇总数据（交易数量、金额、异常情况等关键指标）',
    },
    {
      name: 'relatedTransactionList',
      label: '关联交易清单',
      type: 'excel' as const,
      description: '识别出的关联交易明细清单',
    },
    {
      name: 'abnormalTransactionList',
      label: '异常交易清单',
      type: 'excel' as const,
      description: '异常关联交易明细及风险分析',
    },
    {
      name: 'fairnessAnalysis',
      label: '公允性分析报告',
      type: 'excel' as const,
      description: '关联交易公允性评估报告',
    },
    {
      name: 'disclosureChecklist',
      label: '披露检查清单',
      type: 'excel' as const,
      description: '关联方披露完整性检查清单',
    },
    {
      name: 'workpaper',
      label: '审计底稿',
      type: 'excel' as const,
      description: '关联方交易核查审计工作底稿',
    },
  ];

  /**
   * 配置项定义
   */
  static config = {
    materialityAmount: {
      label: '重要性金额',
      type: 'number' as const,
      default: 100000,
      description: '重要性金额阈值（元），超过此金额的关联交易需要重点关注',
    },
    priceDifferenceThreshold: {
      label: '价格差异阈值',
      type: 'number' as const,
      default: 0.1,
      description: '价格差异阈值（如0.1表示10%），超过此比例视为价格异常',
    },
    checkFrequency: {
      label: '是否检查交易频率',
      type: 'boolean' as const,
      default: true,
      description: '是否检查交易频率异常（如短期内频繁交易）',
    },
    checkConcentration: {
      label: '是否检查交易集中度',
      type: 'boolean' as const,
      default: true,
      description: '是否检查关联交易集中度（如某关联方占比过高）',
    },
    requireMarketPrice: {
      label: '是否要求市场价格',
      type: 'boolean' as const,
      default: false,
      description: '是否要求提供市场价格进行公允性对比',
    },
  };

  /**
   * 执行节点逻辑
   * 
   * @description 执行关联方交易核查的完整流程
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
      this.log('========== 开始执行关联方交易核查节点 ==========');

      // 1. 验证输入
      await this.validateInputs(inputs);
      this.log('✓ 输入验证通过');

      // 2. 解析关联方清单
      this.log('开始解析关联方清单...');
      const parties = await this.parseExcel(inputs.relatedPartyList);
      this.log(`✓ 成功解析关联方：${parties.length}个`);

      // 3. 解析交易记录
      this.log('开始解析交易记录...');
      const transactions = await this.parseExcel(inputs.transactionRecords);
      this.log(`✓ 成功解析交易记录：${transactions.length}笔`);

      // 4. 解析市场价格（如果有）
      let marketPrices: any[] = [];
      if (inputs.marketPrices) {
        marketPrices = await this.parseExcel(inputs.marketPrices);
        this.log(`✓ 成功解析市场价格：${marketPrices.length}条`);
      }

      // 5. 数据清洗
      this.log('开始数据清洗...');
      const cleanedParties = this.cleanRelatedParties(parties);
      const cleanedTransactions = this.cleanTransactions(transactions);
      this.log('✓ 数据清洗完成');

      // 6. 构建关联方索引
      this.log('构建关联方索引...');
      const partyIndex = this.buildPartyIndex(cleanedParties);
      this.log(`✓ 关联方索引构建完成`);

      // 7. 识别关联交易
      this.log('识别关联交易...');
      const relatedTransactions = this.identifyRelatedTransactions(
        cleanedTransactions,
        partyIndex
      );
      this.log(`✓ 识别出关联交易：${relatedTransactions.length}笔`);

      // 8. 公允性分析
      this.log('执行公允性分析...');
      const analyzedTransactions = this.analyzeFairness(
        relatedTransactions,
        marketPrices,
        config.priceDifferenceThreshold || 0.1
      );
      this.log('✓ 公允性分析完成');

      // 9. 异常检测
      this.log('执行异常检测...');
      const abnormalTransactions = this.detectAbnormalTransactions(
        analyzedTransactions,
        config
      );
      this.log(`✓ 识别出异常交易：${abnormalTransactions.length}笔`);

      // 10. 风险评估
      this.log('执行风险评估...');
      const riskAssessedTransactions = this.assessRisk(analyzedTransactions, config);
      this.log('✓ 风险评估完成');

      // 11. 计算汇总数据
      this.log('计算汇总数据...');
      const summary = this.calculateSummary(
        cleanedParties,
        riskAssessedTransactions,
        abnormalTransactions
      );
      this.log('✓ 汇总数据计算完成');

      // 12. 生成披露检查清单
      this.log('生成披露检查清单...');
      const disclosureChecklist = this.generateDisclosureChecklist(
        cleanedParties,
        riskAssessedTransactions
      );
      this.log('✓ 披露检查清单已生成');

      // 13. 导出关联交易清单
      this.log('导出关联交易清单...');
      const transactionListPath = await this.exportRelatedTransactionList(
        riskAssessedTransactions
      );
      this.log(`✓ 关联交易清单已导出：${transactionListPath}`);

      // 14. 导出异常交易清单
      let abnormalListPath = '';
      if (abnormalTransactions.length > 0) {
        this.log('导出异常交易清单...');
        abnormalListPath = await this.exportAbnormalTransactionList(abnormalTransactions);
        this.log(`✓ 异常交易清单已导出：${abnormalListPath}`);
      }

      // 15. 导出公允性分析报告
      this.log('导出公允性分析报告...');
      const fairnessAnalysisPath = await this.exportFairnessAnalysis(
        riskAssessedTransactions
      );
      this.log(`✓ 公允性分析报告已导出：${fairnessAnalysisPath}`);

      // 16. 导出披露检查清单
      this.log('导出披露检查清单...');
      const disclosureChecklistPath = await this.exportDisclosureChecklist(
        disclosureChecklist
      );
      this.log(`✓ 披露检查清单已导出：${disclosureChecklistPath}`);

      // 17. 生成审计底稿
      this.log('生成审计底稿...');
      const workpaperPath = await this.generateRelatedPartyWorkpaper(
        summary,
        riskAssessedTransactions,
        abnormalTransactions,
        disclosureChecklist
      );
      this.log(`✓ 审计底稿已生成：${workpaperPath}`);

      // 18. 完成执行
      const duration = Date.now() - startTime;
      this.log(`========== 关联方交易核查节点执行完成，耗时：${duration}ms ==========`);

      return {
        success: true,
        data: {
          summary,
          relatedTransactions: riskAssessedTransactions,
          abnormalTransactions,
          disclosureChecklist,
        },
        outputs: {
          summary,
          relatedTransactionList: transactionListPath,
          abnormalTransactionList: abnormalListPath || null,
          fairnessAnalysis: fairnessAnalysisPath,
          disclosureChecklist: disclosureChecklistPath,
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
   * 清洗关联方数据
   * 
   * @description 规范化关联方数据格式
   * 
   * @private
   * @param {any[]} parties - 原始关联方数据
   * @returns {RelatedParty[]} 清洗后的数据
   */
  private cleanRelatedParties(parties: any[]): RelatedParty[] {
    return parties
      .filter(p => p.关联方名称)
      .map((p, index) => ({
        partyCode: p.关联方编号 ? String(p.关联方编号).trim() : `RP${String(index + 1).padStart(4, '0')}`,
        partyName: String(p.关联方名称).trim(),
        relationshipType: String(p.关联关系类型 || p.关系类型 || '其他').trim(),
        relationshipDesc: p.关联关系说明 ? String(p.关联关系说明).trim() : undefined,
        isLegalEntity: this.determineIsLegalEntity(p),
        identityCode: p.统一社会信用代码 || p.身份证号 ? String(p.统一社会信用代码 || p.身份证号).trim() : undefined,
        shareholdingRatio: p.持股比例 ? Number(p.持股比例) : undefined,
        position: p.职务 ? String(p.职务).trim() : undefined,
      }));
  }

  /**
   * 判断是否为法人实体
   * 
   * @description 根据数据特征判断关联方是否为法人实体
   * 
   * @private
   * @param {any} party - 关联方数据
   * @returns {boolean} 是否为法人
   */
  private determineIsLegalEntity(party: any): boolean {
    // 如果有统一社会信用代码，通常是法人
    if (party.统一社会信用代码) return true;
    
    // 如果有身份证号，通常是自然人
    if (party.身份证号) return false;
    
    // 根据关系类型判断
    const type = String(party.关联关系类型 || party.关系类型 || '').toLowerCase();
    if (type.includes('公司') || type.includes('企业') || type.includes('子公司') || type.includes('母公司')) {
      return true;
    }
    if (type.includes('董事') || type.includes('监事') || type.includes('经理') || type.includes('股东')) {
      return false;
    }
    
    // 默认返回true
    return true;
  }

  /**
   * 清洗交易记录数据
   * 
   * @description 规范化交易记录格式
   * 
   * @private
   * @param {any[]} transactions - 原始交易数据
   * @returns {TransactionRecord[]} 清洗后的数据
   */
  private cleanTransactions(transactions: any[]): TransactionRecord[] {
    return transactions
      .filter(t => t.交易对手方 && t.交易金额)
      .map(t => ({
        transactionNo: t.交易编号 ? String(t.交易编号).trim() : '',
        transactionDate: this.normalizeDate(t.交易日期 || t.日期),
        counterparty: String(t.交易对手方 || t.对手方).trim(),
        transactionType: String(t.交易类型 || t.业务类型 || '其他').trim(),
        amount: Number(t.交易金额 || t.金额 || 0),
        description: t.交易内容 ? String(t.交易内容).trim() : undefined,
        pricingMethod: t.定价方式 ? String(t.定价方式).trim() : undefined,
        settlementMethod: t.结算方式 ? String(t.结算方式).trim() : undefined,
      }));
  }

  /**
   * 规范化日期格式
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
   * 构建关联方索引
   * 
   * @description 建立快速查找的关联方索引
   * 
   * @private
   * @param {RelatedParty[]} parties - 关联方列表
   * @returns {Map<string, RelatedParty>} 关联方索引
   */
  private buildPartyIndex(parties: RelatedParty[]): Map<string, RelatedParty> {
    const index = new Map<string, RelatedParty>();
    
    parties.forEach(party => {
      // 使用名称作为主键
      index.set(party.partyName.toLowerCase(), party);
      
      // 如果有编号，也添加编号索引
      if (party.partyCode) {
        index.set(party.partyCode.toLowerCase(), party);
      }
      
      // 如果有身份代码，也添加代码索引
      if (party.identityCode) {
        index.set(party.identityCode.toLowerCase(), party);
      }
    });
    
    return index;
  }

  /**
   * 识别关联交易
   * 
   * @description 从全部交易中识别出关联方交易
   * 
   * @private
   * @param {TransactionRecord[]} transactions - 交易记录
   * @param {Map<string, RelatedParty>} partyIndex - 关联方索引
   * @returns {RelatedTransaction[]} 关联交易
   */
  private identifyRelatedTransactions(
    transactions: TransactionRecord[],
    partyIndex: Map<string, RelatedParty>
  ): RelatedTransaction[] {
    const relatedTransactions: RelatedTransaction[] = [];
    
    transactions.forEach(transaction => {
      const counterpartyKey = transaction.counterparty.toLowerCase();
      const party = partyIndex.get(counterpartyKey);
      
      if (party) {
        relatedTransactions.push({
          ...transaction,
          partyCode: party.partyCode,
          partyName: party.partyName,
          relationshipType: party.relationshipType,
          isAbnormal: false,
        });
      }
    });
    
    return relatedTransactions;
  }

  /**
   * 公允性分析
   * 
   * @description 分析关联交易的公允性
   * 
   * @private
   * @param {RelatedTransaction[]} transactions - 关联交易
   * @param {any[]} marketPrices - 市场价格
   * @param {number} threshold - 差异阈值
   * @returns {RelatedTransaction[]} 分析后的交易
   */
  private analyzeFairness(
    transactions: RelatedTransaction[],
    marketPrices: any[],
    threshold: number
  ): RelatedTransaction[] {
    const priceMap = new Map<string, number>();
    marketPrices.forEach(p => {
      if (p.产品名称 && p.市场价格) {
        priceMap.set(String(p.产品名称).trim().toLowerCase(), Number(p.市场价格));
      }
    });

    return transactions.map(t => {
      // 如果没有市场价格数据，无法判断
      if (priceMap.size === 0 || !t.description) {
        return {
          ...t,
          fairnessAssessment: '无法判断' as const,
        };
      }

      const descKey = t.description.toLowerCase();
      const marketPrice = priceMap.get(descKey);
      
      if (!marketPrice) {
        return {
          ...t,
          fairnessAssessment: '无法判断' as const,
        };
      }

      const transactionPrice = t.amount; // 简化处理，实际应考虑数量
      const priceDiff = Math.abs(transactionPrice - marketPrice) / marketPrice;
      
      let assessment: '公允' | '基本公允' | '可能不公允' | '无法判断';
      if (priceDiff <= threshold / 2) {
        assessment = '公允';
      } else if (priceDiff <= threshold) {
        assessment = '基本公允';
      } else {
        assessment = '可能不公允';
      }

      return {
        ...t,
        marketPrice,
        priceDifferenceRate: priceDiff,
        fairnessAssessment: assessment,
      };
    });
  }

  /**
   * 检测异常交易
   * 
   * @description 识别异常的关联交易
   * 
   * @private
   * @param {RelatedTransaction[]} transactions - 关联交易
   * @param {Record<string, any>} config - 配置参数
   * @returns {RelatedTransaction[]} 异常交易
   */
  private detectAbnormalTransactions(
    transactions: RelatedTransaction[],
    config: Record<string, any>
  ): RelatedTransaction[] {
    const materialityAmount = config.materialityAmount || 100000;
    const checkFrequency = config.checkFrequency !== false;
    const checkConcentration = config.checkConcentration !== false;

    return transactions
      .map(t => {
        const abnormalTypes: string[] = [];
        let abnormalReason = '';

        // 1. 检查金额异常
        if (t.amount >= materialityAmount * 10) {
          abnormalTypes.push('金额重大');
          abnormalReason += '交易金额特别巨大；';
        }

        // 2. 检查公允性异常
        if (t.fairnessAssessment === '可能不公允') {
          abnormalTypes.push('价格异常');
          abnormalReason += '交易价格与市场价格差异较大；';
        }

        // 3. 检查定价方式异常
        if (!t.pricingMethod || t.pricingMethod === '协议价' || t.pricingMethod === '约定价') {
          abnormalTypes.push('定价方式可疑');
          abnormalReason += '定价方式缺乏市场参考；';
        }

        // 4. 检查结算方式异常
        if (t.settlementMethod === '挂账' || t.settlementMethod === '无偿') {
          abnormalTypes.push('结算方式异常');
          abnormalReason += '结算方式不符合常规；';
        }

        if (abnormalTypes.length > 0) {
          return {
            ...t,
            isAbnormal: true,
            abnormalType: abnormalTypes,
            abnormalReason: abnormalReason.slice(0, -1),
          };
        }

        return t;
      })
      .filter(t => t.isAbnormal);
  }

  /**
   * 风险评估
   * 
   * @description 评估关联交易的风险等级
   * 
   * @private
   * @param {RelatedTransaction[]} transactions - 关联交易
   * @param {Record<string, any>} config - 配置参数
   * @returns {RelatedTransaction[]} 评估后的交易
   */
  private assessRisk(
    transactions: RelatedTransaction[],
    config: Record<string, any>
  ): RelatedTransaction[] {
    const materialityAmount = config.materialityAmount || 100000;

    return transactions.map(t => {
      let riskScore = 0;

      // 1. 金额风险
      if (t.amount >= materialityAmount * 10) {
        riskScore += 3;
      } else if (t.amount >= materialityAmount) {
        riskScore += 2;
      } else {
        riskScore += 1;
      }

      // 2. 公允性风险
      if (t.fairnessAssessment === '可能不公允') {
        riskScore += 3;
      } else if (t.fairnessAssessment === '无法判断') {
        riskScore += 2;
      } else if (t.fairnessAssessment === '基本公允') {
        riskScore += 1;
      }

      // 3. 关系类型风险
      if (t.relationshipType.includes('控股') || t.relationshipType.includes('母公司')) {
        riskScore += 2;
      }

      // 4. 异常交易风险
      if (t.isAbnormal) {
        riskScore += t.abnormalType?.length || 0;
      }

      // 确定风险等级
      let riskLevel: '低' | '中' | '高';
      if (riskScore >= 7) {
        riskLevel = '高';
      } else if (riskScore >= 4) {
        riskLevel = '中';
      } else {
        riskLevel = '低';
      }

      return {
        ...t,
        riskLevel,
      };
    });
  }

  /**
   * 计算汇总数据
   * 
   * @description 统计关联交易的关键指标
   * 
   * @private
   * @param {RelatedParty[]} parties - 关联方列表
   * @param {RelatedTransaction[]} transactions - 关联交易
   * @param {RelatedTransaction[]} abnormals - 异常交易
   * @returns {RelatedTransactionSummary} 汇总数据
   */
  private calculateSummary(
    parties: RelatedParty[],
    transactions: RelatedTransaction[],
    abnormals: RelatedTransaction[]
  ): RelatedTransactionSummary {
    const byRelationshipType = new Map<string, { count: number; amount: number }>();
    const byTransactionType = new Map<string, { count: number; amount: number }>();

    transactions.forEach(t => {
      // 按关系类型分类
      const relType = byRelationshipType.get(t.relationshipType) || { count: 0, amount: 0 };
      relType.count++;
      relType.amount += t.amount;
      byRelationshipType.set(t.relationshipType, relType);

      // 按交易类型分类
      const transType = byTransactionType.get(t.transactionType) || { count: 0, amount: 0 };
      transType.count++;
      transType.amount += t.amount;
      byTransactionType.set(t.transactionType, transType);
    });

    const highRiskTransactions = transactions.filter(t => t.riskLevel === '高');
    const fairTransactions = transactions.filter(
      t => t.fairnessAssessment === '公允' || t.fairnessAssessment === '基本公允'
    );

    // 计算披露完整性评分（简化计算）
    const disclosureScore = this.calculateDisclosureScore(parties, transactions);

    return {
      totalParties: parties.length,
      totalTransactions: transactions.length,
      totalAmount: transactions.reduce((sum, t) => sum + t.amount, 0),
      byRelationshipType,
      byTransactionType,
      abnormalCount: abnormals.length,
      abnormalAmount: abnormals.reduce((sum, t) => sum + t.amount, 0),
      highRiskCount: highRiskTransactions.length,
      highRiskAmount: highRiskTransactions.reduce((sum, t) => sum + t.amount, 0),
      fairnessRate: transactions.length > 0 ? fairTransactions.length / transactions.length : 0,
      disclosureScore,
    };
  }

  /**
   * 计算披露完整性评分
   * 
   * @description 评估关联方披露的完整性
   * 
   * @private
   * @param {RelatedParty[]} parties - 关联方列表
   * @param {RelatedTransaction[]} transactions - 关联交易
   * @returns {number} 评分(0-100)
   */
  private calculateDisclosureScore(
    parties: RelatedParty[],
    transactions: RelatedTransaction[]
  ): number {
    let score = 100;

    // 1. 检查关联方信息完整性
    parties.forEach(p => {
      if (!p.relationshipDesc) score -= 1;
      if (!p.identityCode) score -= 1;
    });

    // 2. 检查交易信息完整性
    transactions.forEach(t => {
      if (!t.pricingMethod) score -= 0.5;
      if (!t.settlementMethod) score -= 0.5;
      if (!t.description) score -= 0.5;
    });

    return Math.max(0, Math.min(100, score));
  }

  /**
   * 生成披露检查清单
   * 
   * @description 生成关联方披露完整性检查清单
   * 
   * @private
   * @param {RelatedParty[]} parties - 关联方列表
   * @param {RelatedTransaction[]} transactions - 关联交易
   * @returns {any[]} 检查清单
   */
  private generateDisclosureChecklist(
    parties: RelatedParty[],
    transactions: RelatedTransaction[]
  ): any[] {
    const checklist: any[] = [];

    // 1. 关联方信息披露检查
    checklist.push({
      检查项: '关联方数量',
      要求: '披露所有关联方',
      实际: `${parties.length}个`,
      符合性: '需人工确认',
    });

    checklist.push({
      检查项: '关联关系说明',
      要求: '说明具体关联关系',
      实际: `${parties.filter(p => p.relationshipDesc).length}/${parties.length}个有说明`,
      符合性: parties.every(p => p.relationshipDesc) ? '符合' : '部分缺失',
    });

    // 2. 关联交易披露检查
    checklist.push({
      检查项: '关联交易数量',
      要求: '披露所有关联交易',
      实际: `${transactions.length}笔`,
      符合性: '需人工确认',
    });

    checklist.push({
      检查项: '交易定价依据',
      要求: '说明定价方式和依据',
      实际: `${transactions.filter(t => t.pricingMethod).length}/${transactions.length}笔有说明`,
      符合性: transactions.every(t => t.pricingMethod) ? '符合' : '部分缺失',
    });

    checklist.push({
      检查项: '交易必要性和持续性',
      要求: '说明交易的商业实质',
      实际: '需人工确认',
      符合性: '需人工确认',
    });

    return checklist;
  }

  /**
   * 导出关联交易清单
   * 
   * @private
   * @param {RelatedTransaction[]} transactions - 关联交易
   * @returns {Promise<string>} 文件路径
   */
  private async exportRelatedTransactionList(
    transactions: RelatedTransaction[]
  ): Promise<string> {
    const headers = [
      '交易编号',
      '交易日期',
      '关联方名称',
      '关联关系',
      '交易类型',
      '交易金额',
      '定价方式',
      '公允性评估',
      '风险等级',
    ];

    const data = transactions.map(t => ({
      交易编号: t.transactionNo,
      交易日期: t.transactionDate,
      关联方名称: t.partyName,
      关联关系: t.relationshipType,
      交易类型: t.transactionType,
      交易金额: t.amount,
      定价方式: t.pricingMethod || '',
      公允性评估: t.fairnessAssessment || '无法判断',
      风险等级: t.riskLevel || '中',
    }));

    return await this.exportExcel(
      data,
      headers,
      `关联交易清单_${Date.now()}.xlsx`
    );
  }

  /**
   * 导出异常交易清单
   * 
   * @private
   * @param {RelatedTransaction[]} abnormals - 异常交易
   * @returns {Promise<string>} 文件路径
   */
  private async exportAbnormalTransactionList(
    abnormals: RelatedTransaction[]
  ): Promise<string> {
    const headers = [
      '交易编号',
      '交易日期',
      '关联方名称',
      '交易金额',
      '异常类型',
      '异常原因',
      '风险等级',
      '审计建议',
    ];

    const data = abnormals.map(t => ({
      交易编号: t.transactionNo,
      交易日期: t.transactionDate,
      关联方名称: t.partyName,
      交易金额: t.amount,
      异常类型: t.abnormalType?.join('、') || '',
      异常原因: t.abnormalReason || '',
      风险等级: t.riskLevel || '中',
      审计建议: this.getAuditSuggestion(t),
    }));

    return await this.exportExcel(
      data,
      headers,
      `异常关联交易清单_${Date.now()}.xlsx`
    );
  }

  /**
   * 获取审计建议
   * 
   * @private
   * @param {RelatedTransaction} transaction - 交易记录
   * @returns {string} 审计建议
   */
  private getAuditSuggestion(transaction: RelatedTransaction): string {
    if (transaction.riskLevel === '高') {
      return '建议重点关注，进一步核实交易背景和商业实质，必要时获取第三方证据';
    } else if (transaction.fairnessAssessment === '可能不公允') {
      return '建议获取市场价格证据，评估价格公允性';
    } else if (transaction.amount > 1000000) {
      return '金额较大，建议核实交易真实性和必要性';
    } else {
      return '建议关注交易的持续性和必要性';
    }
  }

  /**
   * 导出公允性分析报告
   * 
   * @private
   * @param {RelatedTransaction[]} transactions - 关联交易
   * @returns {Promise<string>} 文件路径
   */
  private async exportFairnessAnalysis(
    transactions: RelatedTransaction[]
  ): Promise<string> {
    const headers = [
      '关联方名称',
      '交易类型',
      '交易金额',
      '市场价格',
      '价格差异率',
      '公允性评估',
      '评估说明',
    ];

    const data = transactions.map(t => ({
      关联方名称: t.partyName,
      交易类型: t.transactionType,
      交易金额: t.amount,
      市场价格: t.marketPrice || '无参考',
      价格差异率: t.priceDifferenceRate 
        ? (t.priceDifferenceRate * 100).toFixed(2) + '%'
        : 'N/A',
      公允性评估: t.fairnessAssessment || '无法判断',
      评估说明: this.getFairnessExplanation(t),
    }));

    return await this.exportExcel(
      data,
      headers,
      `关联交易公允性分析_${Date.now()}.xlsx`
    );
  }

  /**
   * 获取公允性评估说明
   * 
   * @private
   * @param {RelatedTransaction} transaction - 交易记录
   * @returns {string} 评估说明
   */
  private getFairnessExplanation(transaction: RelatedTransaction): string {
    if (!transaction.fairnessAssessment) {
      return '缺少市场价格参考，无法判断公允性';
    }
    
    switch (transaction.fairnessAssessment) {
      case '公允':
        return '交易价格与市场价格基本一致，定价公允';
      case '基本公允':
        return '交易价格与市场价格存在小幅差异，但在合理范围内';
      case '可能不公允':
        return '交易价格与市场价格差异较大，需要进一步核实定价依据';
      default:
        return '无市场价格参考数据';
    }
  }

  /**
   * 导出披露检查清单
   * 
   * @private
   * @param {any[]} checklist - 检查清单
   * @returns {Promise<string>} 文件路径
   */
  private async exportDisclosureChecklist(checklist: any[]): Promise<string> {
    const headers = ['检查项', '要求', '实际', '符合性'];

    return await this.exportExcel(
      checklist,
      headers,
      `关联方披露检查清单_${Date.now()}.xlsx`
    );
  }

  /**
   * 生成关联方交易核查审计底稿
   * 
   * @private
   * @param {RelatedTransactionSummary} summary - 汇总数据
   * @param {RelatedTransaction[]} transactions - 关联交易
   * @param {RelatedTransaction[]} abnormals - 异常交易
   * @param {any[]} checklist - 披露检查清单
   * @returns {Promise<string>} 底稿文件路径
   */
  private async generateRelatedPartyWorkpaper(
    summary: RelatedTransactionSummary,
    transactions: RelatedTransaction[],
    abnormals: RelatedTransaction[],
    checklist: any[]
  ): Promise<string> {
    const sections: Array<{
      title: string;
      headers: string[];
      data: any[];
    }> = [
      {
        title: '一、关联方交易核查概况',
        headers: ['指标', '数值', '说明'],
        data: [
          {
            指标: '关联方总数',
            数值: summary.totalParties + '个',
            说明: '企业提供的关联方清单',
          },
          {
            指标: '关联交易总笔数',
            数值: summary.totalTransactions + '笔',
            说明: '识别出的关联交易',
          },
          {
            指标: '关联交易总金额',
            数值: summary.totalAmount.toFixed(2) + '元',
            说明: '全年关联交易金额',
          },
          {
            指标: '异常交易数',
            数值: summary.abnormalCount + '笔',
            说明: '占比: ' + ((summary.abnormalCount / summary.totalTransactions) * 100).toFixed(2) + '%',
          },
          {
            指标: '高风险交易数',
            数值: summary.highRiskCount + '笔',
            说明: '金额: ' + summary.highRiskAmount.toFixed(2) + '元',
          },
          {
            指标: '公允性评估',
            数值: (summary.fairnessRate * 100).toFixed(2) + '%公允',
            说明: summary.fairnessRate >= 0.9 ? '✓ 总体公允' : '需关注',
          },
          {
            指标: '披露完整性',
            数值: summary.disclosureScore.toFixed(0) + '分',
            说明: summary.disclosureScore >= 90 ? '✓ 完整' : '需改进',
          },
        ],
      },
      {
        title: '二、关联交易明细（前20笔）',
        headers: ['关联方', '交易类型', '交易金额', '公允性', '风险等级'],
        data: transactions.slice(0, 20).map(t => ({
          关联方: t.partyName,
          交易类型: t.transactionType,
          交易金额: t.amount,
          公允性: t.fairnessAssessment || '无法判断',
          风险等级: t.riskLevel || '中',
        })),
      },
    ];

    if (abnormals.length > 0) {
      sections.push({
        title: '三、异常交易分析',
        headers: ['关联方', '交易金额', '异常类型', '异常原因', '风险等级'],
        data: abnormals.slice(0, 20).map(t => ({
          关联方: t.partyName,
          交易金额: t.amount,
          异常类型: t.abnormalType?.join('、') || '',
          异常原因: t.abnormalReason || '',
          风险等级: t.riskLevel || '中',
        })),
      });
    }

    sections.push(
      {
        title: '四、披露完整性检查',
        headers: ['检查项', '要求', '实际', '符合性'],
        data: checklist,
      },
      {
        title: '五、审计结论',
        headers: ['项目', '结论'],
        data: [
          {
            项目: '关联方识别',
            结论: `企业提供了${summary.totalParties}个关联方，披露完整性评分${summary.disclosureScore.toFixed(0)}分`,
          },
          {
            项目: '关联交易规模',
            结论: `识别出${summary.totalTransactions}笔关联交易，总金额${summary.totalAmount.toFixed(2)}元`,
          },
          {
            项目: '公允性评价',
            结论: summary.fairnessRate >= 0.9
              ? `关联交易公允性总体良好，${(summary.fairnessRate * 100).toFixed(2)}%的交易定价公允`
              : `部分关联交易定价可能不公允，需要进一步核实`,
          },
          {
            项目: '异常交易',
            结论: abnormals.length > 0
              ? `识别出${abnormals.length}笔异常交易，建议重点关注并执行进一步审计程序`
              : '未发现重大异常交易',
          },
          {
            项目: '审计建议',
            结论: this.getOverallAuditOpinion(summary, abnormals),
          },
        ],
      }
    );

    return await this.generateWorkpaper(
      '关联方交易核查审计工作底稿',
      sections
    );
  }

  /**
   * 获取总体审计意见
   * 
   * @private
   * @param {RelatedTransactionSummary} summary - 汇总数据
   * @param {RelatedTransaction[]} abnormals - 异常交易
   * @returns {string} 审计意见
   */
  private getOverallAuditOpinion(
    summary: RelatedTransactionSummary,
    abnormals: RelatedTransaction[]
  ): string {
    const opinions: string[] = [];

    if (summary.disclosureScore < 80) {
      opinions.push('关联方披露存在不完整情况，建议补充披露相关信息');
    }

    if (summary.fairnessRate < 0.9) {
      opinions.push('部分关联交易定价公允性存疑，建议获取更多市场价格证据');
    }

    if (summary.highRiskCount > 0) {
      opinions.push(`识别出${summary.highRiskCount}笔高风险交易，建议执行详细的实质性程序`);
    }

    if (abnormals.length > 5) {
      opinions.push('异常交易数量较多，建议评估内部控制有效性');
    }

    if (summary.totalAmount > 10000000) {
      opinions.push('关联交易金额较大，建议评估对财务报表的影响');
    }

    if (opinions.length === 0) {
      return '关联方交易核查未发现重大问题，披露和定价总体合规';
    }

    return opinions.join('；');
  }
}
