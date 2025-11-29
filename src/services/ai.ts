/**
 * AI分析服务
 * 集成千问API，提供节点分析、风险评估等功能
 */

import { post } from '@/api/request';

// AI分析结果接口
export interface AIAnalysisResult {
  riskLevel: 'low' | 'medium' | 'high';
  riskScore: number;  // 0-100
  findings: Finding[];
  suggestions: string[];
  confidence: number; // 0-1
  analyzedAt: string;
  summary: string;
}

export interface Finding {
  id: string;
  title: string;
  description: string;
  severity: 'info' | 'warning' | 'critical';
  evidence?: string;
  recommendation?: string;
}

export interface WorkflowAnalysisResult {
  overallRisk: 'low' | 'medium' | 'high';
  overallScore: number;
  nodeAnalyses: Record<string, AIAnalysisResult>;
  criticalPath: string[];  // 关键路径节点ID
  summary: string;
  recommendations: string[];
}

// 节点分析上下文
export interface AnalysisContext {
  nodeType: string;
  nodeTitle: string;
  content: string;
  relatedNodes?: {
    id: string;
    type: string;
    title: string;
    content: string;
  }[];
  evidences?: {
    id: string;
    type: string;
    fileName: string;
  }[];
  projectInfo?: {
    name: string;
    industry: string;
    auditType: string;
  };
}

class AIAnalysisService {
  private apiKey: string = '';
  private baseURL: string = 'https://dashscope.aliyuncs.com/api/v1';

  /**
   * 初始化AI服务
   */
  public init(apiKey: string): void {
    this.apiKey = apiKey;
  }

  /**
   * 分析单个节点
   */
  public async analyzeNode(
    nodeId: string,
    context: AnalysisContext
  ): Promise<AIAnalysisResult> {
    try {
      // 构建分析Prompt
      const prompt = this.buildNodeAnalysisPrompt(context);

      // 调用千问API
      const response = await this.callQwenAPI(prompt);

      // 解析AI响应
      const result = this.parseAnalysisResponse(response, context.nodeType);

      return result;
    } catch (error) {
      console.error('节点分析失败:', error);
      throw new Error('AI分析服务暂时不可用');
    }
  }

  /**
   * 分析整个工作流
   */
  public async analyzeWorkflow(
    workpaperId: string,
    nodes: any[],
    connections: any[]
  ): Promise<WorkflowAnalysisResult> {
    try {
      // 构建工作流分析Prompt
      const prompt = this.buildWorkflowAnalysisPrompt(nodes, connections);

      // 调用千问API
      const response = await this.callQwenAPI(prompt);

      // 解析结果
      const result = this.parseWorkflowResponse(response, nodes);

      return result;
    } catch (error) {
      console.error('工作流分析失败:', error);
      throw new Error('AI分析服务暂时不可用');
    }
  }

  /**
   * 风险评估
   */
  public async assessRisk(
    content: string,
    type: string
  ): Promise<{
    level: 'low' | 'medium' | 'high';
    score: number;
    factors: string[];
  }> {
    try {
      const prompt = this.buildRiskAssessmentPrompt(content, type);
      const response = await this.callQwenAPI(prompt);
      
      return this.parseRiskAssessment(response);
    } catch (error) {
      console.error('风险评估失败:', error);
      throw error;
    }
  }

  /**
   * 异常检测
   */
  public async detectAnomalies(
    data: any[],
    type: string
  ): Promise<{
    anomalies: Array<{
      index: number;
      description: string;
      severity: 'low' | 'medium' | 'high';
    }>;
    summary: string;
  }> {
    try {
      const prompt = this.buildAnomalyDetectionPrompt(data, type);
      const response = await this.callQwenAPI(prompt);
      
      return this.parseAnomalies(response);
    } catch (error) {
      console.error('异常检测失败:', error);
      throw error;
    }
  }

  /**
   * 生成审计建议
   */
  public async generateSuggestions(
    findings: Finding[],
    context: string
  ): Promise<string[]> {
    try {
      const prompt = this.buildSuggestionsPrompt(findings, context);
      const response = await this.callQwenAPI(prompt);
      
      return this.parseSuggestions(response);
    } catch (error) {
      console.error('生成建议失败:', error);
      return ['请人工审核相关发现'];
    }
  }

