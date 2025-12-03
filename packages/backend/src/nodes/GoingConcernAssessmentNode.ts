/**
 * 持续经营评估节点
 * 
 * @description 评估企业持续经营能力，识别重大不确定性
 * 分析财务指标、现金流、经营状况等多维度信息，得出评估结论
 * 
 * @author SHENJI Team
 * @date 2025-12-04
 * @version 1.0.0
 * @since Week 2: 核心节点开发 - 风险评估
 * 
 * @example
 * ```typescript
 * const node = new GoingConcernAssessmentNode();
 * const result = await node.execute({
 *   financialStatements: '/path/to/statements.xlsx',
 *   cashFlowForecast: '/path/to/cashflow.xlsx'
 * }, {
 *   assessmentPeriod: 12
 * });
 * ```
 */

import { BaseNode, NodeExecutionResult } from './BaseNode';
import { BusinessError, ErrorCode } from '../constants/ErrorCode';

/**
 * 财务指标接口
 */
interface FinancialIndicator {
  /** 指标名称 */
  name: string;
  /** 指标值 */
  value: number;
  /** 基准值 */
  benchmark?: number;
  /** 是否异常 */
  isAbnormal: boolean;
  /** 风险等级 */
  riskLevel: '低' | '中' | '高';
}

/**
 * 风险因素接口
 */
interface RiskFactor {
  /** 风险类别 */
  category: '财务风险' | '经营风险' | '法律风险' | '市场风险' | '其他风险';
  /** 风险描述 */
  description: string;
  /** 风险等级 */
  level: '低' | '中' | '高';
  /** 影响程度 */
  impact: string;
  /** 应对措施 */
  mitigation?: string;
}

/**
 * 持续经营评估结果接口
 */
interface GoingConcernAssessment {
  /** 评估日期 */
  assessmentDate: string;
  /** 评估期间（月） */
  assessmentPeriod: number;
  /** 总体结论 */
  overallConclusion: '无重大不确定性' | '存在重大不确定性' | '持续经营能力存疑';
  /** 财务指标得分 */
  financialScore: number;
  /** 经营状况得分 */
  operationalScore: number;
  /** 现金流状况得分 */
  cashFlowScore: number;
  /** 综合得分 */
  totalScore: number;
  /** 风险因素数量 */
  riskFactorsCount: number;
  /** 高风险因素数量 */
  highRiskCount: number;
  /** 关键风险因素 */
  keyRiskFactors: RiskFactor[];
  /** 评估说明 */
  assessmentNarrative: string;
  /** 审计建议 */
  auditRecommendation: string;
}

/**
 * 持续经营评估节点
 * 
 * @description 执行持续经营评估程序的审计节点
 * 包括财务分析、风险识别、评估结论等完整流程
 * 
 * @extends {BaseNode}
 */
export class GoingConcernAssessmentNode extends BaseNode {
  /**
   * 节点元数据
   */
  static metadata = {
    id: 'going-concern-assessment',
    name: '持续经营评估',
    category: '风险评估',
    description: '评估企业持续经营能力，识别和分析重大不确定性因素',
    icon: 'trend-analysis',
    version: '1.0.0',
  };

  /**
   * 输入定义
   */
  static inputs = [
    {
      name: 'financialStatements',
      label: '财务报表',
      type: 'excel' as const,
      required: true,
      description: '企业财务报表数据（包含：资产负债表、利润表、现金流量表）',
    },
    {
      name: 'cashFlowForecast',
      label: '现金流预测',
      type: 'excel' as const,
      required: false,
      description: '未来期间现金流预测（可选，用于评估流动性）',
    },
    {
      name: 'debtSchedule',
      label: '债务清单',
      type: 'excel' as const,
      required: false,
      description: '借款及债务到期清单（可选，用于评估偿债能力）',
    },
    {
      name: 'operatingData',
      label: '经营数据',
      type: 'excel' as const,
      required: false,
      description: '经营相关数据（可选，如订单、客户、市场等信息）',
    },
  ];

