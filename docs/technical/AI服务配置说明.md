# 🤖 AI服务配置说明

**文档版本**: v1.0  
**最后更新**: 2025-12-03

---

## 📋 概述

本系统支持多个AI服务提供商，可以让用户自由选择和切换不同的模型。所有API格式均已正确实现，配置文件中使用示例密钥仅供演示格式。

---

## 🌟 支持的AI服务商

### 1. 阿里云通义千问 (推荐) ⭐⭐⭐

```yaml
优势:
  - ✅ 限时免费（无需信用卡）
  - ✅ 中文能力强
  - ✅ 申请快速（10分钟）
  - ✅ 支持图像理解
  - ✅ API简单易用

适用场景:
  - 发票识别
  - 舞弊检测
  - 关联方识别
  - 合同风险分析

申请地址: https://dashscope.console.aliyun.com/
```

### 2. 百度文心一言

```yaml
优势:
  - ✅ 国产大模型
  - ✅ 中文理解优秀
  - ✅ 企业级支持

适用场景:
  - 复杂文本分析
  - 专业领域问答

申请地址: https://cloud.baidu.com/product/wenxinworkshop
```

### 3. OpenAI ChatGPT

```yaml
优势:
  - ✅ 全球领先
  - ✅ 生态丰富
  - ✅ 持续迭代

适用场景:
  - 需要最强推理能力
  - 多语言场景

申请地址: https://platform.openai.com/api-keys
```

### 4. 腾讯混元

```yaml
优势:
  - ✅ 腾讯生态集成
  - ✅ 企业级服务

适用场景:
  - 企业微信集成
  - 腾讯云生态

申请地址: https://cloud.tencent.com/product/hunyuan
```

---

## ⚙️ 配置方式

### 方法1: 环境变量配置（推荐）

**步骤**:

```bash
# 1. 复制示例配置文件
cd packages/backend
cp .env.ai-services.example .env.ai-services

# 2. 编辑配置文件
nano .env.ai-services  # 或使用其他编辑器

# 3. 填写真实的API密钥
# ⚠️ 注意：示例文件中的密钥仅供演示API格式，请替换为真实密钥

# 4. 选择AI提供商
AI_PROVIDER=qwen  # 可选: qwen, ernie, openai, hunyuan

# 5. 重启后端服务
npm run dev
```

**配置文件示例** (仅演示格式):

```env
# ====================================================================
# ⚠️ 重要提示：以下密钥仅为示例格式，请替换为真实API密钥
# ====================================================================

# 当前使用的AI服务
AI_PROVIDER=qwen

# 阿里云通义千问（推荐）
QWEN_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
QWEN_MODEL=qwen-plus

# 百度文心一言
ERNIE_API_KEY=AbCdEfGhIjKlMnOpQrStUvWxYz123456
ERNIE_SECRET_KEY=1234567890abcdefghijklmnopqrstuv
ERNIE_MODEL=ernie-bot-3.5

# OpenAI ChatGPT
OPENAI_API_KEY=sk-proj-abcdefghijklmnopqrstuvwxyz1234567890
OPENAI_MODEL=gpt-3.5-turbo

# 腾讯混元
HUNYUAN_SECRET_ID=your_hunyuan_secret_id_here
HUNYUAN_SECRET_KEY=your_hunyuan_secret_key_here
```

---

### 方法2: 代码动态切换

```typescript
import AIService from '@/services/AIService';

const aiService = AIService.getInstance();

// 切换到通义千问
aiService.switchProvider({
  provider: 'qwen',
  apiKey: 'sk-your-real-api-key',
  model: 'qwen-plus',
});

// 切换到文心一言
aiService.switchProvider({
  provider: 'ernie',
  apiKey: 'your-api-key',
  apiSecret: 'your-secret-key',
  model: 'ernie-bot-3.5',
});

// 使用AI服务
const response = await aiService.chat({
  messages: [
    { role: 'user', content: '分析这张发票' }
  ]
});
```

---

### 方法3: 用户界面切换（推荐用于生产）

**管理员界面示例**:

```vue
<template>
  <div class="ai-config-panel">
    <h3>AI服务配置</h3>
    
    <!-- AI提供商选择 -->
    <div class="form-group">
      <label>AI服务商</label>
      <select v-model="aiProvider">
        <option value="qwen">阿里云通义千问（推荐）</option>
        <option value="ernie">百度文心一言</option>
        <option value="openai">OpenAI ChatGPT</option>
        <option value="hunyuan">腾讯混元</option>
      </select>
    </div>
    
    <!-- API密钥输入 -->
    <div class="form-group">
      <label>API密钥</label>
      <input 
        v-model="apiKey" 
        type="password"
        placeholder="请输入真实的API密钥"
      />
      <small class="hint">
        ⚠️ 配置文件中的密钥仅为示例格式，请替换为真实密钥
      </small>
    </div>
    
    <!-- 模型选择 -->
    <div class="form-group">
      <label>模型</label>
      <select v-model="model">
        <option v-for="m in availableModels" :key="m" :value="m">
          {{ m }}
        </option>
      </select>
    </div>
    
    <!-- 测试连接 -->
    <button @click="testConnection">测试连接</button>
    <button @click="saveConfig">保存配置</button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { switchAIProvider, testAIConnection } from '@/api/ai';

const aiProvider = ref('qwen');
const apiKey = ref('');
const model = ref('qwen-plus');

// 根据提供商显示可用模型
const availableModels = computed(() => {
  const models = {
    qwen: ['qwen-turbo', 'qwen-plus', 'qwen-max', 'qwen-vl-plus'],
    ernie: ['ernie-bot-turbo', 'ernie-bot-3.5', 'ernie-bot-4.0'],
    openai: ['gpt-3.5-turbo', 'gpt-4-turbo', 'gpt-4'],
    hunyuan: ['hunyuan-standard', 'hunyuan-plus'],
  };
  return models[aiProvider.value] || [];
});

// 测试连接
async function testConnection() {
  try {
    const result = await testAIConnection({
      provider: aiProvider.value,
      apiKey: apiKey.value,
      model: model.value,
    });
    
    if (result.success) {
      alert('✅ 连接成功！');
    } else {
      alert(`❌ 连接失败: ${result.error}`);
    }
  } catch (error) {
    alert(`❌ 测试失败: ${error.message}`);
  }
}

// 保存配置
async function saveConfig() {
  try {
    await switchAIProvider({
      provider: aiProvider.value,
      apiKey: apiKey.value,
      model: model.value,
    });
    alert('✅ 配置已保存！');
  } catch (error) {
    alert(`❌ 保存失败: ${error.message}`);
  }
}
</script>
```

---

## 🔒 安全说明

### ⚠️ 重要提示

```
1. 配置文件中的密钥格式正确，但仅为示例
   示例: QWEN_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   ⚠️ 请替换 'sk-xxx...' 为真实的API密钥

2. 真实密钥获取方式：
   - 阿里云：https://dashscope.console.aliyun.com/ → API-KEY管理
   - 百度：https://cloud.baidu.com/ → 应用列表 → API Key
   - OpenAI: https://platform.openai.com/api-keys
   - 腾讯云：https://console.cloud.tencent.com/cam/capi

3. 安全措施：
   ✅ .env.ai-services 已加入 .gitignore
   ✅ 密钥不会提交到Git仓库
   ✅ 生产环境使用环境变量注入
   ✅ 定期轮换API密钥
```

### 密钥格式验证

```javascript
// 密钥格式正则表达式（用于验证）
const API_KEY_FORMATS = {
  qwen: /^sk-[a-zA-Z0-9]{32,}$/,
  ernie: /^[A-Za-z0-9]{24,32}$/,
  openai: /^sk-proj-[a-zA-Z0-9]{48,}$/,
  hunyuan: /^AKID[a-zA-Z0-9]{32,}$/,
};

// 验证密钥格式
function validateAPIKey(provider: string, apiKey: string): boolean {
  const format = API_KEY_FORMATS[provider];
  return format ? format.test(apiKey) : false;
}
```

---

## 📊 使用示例

### 示例1: 发票真伪识别

```typescript
import AIService from '@/services/AIService';

const aiService = AIService.getInstance();

// 发票数据
const invoice = {
  invoiceCode: '1100204130',
  invoiceNumber: '12345678',
  date: '2024-01-15',
  amount: 10000,
  seller: '测试公司A',
  buyer: '测试公司B',
};

// 调用AI识别
const result = await aiService.verifyInvoice(invoice);

console.log(result);
// {
//   isValid: true,
//   confidence: 0.92,
//   risks: [],
//   reason: "发票格式正确，信息完整"
// }
```