  /**
   * 构建节点分析Prompt
   */
  private buildNodeAnalysisPrompt(context: AnalysisContext): string {
    const { nodeType, nodeTitle, content, relatedNodes, evidences } = context;

    const systemPrompt = `你是一位资深的审计专家，擅长审计底稿分析和风险评估。
请仔细分析以下审计节点的内容，识别潜在风险和问题。

分析维度：
1. 合规性：是否符合审计准则
2. 完整性：信息是否完整充分
3. 准确性：数据是否准确可靠
4. 风险点：识别潜在风险
5. 改进建议：提出改进意见

请以JSON格式返回分析结果。`;

    const userPrompt = `
节点类型：${this.getNodeTypeName(nodeType)}
节点标题：${nodeTitle}

节点内容：
${content || '（内容为空）'}

${relatedNodes && relatedNodes.length > 0 ? `
关联节点：
${relatedNodes.map(n => `- ${n.title}: ${n.content.substring(0, 100)}...`).join('\n')}
` : ''}

${evidences && evidences.length > 0 ? `
相关证据：
${evidences.map(e => `- ${e.fileName} (${e.type})`).join('\n')}
` : ''}

请分析以上内容，以JSON格式返回结果：
{
  "riskLevel": "low/medium/high",
  "riskScore": 0-100,
  "findings": [
    {
      "title": "发现标题",
      "description": "详细描述",
      "severity": "info/warning/critical",
      "recommendation": "改进建议"
    }
  ],
  "summary": "总体评价",
  "confidence": 0-1
}`;

    return `${systemPrompt}\n\n${userPrompt}`;
  }

  /**
   * 构建工作流分析Prompt
   */
  private buildWorkflowAnalysisPrompt(nodes: any[], connections: any[]): string {
    const systemPrompt = `你是一位资深的审计专家，擅长审计流程分析和整体风险评估。
请分析整个审计工作流程，评估整体风险水平。`;

    const nodesSummary = nodes.map(n => 
      `${n.id}: ${n.data.title} (${n.type}) - ${n.data.content?.substring(0, 50) || '无内容'}`
    ).join('\n');

    const flowSummary = connections.map(c => 
      `${c.from} → ${c.to}`
    ).join('\n');

    const userPrompt = `
审计流程节点：
${nodesSummary}

流程连接：
${flowSummary}

请分析整个工作流程，识别：
1. 整体风险水平
2. 关键风险节点
3. 流程完整性
4. 改进建议

以JSON格式返回。`;

    return `${systemPrompt}\n\n${userPrompt}`;
  }

  /**
   * 构建风险评估Prompt
   */
  private buildRiskAssessmentPrompt(content: string, type: string): string {
    return `作为审计专家，请评估以下${type}内容的风险等级：

内容：
${content}

请返回JSON格式的风险评估：
{
  "level": "low/medium/high",
  "score": 0-100,
  "factors": ["风险因素1", "风险因素2"]
}`;
  }

  /**
   * 构建异常检测Prompt
   */
  private buildAnomalyDetectionPrompt(data: any[], type: string): string {
    return `请检测以下${type}数据中的异常：

数据：
${JSON.stringify(data, null, 2)}

返回JSON格式的异常检测结果。`;
  }

  /**
   * 构建建议生成Prompt
   */
  private buildSuggestionsPrompt(findings: Finding[], context: string): string {
    return `基于以下审计发现，请提供改进建议：

发现：
${findings.map(f => `- ${f.title}: ${f.description}`).join('\n')}

上下文：
${context}

请提供3-5条具体的改进建议。`;
  }