  /**
   * 输出定义
   */
  static outputs = [
    {
      name: 'assessment',
      label: '评估结论',
      type: 'data' as const,
      description: '持续经营评估的总体结论和关键数据',
    },
    {
      name: 'indicatorAnalysis',
      label: '财务指标分析',
      type: 'excel' as const,
      description: '详细的财务指标分析表',
    },
    {
      name: 'riskFactorsList',
      label: '风险因素清单',
      type: 'excel' as const,
      description: '识别出的风险因素清单及分析',
    },
    {
      name: 'cashFlowAnalysis',
      label: '现金流分析',
      type: 'excel' as const,
      description: '现金流分析和预测',
    },
    {
      name: 'assessmentReport',
      label: '评估报告',
      type: 'pdf' as const,
      description: '持续经营评估报告',
    },
    {
      name: 'workpaper',
      label: '审计底稿',
      type: 'excel' as const,
      description: '持续经营评估审计工作底稿',
    },
  ];

  /**
   * 配置项定义
   */
  static config = {
    assessmentPeriod: {
      label: '评估期间（月）',
      type: 'number' as const,
      default: 12,
      description: '持续经营评估的未来期间长度（月数）',
    },
    industryBenchmark: {
      label: '是否使用行业基准',
      type: 'boolean' as const,
      default: false,
      description: '是否使用行业平均水平作为对比基准',
    },
    riskThreshold: {
      label: '风险阈值',
      type: 'number' as const,
      default: 60,
      description: '综合得分阈值（低于此分数视为存在重大不确定性）',
    },
    includeMarketFactors: {
      label: '是否考虑市场因素',
      type: 'boolean' as const,
      default: true,
      description: '是否将市场和行业因素纳入评估',
    },
  };