### 示例2: 舞弊风险评分

```typescript
// 交易数据
const transaction = {
  transactionId: 'T001',
  amount: 1000000,
  date: '2024-01-15',
  from: '公司A',
  to: '公司B',
  frequency: '一天内3次大额转账',
};

// 调用AI分析
const result = await aiService.detectFraud(transaction);

console.log(result);
// {
//   riskScore: 75,
//   riskLevel: "高",
//   indicators: ["金额异常", "频率可疑"],
//   recommendation: "建议进一步调查资金流向"
// }
```

### 示例3: 自定义对话

```typescript
// 自定义提示词
const response = await aiService.chat({
  messages: [
    { 
      role: 'system', 
      content: '你是一个专业的审计AI助手' 
    },
    { 
      role: 'user', 
      content: '请分析这个合同的风险点...' 
    }
  ],
  temperature: 0.7,
  maxTokens: 2000,
});

console.log(response.content);
```

---

## 🧪 测试API连接

### 使用测试脚本

```bash
# 测试当前配置的AI提供商
npm run test:ai-connection

# 测试所有配置的AI提供商
npm run test:ai-connection --all
```

### 测试输出示例

```
========================================
🤖 AI服务连接测试
========================================

📋 当前配置:
   提供商: qwen
   模型: qwen-plus
   端点: https://dashscope.aliyuncs.com/api/v1
   API密钥: sk-1234567...

🔍 测试1: 检查API连接...
✅ API连接成功!

🔍 测试2: 简单对话...
✅ 对话成功!
   回复: 我是通义千问，一个由阿里云开发的AI助手...
   Token使用: 45 (输入: 12, 输出: 33)

🔍 测试3: 发票真伪识别...
✅ 发票识别成功!
   结果: { "isValid": true, "confidence": 0.92, ... }

🔍 测试4: 舞弊风险评分...
✅ 舞弊检测成功!
   结果: { "riskScore": 75, "riskLevel": "高", ... }

========================================
✅ 所有测试完成!
========================================
```

---

## 💰 成本对比

| 服务商 | 免费额度 | 按量计费 | 包月套餐 | 推荐 |
|--------|---------|---------|---------|------|
| **通义千问** | ✅ 限时免费 | ¥0.008/1k tokens | ¥99/月 | ⭐⭐⭐ |
| 文心一言 | 300万tokens | ¥0.012/1k tokens | ¥199/月 | ⭐⭐ |
| ChatGPT | $5免费 | $0.002/1k tokens | - | ⭐⭐ |
| 混元 | 100万tokens | ¥0.01/1k tokens | ¥149/月 | ⭐ |

**推荐方案**: 使用通义千问作为主要服务，其他作为备用

---

## 🔄 故障切换

### 自动降级策略

```typescript
// AIService.ts 中已实现自动重试和降级

// 1. 主服务不可用时，自动切换到备用服务
// 2. AI不可用时，降级到规则引擎
// 3. 支持手动强制降级

// 配置降级策略
ENABLE_AI_FALLBACK=true
RULE_ENGINE_CONFIDENCE_THRESHOLD=0.7
```

---

## 📝 常见问题

### Q1: 如何切换AI服务商？

**A**: 修改 `.env.ai-services` 中的 `AI_PROVIDER` 即可，支持热切换无需重启。

### Q2: 示例密钥可以用吗？

**A**: ❌ 不能！示例密钥仅供演示API格式，必须替换为真实密钥才能使用。

### Q3: 如何获取真实API密钥？

**A**: 访问对应服务商的控制台：
- 通义千问：https://dashscope.console.aliyun.com/
- 文心一言：https://cloud.baidu.com/
- OpenAI: https://platform.openai.com/api-keys

### Q4: 可以同时使用多个服务商吗？

**A**: ✅ 可以！配置多个服务商的密钥，通过 `AI_PROVIDER` 切换，或在代码中动态切换。

### Q5: 密钥会不会泄露？

**A**: ✅ 不会！`.env.ai-services` 已加入 `.gitignore`，不会提交到Git仓库。

---

## 📞 技术支持

如有问题，请查阅：
- 通义千问文档：https://help.aliyun.com/zh/dashscope/
- 项目Issue：https://github.com/your-repo/issues
- 技术负责人：[联系方式]

---

**最后更新**: 2025-12-03  
**文档维护**: 技术团队