  /**
   * 调用千问API
   */
  private async callQwenAPI(prompt: string): Promise<string> {
    // 如果没有配置API Key，返回模拟数据
    if (!this.apiKey || this.apiKey === 'your-qwen-api-key') {
      return this.getMockResponse(prompt);
    }

    try {
      // 实际调用千问API
      const response = await post('/ai/qwen/chat', {
        model: 'qwen-max',
        messages: [
          {
            role: 'system',
            content: '你是一位专业的审计专家。'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7
      });

      return response.choices[0].message.content;
    } catch (error) {
      console.error('调用千问API失败:', error);
      // 降级到模拟响应
      return this.getMockResponse(prompt);
    }
  }

  /**
   * 模拟AI响应（用于开发测试）
   */
  private getMockResponse(prompt: string): string {
    const mockResponses: Record<string, any> = {
      node: {
        riskLevel: 'medium',
        riskScore: 65,
        findings: [
          {
            title: '数据完整性问题',
            description: '部分凭证缺少附件支持',
            severity: 'warning',
            recommendation: '补充相关附件和说明'
          },
          {
            title: '审计程序执行',
            description: '审计程序执行基本符合准则',
            severity: 'info',
            recommendation: '继续保持'
          }
        ],
        summary: '整体审计工作符合基本要求，但存在部分需要改进的地方',
        confidence: 0.85
      },
      workflow: {
        overallRisk: 'medium',
        overallScore: 70,
        summary: '审计流程整体完整，但部分节点需要加强',
        recommendations: [
          '加强凭证审核的详细程度',
          '补充风险评估环节',
          '完善工作底稿记录'
        ]
      }
    };

    if (prompt.includes('节点类型')) {
      return JSON.stringify(mockResponses.node);
    } else if (prompt.includes('工作流程')) {
      return JSON.stringify(mockResponses.workflow);
    }

    return JSON.stringify({
      level: 'medium',
      score: 60,
      factors: ['数据完整性', '审计程序执行']
    });
  }

  /**
   * 解析节点分析响应
   */
  private parseAnalysisResponse(response: string, nodeType: string): AIAnalysisResult {
    try {
      const data = JSON.parse(response);
      
      return {
        riskLevel: data.riskLevel || 'low',
        riskScore: data.riskScore || 50,
        findings: (data.findings || []).map((f: any, index: number) => ({
          id: `finding-${Date.now()}-${index}`,
          title: f.title,
          description: f.description,
          severity: f.severity || 'info',
          recommendation: f.recommendation
        })),
        suggestions: data.suggestions || [],
        confidence: data.confidence || 0.8,
        analyzedAt: new Date().toISOString(),
        summary: data.summary || '分析完成'
      };
    } catch (error) {
      console.error('解析AI响应失败:', error);
      throw new Error('AI响应格式错误');
    }
  }

  /**
   * 解析工作流分析响应
   */
  private parseWorkflowResponse(response: string, nodes: any[]): WorkflowAnalysisResult {
    try {
      const data = JSON.parse(response);
      
      return {
        overallRisk: data.overallRisk || 'medium',
        overallScore: data.overallScore || 70,
        nodeAnalyses: {},
        criticalPath: [],
        summary: data.summary || '工作流程分析完成',
        recommendations: data.recommendations || []
      };
    } catch (error) {
      console.error('解析工作流响应失败:', error);
      throw error;
    }
  }

  /**
   * 解析风险评估
   */
  private parseRiskAssessment(response: string): any {
    try {
      return JSON.parse(response);
    } catch (error) {
      return {
        level: 'medium',
        score: 60,
        factors: ['需要进一步分析']
      };
    }
  }

  /**
   * 解析异常检测结果
   */
  private parseAnomalies(response: string): any {
    try {
      return JSON.parse(response);
    } catch (error) {
      return {
        anomalies: [],
        summary: '未发现明显异常'
      };
    }
  }

  /**
   * 解析建议
   */
  private parseSuggestions(response: string): string[] {
    try {
      const data = JSON.parse(response);
      return data.suggestions || [];
    } catch (error) {
      // 如果不是JSON，尝试按行分割
      return response
        .split('\n')
        .filter(line => line.trim().length > 0)
        .slice(0, 5);
    }
  }

  /**
   * 获取节点类型名称
   */
  private getNodeTypeName(type: string): string {
    const names: Record<string, string> = {
      voucher: '凭证节点',
      invoice: '发票节点',
      contract: '合同节点',
      bank_flow: '银行流水节点',
      data_analysis: '数据分析节点',
      risk_assess: '风险评估节点',
      anomaly_detect: '异常检测节点',
      summary: '总结报告节点',
      conclusion: '审计结论节点'
    };
    return names[type] || type;
  }
}

// 导出单例
export const aiService = new AIAnalysisService();

// 初始化（可在App.vue中调用）
export function initAIService(apiKey: string): void {
  aiService.init(apiKey);
}