  /**
   * 执行节点逻辑
   * 
   * @description 执行持续经营评估的完整流程
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
      this.log('========== 开始执行持续经营评估节点 ==========');

      // 1. 验证输入
      await this.validateInputs(inputs);
      this.log('✓ 输入验证通过');

      // 2. 解析配置
      const assessmentPeriod = config.assessmentPeriod || 12;
      const riskThreshold = config.riskThreshold || 60;
      
      this.log(`评估期间：未来${assessmentPeriod}个月`);
      this.log(`风险阈值：${riskThreshold}分`);

      // 3. 解析财务报表
      this.log('开始解析财务报表...');
      const financialStatements = await this.parseExcel(inputs.financialStatements);
      this.log(`✓ 成功解析财务报表：${financialStatements.length}条记录`);

      // 4. 解析现金流预测（如果有）
      let cashFlowForecast: any[] = [];
      if (inputs.cashFlowForecast) {
        cashFlowForecast = await this.parseExcel(inputs.cashFlowForecast);
        this.log(`✓ 成功解析现金流预测：${cashFlowForecast.length}条记录`);
      }

      // 5. 解析债务清单（如果有）
      let debtSchedule: any[] = [];
      if (inputs.debtSchedule) {
        debtSchedule = await this.parseExcel(inputs.debtSchedule);
        this.log(`✓ 成功解析债务清单：${debtSchedule.length}条记录`);
      }

      // 6. 提取财务数据
      this.log('提取和计算财务数据...');
      const financialData = this.extractFinancialData(financialStatements);
      this.log('✓ 财务数据提取完成');

      // 7. 计算财务指标
      this.log('计算财务指标...');
      const indicators = this.calculateIndicators(financialData);
      this.log(`✓ 计算了${indicators.length}个财务指标`);

      // 8. 分析财务指标
      this.log('分析财务指标...');
      const analyzedIndicators = this.analyzeIndicators(indicators);
      const financialScore = this.calculateFinancialScore(analyzedIndicators);
      this.log(`✓ 财务指标得分：${financialScore}分`);

      // 9. 分析现金流状况
      this.log('分析现金流状况...');
      const cashFlowScore = this.analyzeCashFlow(financialData, cashFlowForecast);
      this.log(`✓ 现金流得分：${cashFlowScore}分`);

      // 10. 分析经营状况
      this.log('分析经营状况...');
      const operationalScore = this.analyzeOperations(financialData);
      this.log(`✓ 经营状况得分：${operationalScore}分`);

      // 11. 识别风险因素
      this.log('识别风险因素...');
      const riskFactors = this.identifyRiskFactors(
        financialData,
        analyzedIndicators,
        debtSchedule
      );
      this.log(`✓ 识别出${riskFactors.length}个风险因素`);

      // 12. 综合评估
      this.log('进行综合评估...');
      const assessment = this.performAssessment(
        financialScore,
        cashFlowScore,
        operationalScore,
        riskFactors,
        assessmentPeriod,
        riskThreshold
      );
      this.log(`✓ 综合得分：${assessment.totalScore}分`);
      this.log(`✓ 评估结论：${assessment.overallConclusion}`);

      // 13. 导出财务指标分析
      this.log('导出财务指标分析...');
      const indicatorAnalysisPath = await this.exportIndicatorAnalysis(analyzedIndicators);
      this.log(`✓ 财务指标分析已导出：${indicatorAnalysisPath}`);

      // 14. 导出风险因素清单
      this.log('导出风险因素清单...');
      const riskFactorsPath = await this.exportRiskFactors(riskFactors);
      this.log(`✓ 风险因素清单已导出：${riskFactorsPath}`);

      // 15. 导出现金流分析
      this.log('导出现金流分析...');
      const cashFlowAnalysisPath = await this.exportCashFlowAnalysis(
        financialData,
        cashFlowForecast
      );
      this.log(`✓ 现金流分析已导出：${cashFlowAnalysisPath}`);

      // 16. 生成审计底稿
      this.log('生成审计底稿...');
      const workpaperPath = await this.generateGoingConcernWorkpaper(
        assessment,
        analyzedIndicators,
        riskFactors,
        financialData
      );
      this.log(`✓ 审计底稿已生成：${workpaperPath}`);

      // 17. 完成执行
      const duration = Date.now() - startTime;
      this.log(`========== 持续经营评估节点执行完成，耗时：${duration}ms ==========`);

      return {
        success: true,
        data: {
          assessment,
          indicators: analyzedIndicators,
          riskFactors,
        },
        outputs: {
          assessment,
          indicatorAnalysis: indicatorAnalysisPath,
          riskFactorsList: riskFactorsPath,
          cashFlowAnalysis: cashFlowAnalysisPath,
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
   * 提取财务数据
   * 
   * @private
   * @param {any[]} statements - 财务报表数据
   * @returns {any} 财务数据对象
   */
  private extractFinancialData(statements: any[]): any {
    const data: any = {
      // 资产负债表
      totalAssets: 0,
      currentAssets: 0,
      cash: 0,
      receivables: 0,
      inventory: 0,
      fixedAssets: 0,
      totalLiabilities: 0,
      currentLiabilities: 0,
      shortTermDebt: 0,
      longTermDebt: 0,
      totalEquity: 0,
      
      // 利润表
      revenue: 0,
      operatingProfit: 0,
      netProfit: 0,
      ebitda: 0,
      
      // 现金流量表
      operatingCashFlow: 0,
      investingCashFlow: 0,
      financingCashFlow: 0,
      netCashFlow: 0,
    };

    statements.forEach(item => {
      const account = String(item.科目 || item.项目 || '').trim();
      const amount = Number(item.金额 || item.本期金额 || 0);

      // 资产负债表项目
      if (account.includes('资产总计') || account === '资产合计') {
        data.totalAssets = amount;
      } else if (account.includes('流动资产合计')) {
        data.currentAssets = amount;
      } else if (account.includes('货币资金')) {
        data.cash = amount;
      } else if (account.includes('应收账款')) {
        data.receivables = amount;
      } else if (account.includes('存货')) {
        data.inventory = amount;
      } else if (account.includes('固定资产')) {
        data.fixedAssets = amount;
      } else if (account.includes('负债总计') || account === '负债合计') {
        data.totalLiabilities = amount;
      } else if (account.includes('流动负债合计')) {
        data.currentLiabilities = amount;
      } else if (account.includes('短期借款')) {
        data.shortTermDebt = amount;
      } else if (account.includes('长期借款')) {
        data.longTermDebt = amount;
      } else if (account.includes('所有者权益') || account.includes('股东权益')) {
        data.totalEquity = amount;
      }
      
      // 利润表项目
      else if (account.includes('营业收入') || account.includes('主营业务收入')) {
        data.revenue = amount;
      } else if (account.includes('营业利润')) {
        data.operatingProfit = amount;
      } else if (account.includes('净利润')) {
        data.netProfit = amount;
      }
      
      // 现金流量表项目
      else if (account.includes('经营活动产生的现金流量净额')) {
        data.operatingCashFlow = amount;
      } else if (account.includes('投资活动产生的现金流量净额')) {
        data.investingCashFlow = amount;
      } else if (account.includes('筹资活动产生的现金流量净额')) {
        data.financingCashFlow = amount;
      }
    });

    data.netCashFlow = data.operatingCashFlow + data.investingCashFlow + data.financingCashFlow;
    data.ebitda = data.operatingProfit; // 简化处理

    return data;
  }

  /**
   * 计算财务指标
   * 
   * @private
   * @param {any} data - 财务数据
   * @returns {FinancialIndicator[]} 财务指标列表
   */
  private calculateIndicators(data: any): FinancialIndicator[] {
    const indicators: FinancialIndicator[] = [];

    // 流动性指标
    if (data.currentLiabilities > 0) {
      indicators.push({
        name: '流动比率',
        value: data.currentAssets / data.currentLiabilities,
        benchmark: 2.0,
        isAbnormal: false,
        riskLevel: '低',
      });

      indicators.push({
        name: '速动比率',
        value: (data.currentAssets - data.inventory) / data.currentLiabilities,
        benchmark: 1.0,
        isAbnormal: false,
        riskLevel: '低',
      });
    }

    // 偿债能力指标
    if (data.totalAssets > 0) {
      const assetLiabilityRatio = data.totalLiabilities / data.totalAssets;
      indicators.push({
        name: '资产负债率',
        value: assetLiabilityRatio,
        benchmark: 0.6,
        isAbnormal: false,
        riskLevel: '低',
      });
    }

    // 盈利能力指标
    if (data.revenue > 0) {
      indicators.push({
        name: '销售净利率',
        value: data.netProfit / data.revenue,
        benchmark: 0.05,
        isAbnormal: false,
        riskLevel: '低',
      });
    }

    if (data.totalAssets > 0) {
      indicators.push({
        name: '总资产收益率',
        value: data.netProfit / data.totalAssets,
        benchmark: 0.05,
        isAbnormal: false,
        riskLevel: '低',
      });
    }

    // 现金流指标
    if (data.revenue > 0) {
      indicators.push({
        name: '销售现金比率',
        value: data.operatingCashFlow / data.revenue,
        benchmark: 0.1,
        isAbnormal: false,
        riskLevel: '低',
      });
    }

    if (data.currentLiabilities > 0) {
      indicators.push({
        name: '现金流动负债比',
        value: data.operatingCashFlow / data.currentLiabilities,
        benchmark: 0.5,
        isAbnormal: false,
        riskLevel: '低',
      });
    }

    return indicators;
  }

  /**
   * 分析财务指标
   * 
   * @private
   * @param {FinancialIndicator[]} indicators - 财务指标
   * @returns {FinancialIndicator[]} 分析后的指标
   */
  private analyzeIndicators(indicators: FinancialIndicator[]): FinancialIndicator[] {
    return indicators.map(indicator => {
      let isAbnormal = false;
      let riskLevel: '低' | '中' | '高' = '低';

      if (indicator.benchmark) {
        const deviation = Math.abs(indicator.value - indicator.benchmark) / indicator.benchmark;

        // 流动比率和速动比率：低于基准是风险
        if (indicator.name.includes('流动比率') || indicator.name.includes('速动比率')) {
          if (indicator.value < indicator.benchmark * 0.5) {
            isAbnormal = true;
            riskLevel = '高';
          } else if (indicator.value < indicator.benchmark * 0.75) {
            riskLevel = '中';
          }
        }
        // 资产负债率：高于基准是风险
        else if (indicator.name.includes('资产负债率')) {
          if (indicator.value > indicator.benchmark * 1.5) {
            isAbnormal = true;
            riskLevel = '高';
          } else if (indicator.value > indicator.benchmark * 1.2) {
            riskLevel = '中';
          }
        }
        // 盈利能力指标：低于基准或负值是风险
        else if (indicator.name.includes('利率') || indicator.name.includes('收益率')) {
          if (indicator.value < 0) {
            isAbnormal = true;
            riskLevel = '高';
          } else if (indicator.value < indicator.benchmark * 0.5) {
            riskLevel = '中';
          }
        }
        // 现金流指标：低于基准或负值是风险
        else if (indicator.name.includes('现金')) {
          if (indicator.value < 0) {
            isAbnormal = true;
            riskLevel = '高';
          } else if (indicator.value < indicator.benchmark * 0.5) {
            riskLevel = '中';
          }
        }
      }

      return {
        ...indicator,
        isAbnormal,
        riskLevel,
      };
    });
  }

  /**
   * 计算财务指标得分
   * 
   * @private
   * @param {FinancialIndicator[]} indicators - 分析后的指标
   * @returns {number} 财务得分(0-100)
   */
  private calculateFinancialScore(indicators: FinancialIndicator[]): number {
    if (indicators.length === 0) return 50;

    let totalScore = 0;
    indicators.forEach(indicator => {
      if (indicator.riskLevel === '低') {
        totalScore += 100;
      } else if (indicator.riskLevel === '中') {
        totalScore += 60;
      } else {
        totalScore += 20;
      }
    });

    return Math.round(totalScore / indicators.length);
  }

  /**
   * 分析现金流状况
   * 
   * @private
   * @param {any} financialData - 财务数据
   * @param {any[]} forecast - 现金流预测
   * @returns {number} 现金流得分(0-100)
   */
  private analyzeCashFlow(financialData: any, forecast: any[]): number {
    let score = 50;

    // 1. 经营现金流分析
    if (financialData.operatingCashFlow > 0) {
      score += 20;
    } else if (financialData.operatingCashFlow < 0) {
      score -= 20;
    }

    // 2. 现金余额分析
    if (financialData.cash > financialData.currentLiabilities * 0.5) {
      score += 15;
    } else if (financialData.cash < financialData.currentLiabilities * 0.2) {
      score -= 15;
    }

    // 3. 现金流预测分析
    if (forecast.length > 0) {
      const futureCashFlow = forecast.reduce((sum, f) => sum + Number(f.预测现金流 || 0), 0);
      if (futureCashFlow > 0) {
        score += 15;
      } else {
        score -= 15;
      }
    }

    return Math.max(0, Math.min(100, score));
  }

  /**
   * 分析经营状况
   * 
   * @private
   * @param {any} financialData - 财务数据
   * @returns {number} 经营得分(0-100)
   */
  private analyzeOperations(financialData: any): number {
    let score = 50;

    // 1. 盈利能力
    if (financialData.netProfit > 0) {
      score += 25;
    } else if (financialData.netProfit < 0) {
      score -= 25;
    }

    // 2. 收入规模
    if (financialData.revenue > 0) {
      score += 15;
    } else {
      score -= 15;
    }

    // 3. 资产规模
    if (financialData.totalAssets > 0 && financialData.totalEquity > 0) {
      score += 10;
    } else if (financialData.totalEquity < 0) {
      score -= 20;
    }

    return Math.max(0, Math.min(100, score));
  }

  /**
   * 识别风险因素
   * 
   * @private
   * @param {any} financialData - 财务数据
   * @param {FinancialIndicator[]} indicators - 财务指标
   * @param {any[]} debtSchedule - 债务清单
   * @returns {RiskFactor[]} 风险因素列表
   */
  private identifyRiskFactors(
    financialData: any,
    indicators: FinancialIndicator[],
    debtSchedule: any[]
  ): RiskFactor[] {
    const risks: RiskFactor[] = [];

    // 1. 财务风险
    if (financialData.netProfit < 0) {
      risks.push({
        category: '财务风险',
        description: '企业处于亏损状态',
        level: '高',
        impact: `本期净利润为负${Math.abs(financialData.netProfit)}元，持续亏损将影响持续经营`,
        mitigation: '建议采取措施提高盈利能力，或寻求外部资金支持',
      });
    }

    if (financialData.totalEquity < 0) {
      risks.push({
        category: '财务风险',
        description: '资不抵债',
        level: '高',
        impact: '所有者权益为负，资产不足以偿还负债',
        mitigation: '必须立即采取重组或增资措施',
      });
    }

    // 2. 流动性风险
    const currentRatio = indicators.find(i => i.name === '流动比率');
    if (currentRatio && currentRatio.value < 1) {
      risks.push({
        category: '财务风险',
        description: '流动性不足',
        level: '高',
        impact: `流动比率${currentRatio.value.toFixed(2)}，低于1，短期偿债能力不足`,
        mitigation: '建议改善现金流，或延长债务期限',
      });
    }

    // 3. 现金流风险
    if (financialData.operatingCashFlow < 0) {
      risks.push({
        category: '财务风险',
        description: '经营活动现金流为负',
        level: '高',
        impact: '经营活动无法产生正现金流，依赖外部融资',
        mitigation: '必须改善经营效率，提高现金回收',
      });
    }

    // 4. 债务风险
    if (debtSchedule.length > 0) {
      const shortTermDebt = debtSchedule
        .filter(d => this.isShortTermDebt(d))
        .reduce((sum, d) => sum + Number(d.金额 || 0), 0);

      if (shortTermDebt > financialData.cash * 2) {
        risks.push({
          category: '财务风险',
          description: '短期债务偿还压力大',
          level: '中',
          impact: `短期债务${shortTermDebt}元，现金仅${financialData.cash}元`,
          mitigation: '建议与债权人协商展期，或增加融资',
        });
      }
    }

    // 5. 经营风险
    if (financialData.revenue === 0) {
      risks.push({
        category: '经营风险',
        description: '无营业收入',
        level: '高',
        impact: '企业无经营收入，可能已停止经营',
        mitigation: '需要确认企业经营状况',
      });
    }

    return risks;
  }

  /**
   * 判断是否为短期债务
   * 
   * @private
   * @param {any} debt - 债务记录
   * @returns {boolean} 是否短期
   */
  private isShortTermDebt(debt: any): boolean {
    if (!debt.到期日) return false;
    
    const maturityDate = new Date(debt.到期日);
    const now = new Date();
    const monthsUntilMaturity = (maturityDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24 * 30);
    
    return monthsUntilMaturity <= 12;
  }

  /**
   * 执行综合评估
   * 
   * @private
   * @param {number} financialScore - 财务得分
   * @param {number} cashFlowScore - 现金流得分
   * @param {number} operationalScore - 经营得分
   * @param {RiskFactor[]} riskFactors - 风险因素
   * @param {number} period - 评估期间
   * @param {number} threshold - 风险阈值
   * @returns {GoingConcernAssessment} 评估结果
   */
  private performAssessment(
    financialScore: number,
    cashFlowScore: number,
    operationalScore: number,
    riskFactors: RiskFactor[],
    period: number,
    threshold: number
  ): GoingConcernAssessment {
    // 计算综合得分（加权平均）
    const totalScore = Math.round(
      financialScore * 0.4 +
      cashFlowScore * 0.35 +
      operationalScore * 0.25
    );

    // 统计高风险因素
    const highRiskFactors = riskFactors.filter(r => r.level === '高');
    const keyRiskFactors = riskFactors
      .filter(r => r.level === '高' || r.level === '中')
      .slice(0, 5);

    // 确定总体结论
    let overallConclusion: '无重大不确定性' | '存在重大不确定性' | '持续经营能力存疑';
    let assessmentNarrative = '';
    let auditRecommendation = '';

    if (totalScore >= 80 && highRiskFactors.length === 0) {
      overallConclusion = '无重大不确定性';
      assessmentNarrative = '企业财务状况良好，现金流充足，经营正常，未识别出影响持续经营的重大不确定性因素';
      auditRecommendation = '持续经营假设合理，无需在审计报告中增加与持续经营相关的段落';
    } else if (totalScore >= threshold && highRiskFactors.length <= 2) {
      overallConclusion = '存在重大不确定性';
      assessmentNarrative = '企业存在一定的财务或经营风险，可能导致对持续经营能力产生重大疑虑，但通过改善措施可能缓解';
      auditRecommendation = '建议在审计报告中增加"与持续经营相关的重大不确定性"段落，提请报表使用者关注';
    } else {
      overallConclusion = '持续经营能力存疑';
      assessmentNarrative = '企业面临严重的财务困难，持续经营能力存在重大疑虑，可能无法在未来12个月内持续经营';
      auditRecommendation = '建议在审计报告中增加"与持续经营相关的重大不确定性"段落，并考虑是否需要发表非无保留意见';
    }

    return {
      assessmentDate: new Date().toISOString().split('T')[0],
      assessmentPeriod: period,
      overallConclusion,
      financialScore,
      operationalScore,
      cashFlowScore,
      totalScore,
      riskFactorsCount: riskFactors.length,
      highRiskCount: highRiskFactors.length,
      keyRiskFactors,
      assessmentNarrative,
      auditRecommendation,
    };
  }

  /**
   * 导出财务指标分析
   * 
   * @private
   * @param {FinancialIndicator[]} indicators - 财务指标
   * @returns {Promise<string>} 文件路径
   */
  private async exportIndicatorAnalysis(indicators: FinancialIndicator[]): Promise<string> {
    const headers = [
      '指标名称',
      '指标值',
      '基准值',
      '是否异常',
      '风险等级',
      '分析说明',
    ];

    const data = indicators.map(i => ({
      指标名称: i.name,
      指标值: i.value.toFixed(4),
      基准值: i.benchmark?.toFixed(4) || 'N/A',
      是否异常: i.isAbnormal ? '是' : '否',
      风险等级: i.riskLevel,
      分析说明: this.getIndicatorAnalysis(i),
    }));

    return await this.exportExcel(
      data,
      headers,
      `财务指标分析_${Date.now()}.xlsx`
    );
  }

  /**
   * 获取指标分析说明
   * 
   * @private
   * @param {FinancialIndicator} indicator - 财务指标
   * @returns {string} 分析说明
   */
  private getIndicatorAnalysis(indicator: FinancialIndicator): string {
    if (indicator.riskLevel === '低') {
      return `${indicator.name}处于正常范围`;
    } else if (indicator.riskLevel === '中') {
      return `${indicator.name}偏离正常水平，需要关注`;
    } else {
      return `${indicator.name}严重异常，存在重大风险`;
    }
  }

  /**
   * 导出风险因素清单
   * 
   * @private
   * @param {RiskFactor[]} risks - 风险因素
   * @returns {Promise<string>} 文件路径
   */
  private async exportRiskFactors(risks: RiskFactor[]): Promise<string> {
    const headers = [
      '风险类别',
      '风险描述',
      '风险等级',
      '影响程度',
      '应对措施',
    ];

    const data = risks.map(r => ({
      风险类别: r.category,
      风险描述: r.description,
      风险等级: r.level,
      影响程度: r.impact,
      应对措施: r.mitigation || '需进一步评估',
    }));

    return await this.exportExcel(
      data,
      headers,
      `风险因素清单_${Date.now()}.xlsx`
    );
  }

  /**
   * 导出现金流分析
   * 
   * @private
   * @param {any} financialData - 财务数据
   * @param {any[]} forecast - 预测数据
   * @returns {Promise<string>} 文件路径
   */
  private async exportCashFlowAnalysis(
    financialData: any,
    forecast: any[]
  ): Promise<string> {
    const headers = ['项目', '金额', '说明'];

    const data = [
      {
        项目: '期初现金余额',
        金额: financialData.cash,
        说明: '货币资金',
      },
      {
        项目: '经营活动现金流',
        金额: financialData.operatingCashFlow,
        说明: financialData.operatingCashFlow > 0 ? '正现金流' : '负现金流',
      },
      {
        项目: '投资活动现金流',
        金额: financialData.investingCashFlow,
        说明: '投资活动',
      },
      {
        项目: '筹资活动现金流',
        金额: financialData.financingCashFlow,
        说明: '筹资活动',
      },
      {
        项目: '现金净增加额',
        金额: financialData.netCashFlow,
        说明: financialData.netCashFlow > 0 ? '现金增加' : '现金减少',
      },
    ];

    if (forecast.length > 0) {
      forecast.forEach(f => {
        data.push({
          项目: `预测现金流-${f.期间 || '未来期间'}`,
          金额: Number(f.预测现金流 || 0),
          说明: '预测',
        });
      });
    }

    return await this.exportExcel(
      data,
      headers,
      `现金流分析_${Date.now()}.xlsx`
    );
  }

  /**
   * 生成持续经营评估审计底稿
   * 
   * @private
   * @param {GoingConcernAssessment} assessment - 评估结果
   * @param {FinancialIndicator[]} indicators - 财务指标
   * @param {RiskFactor[]} risks - 风险因素
   * @param {any} financialData - 财务数据
   * @returns {Promise<string>} 底稿文件路径
   */
  private async generateGoingConcernWorkpaper(
    assessment: GoingConcernAssessment,
    indicators: FinancialIndicator[],
    risks: RiskFactor[],
    financialData: any
  ): Promise<string> {
    const sections: Array<{
      title: string;
      headers: string[];
      data: any[];
    }> = [
      {
        title: '一、持续经营评估概况',
        headers: ['评估项目', '评估结果', '说明'],
        data: [
          {
            评估项目: '评估日期',
            评估结果: assessment.assessmentDate,
            说明: '评估基准日',
          },
          {
            评估项目: '评估期间',
            评估结果: `未来${assessment.assessmentPeriod}个月`,
            说明: '持续经营评估期间',
          },
          {
            评估项目: '财务指标得分',
            评估结果: assessment.financialScore + '分',
            说明: this.getScoreLevel(assessment.financialScore),
          },
          {
            评估项目: '现金流得分',
            评估结果: assessment.cashFlowScore + '分',
            说明: this.getScoreLevel(assessment.cashFlowScore),
          },
          {
            评估项目: '经营状况得分',
            评估结果: assessment.operationalScore + '分',
            说明: this.getScoreLevel(assessment.operationalScore),
          },
          {
            评估项目: '综合得分',
            评估结果: assessment.totalScore + '分',
            说明: this.getScoreLevel(assessment.totalScore),
          },
          {
            评估项目: '风险因素数量',
            评估结果: assessment.riskFactorsCount + '个',
            说明: `其中高风险${assessment.highRiskCount}个`,
          },
          {
            评估项目: '总体结论',
            评估结果: assessment.overallConclusion,
            说明: assessment.overallConclusion === '无重大不确定性' ? '✓ 正常' : '✗ 需关注',
          },
        ],
      },
      {
        title: '二、财务指标分析',
        headers: ['指标名称', '指标值', '风险等级', '是否异常'],
        data: indicators.map(i => ({
          指标名称: i.name,
          指标值: i.value.toFixed(4),
          风险等级: i.riskLevel,
          是否异常: i.isAbnormal ? '是' : '否',
        })),
      },
    ];

    if (risks.length > 0) {
      sections.push({
        title: '三、识别的风险因素',
        headers: ['风险类别', '风险描述', '风险等级', '影响程度'],
        data: risks.map(r => ({
          风险类别: r.category,
          风险描述: r.description,
          风险等级: r.level,
          影响程度: r.impact,
        })),
      });
    }

    sections.push({
      title: '四、评估结论',
      headers: ['项目', '结论'],
      data: [
        {
          项目: '持续经营能力评价',
          结论: assessment.assessmentNarrative,
        },
        {
          项目: '审计建议',
          结论: assessment.auditRecommendation,
        },
        {
          项目: '需要关注的事项',
          结论: this.getSummaryOfConcerns(assessment, risks),
        },
      ],
    });

    return await this.generateWorkpaper(
      '持续经营评估审计工作底稿',
      sections
    );
  }

  /**
   * 获取得分等级
   * 
   * @private
   * @param {number} score - 得分
   * @returns {string} 等级描述
   */
  private getScoreLevel(score: number): string {
    if (score >= 80) return '优秀';
    if (score >= 70) return '良好';
    if (score >= 60) return '一般';
    if (score >= 50) return '较差';
    return '很差';
  }

  /**
   * 获取关注事项汇总
   * 
   * @private
   * @param {GoingConcernAssessment} assessment - 评估结果
   * @param {RiskFactor[]} risks - 风险因素
   * @returns {string} 关注事项
   */
  private getSummaryOfConcerns(
    assessment: GoingConcernAssessment,
    risks: RiskFactor[]
  ): string {
    const concerns: string[] = [];

    if (assessment.financialScore < 60) {
      concerns.push('财务状况较差');
    }

    if (assessment.cashFlowScore < 60) {
      concerns.push('现金流不足');
    }

    if (assessment.operationalScore < 60) {
      concerns.push('经营状况不佳');
    }

    if (assessment.highRiskCount > 0) {
      concerns.push(`存在${assessment.highRiskCount}个高风险因素`);
    }

    if (concerns.length === 0) {
      return '未发现需要特别关注的重大事项';
    }

    return concerns.join('；');
  }
}
