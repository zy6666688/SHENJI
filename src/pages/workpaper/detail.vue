<template>
  <view class="workpaper-detail">
    <!-- 顶部工具栏 -->
    <view class="toolbar">
      <view class="toolbar-left">
        <view class="back-btn" @click="handleBack">
          <text>←</text>
        </view>
        <view class="title-info">
          <text class="title">{{ workpaper.title || '底稿编辑器' }}</text>
          <text class="status" :class="'status-' + workpaper.status">
            {{ statusText[workpaper.status] }}
          </text>
        </view>
      </view>
      
      <view class="toolbar-right">
        <view class="tool-btn" @click="handleAddNode">
          <text>+ 添加节点</text>
        </view>
        <view class="tool-btn" @click="handleAutoLayout">
          <text>🔄 自动布局</text>
        </view>
        <view class="tool-btn" @click="handleAIAnalyze">
          <text>🤖 AI分析</text>
        </view>
        <view class="tool-btn primary" @click="handleSave">
          <text>💾 保存</text>
        </view>
      </view>
    </view>

    <!-- 主工作区 -->
    <view class="main-workspace">
      <!-- 左侧节点面板 -->
      <view class="node-panel" :class="{ collapsed: !showNodePanel }">
        <view class="panel-header">
          <text class="panel-title">节点库</text>
          <view class="toggle-btn" @click="showNodePanel = !showNodePanel">
            <text>{{ showNodePanel ? '◀' : '▶' }}</text>
          </view>
        </view>
        
        <scroll-view v-if="showNodePanel" scroll-y class="panel-content">
          <view class="node-category" v-for="category in nodeCategories" :key="category.name">
            <view class="category-title">{{ category.label }}</view>
            <view 
              class="node-item"
              v-for="nodeType in category.nodes"
              :key="nodeType.type"
              @click="addNodeToCanvas(nodeType)"
            >
              <text class="node-icon">{{ nodeType.icon }}</text>
              <text class="node-name">{{ nodeType.name }}</text>
            </view>
          </view>
        </scroll-view>
      </view>

      <!-- 中间画布区域 -->
      <view class="canvas-container" ref="canvasContainer">
        <NodeCanvas
          :nodes="nodes"
          :connections="connections"
          :selectedNodeId="selectedNodeId"
          @node-select="handleNodeSelect"
          @node-move="handleNodeMove"
          @node-delete="handleNodeDelete"
          @connection-create="handleConnectionCreate"
          @connection-delete="handleConnectionDelete"
          @canvas-click="handleCanvasClick"
        />
        
        <!-- 缩放控制 -->
        <view class="zoom-controls">
          <view class="zoom-btn" @click="handleZoomIn">
            <text>+</text>
          </view>
          <view class="zoom-display">
            <text>{{ Math.round(canvasZoom * 100) }}%</text>
          </view>
          <view class="zoom-btn" @click="handleZoomOut">
            <text>-</text>
          </view>
          <view class="zoom-btn" @click="handleZoomReset">
            <text>⊙</text>
          </view>
        </view>
      </view>

      <!-- 右侧属性面板 -->
      <view class="property-panel" :class="{ collapsed: !showPropertyPanel }">
        <view class="panel-header">
          <view class="toggle-btn" @click="showPropertyPanel = !showPropertyPanel">
            <text>{{ showPropertyPanel ? '▶' : '◀' }}</text>
          </view>
          <text class="panel-title">属性</text>
        </view>
        
        <scroll-view v-if="showPropertyPanel" scroll-y class="panel-content">
          <view v-if="selectedNode" class="property-content">
            <!-- 节点基本信息 -->
            <view class="property-section">
              <view class="section-title">基本信息</view>
              <view class="property-item">
                <text class="label">节点标题</text>
                <input 
                  class="input"
                  v-model="selectedNode.data.title"
                  placeholder="输入标题"
                />
              </view>
              <view class="property-item">
                <text class="label">节点类型</text>
                <text class="value">{{ getNodeTypeName(selectedNode.type) }}</text>
              </view>
            </view>

            <!-- 节点内容编辑 -->
            <view class="property-section">
              <view class="section-title">节点内容</view>
              <view class="property-item full">
                <textarea 
                  class="textarea"
                  v-model="selectedNode.data.content"
                  placeholder="输入节点内容..."
                  :maxlength="-1"
                />
              </view>
            </view>

            <!-- AI分析结果 -->
            <view v-if="selectedNode.aiAnalysis" class="property-section">
              <view class="section-title">AI分析结果</view>
              <view class="ai-result">
                <view class="risk-level" :class="'risk-' + selectedNode.aiAnalysis.riskLevel">
                  <text>风险等级: {{ selectedNode.aiAnalysis.riskLevel }}</text>
                </view>
                <view class="findings">
                  <view 
                    class="finding-item"
                    v-for="(finding, idx) in selectedNode.aiAnalysis.findings"
                    :key="idx"
                  >
                    <text class="finding-title">{{ finding.title }}</text>
                    <text class="finding-desc">{{ finding.description }}</text>
                  </view>
                </view>
              </view>
            </view>

            <!-- 操作按钮 -->
            <view class="property-actions">
              <view class="action-btn" @click="handleNodeAIAnalyze">
                <text>🤖 AI分析</text>
              </view>
              <view class="action-btn danger" @click="handleNodeDelete">
                <text>🗑️ 删除节点</text>
              </view>
            </view>
          </view>
          
          <view v-else class="empty-state">
            <text class="empty-icon">📝</text>
            <text class="empty-text">选择节点查看属性</text>
          </view>
        </scroll-view>
      </view>
    </view>

    <!-- 添加节点弹窗 -->
    <view v-if="showAddNodeModal" class="modal-overlay" @click="showAddNodeModal = false">
      <view class="modal-content" @click.stop>
        <view class="modal-header">
          <text class="modal-title">添加节点</text>
          <view class="close-btn" @click="showAddNodeModal = false">
            <text>✕</text>
          </view>
        </view>
        <scroll-view scroll-y class="modal-body">
          <view 
            class="node-type-card"
            v-for="nodeType in allNodeTypes"
            :key="nodeType.type"
            @click="addNodeToCanvas(nodeType)"
          >
            <text class="card-icon">{{ nodeType.icon }}</text>
            <view class="card-info">
              <text class="card-title">{{ nodeType.name }}</text>
              <text class="card-desc">{{ nodeType.description }}</text>
            </view>
          </view>
        </scroll-view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, watch, onUnmounted } from 'vue';
import { onLoad } from '@dcloudio/uni-app';
import NodeCanvas from '@/components/workpaper/NodeCanvas.vue';
import { autoSaveManager } from '@/utils/autoSave';
import { aiService } from '@/services/ai';
import { hierarchicalLayout, gridLayout, alignToGrid } from '@/utils/autoLayout';
import { updateWorkpaper } from '@/api/workpaper';

// 页面参数
const workpaperId = ref('');

// 底稿数据
const workpaper = ref({
  id: '',
  title: '',
  status: 'draft',
  projectId: ''
});

// 节点数据
const nodes = ref<any[]>([]);
const connections = ref<any[]>([]);
const selectedNodeId = ref('');

// UI状态
const showNodePanel = ref(true);
const showPropertyPanel = ref(true);
const showAddNodeModal = ref(false);
const canvasZoom = ref(1);

// 状态文本映射
const statusText: Record<string, string> = {
  draft: '草稿',
  locked: '已锁定',
  reviewed: '已复核',
  approved: '已批准'
};

// 节点分类（类似ComfyUI）
const nodeCategories = [
  {
    name: 'audit',
    label: '审计节点',
    nodes: [
      { type: 'voucher', name: '凭证节点', icon: '📝', description: '审计凭证记录' },
      { type: 'invoice', name: '发票节点', icon: '🧾', description: '发票审核' },
      { type: 'contract', name: '合同节点', icon: '📄', description: '合同审核' },
      { type: 'bank_flow', name: '银行流水', icon: '💰', description: '银行流水分析' }
    ]
  },
  {
    name: 'analysis',
    label: '分析节点',
    nodes: [
      { type: 'data_analysis', name: '数据分析', icon: '📊', description: 'AI数据分析' },
      { type: 'risk_assess', name: '风险评估', icon: '⚠️', description: '风险评估分析' },
      { type: 'anomaly_detect', name: '异常检测', icon: '🔍', description: '异常情况检测' }
    ]
  },
  {
    name: 'output',
    label: '输出节点',
    nodes: [
      { type: 'summary', name: '总结报告', icon: '📋', description: '生成审计总结' },
      { type: 'conclusion', name: '审计结论', icon: '✅', description: '审计结论输出' }
    ]
  }
];

const allNodeTypes = computed(() => {
  return nodeCategories.flatMap(cat => cat.nodes);
});

const selectedNode = computed(() => {
  return nodes.value.find(n => n.id === selectedNodeId.value);
});

// 生命周期
onLoad((options: any) => {
  if (options.id) {
    workpaperId.value = options.id;
    loadWorkpaper();
  } else {
    // 新建底稿，初始化示例节点
    initDemoNodes();
  }
});

// 加载底稿数据
const loadWorkpaper = async () => {
  try {
    // TODO: 调用API加载底稿数据
    // const data = await workpaperApi.getWorkpaperDetail(workpaperId.value);
    
    // 临时使用示例数据
    workpaper.value = {
      id: workpaperId.value,
      title: '审计底稿 - 收入审计',
      status: 'draft',
      projectId: 'project-001'
    };
    
    initDemoNodes();
  } catch (error) {
    console.error('加载底稿失败:', error);
    uni.showToast({ title: '加载失败', icon: 'none' });
  }
};

// 初始化示例节点
const initDemoNodes = () => {
  nodes.value = [
    {
      id: 'node-1',
      type: 'voucher',
      position: { x: 100, y: 100 },
      data: {
        title: '凭证录入',
        content: '输入凭证信息...'
      },
      outputs: ['output-1']
    },
    {
      id: 'node-2',
      type: 'data_analysis',
      position: { x: 400, y: 100 },
      data: {
        title: '数据分析',
        content: 'AI分析凭证数据...'
      },
      inputs: ['input-1'],
      outputs: ['output-2']
    },
    {
      id: 'node-3',
      type: 'summary',
      position: { x: 700, y: 100 },
      data: {
        title: '审计结论',
        content: '生成审计结论...'
      },
      inputs: ['input-2']
    }
  ];
  
  connections.value = [
    {
      id: 'conn-1',
      from: 'node-1',
      fromPort: 'output-1',
      to: 'node-2',
      toPort: 'input-1'
    },
    {
      id: 'conn-2',
      from: 'node-2',
      fromPort: 'output-2',
      to: 'node-3',
      toPort: 'input-2'
    }
  ];
};

// 工具栏操作
const handleBack = () => {
  uni.navigateBack();
};

const handleAddNode = () => {
  showAddNodeModal.value = true;
};

const handleAutoLayout = () => {
  try {
    // 使用层次布局算法
    const layoutNodes = hierarchicalLayout(nodes.value, connections.value);
    
    // 更新节点位置
    nodes.value = layoutNodes;
    
    uni.showToast({ title: '自动布局完成', icon: 'success' });
  } catch (error) {
    console.error('自动布局失败:', error);
    uni.showToast({ title: '自动布局失败', icon: 'error' });
  }
};

const handleAIAnalyze = async () => {
  try {
    uni.showLoading({ title: 'AI分析中...' });
    
    // 分析整个工作流
    const result = await aiService.analyzeWorkflow(
      workpaperId.value,
      nodes.value,
      connections.value
    );
    
    uni.hideLoading();
    
    // 显示分析结果
    uni.showModal({
      title: '工作流分析完成',
      content: `整体风险: ${result.overallRisk}\n评分: ${result.overallScore}\n${result.summary}`,
      showCancel: false
    });
  } catch (error) {
    uni.hideLoading();
    console.error('AI分析失败:', error);
    uni.showToast({ 
      title: 'AI分析失败，请稍后重试', 
      icon: 'none' 
    });
  }
};

const handleSave = async () => {
  try {
    const saveData = {
      nodes: nodes.value,
      connections: connections.value,
      metadata: {
        version: Date.now(),
        lastModified: new Date().toISOString(),
        autoSaved: false
      }
    };
    
    await autoSaveManager.debounceSave(
      workpaperId.value,
      saveData,
      async (id, data) => {
        await updateWorkpaper(id, data);
      },
      { immediate: true, showToast: true }
    );
  } catch (error) {
    console.error('保存失败:', error);
    uni.showToast({ title: '保存失败', icon: 'error' });
  }
};

// 节点操作
const addNodeToCanvas = (nodeType: any) => {
  const newNode = {
    id: `node-${Date.now()}`,
    type: nodeType.type,
    position: { x: 200, y: 200 },
    data: {
      title: nodeType.name,
      content: ''
    },
    inputs: nodeType.type !== 'voucher' ? ['input-1'] : [],
    outputs: nodeType.type !== 'summary' ? ['output-1'] : []
  };
  
  nodes.value.push(newNode);
  selectedNodeId.value = newNode.id;
  showAddNodeModal.value = false;
};

const handleNodeSelect = (nodeId: string) => {
  selectedNodeId.value = nodeId;
};

const handleNodeMove = (payload: { nodeId: string; position: { x: number; y: number } }) => {
  const node = nodes.value.find(n => n.id === payload.nodeId);
  if (node) {
    node.position = payload.position;
  }
};

const handleNodeDelete = () => {
  if (!selectedNodeId.value) return;
  
  const index = nodes.value.findIndex(n => n.id === selectedNodeId.value);
  if (index > -1) {
    nodes.value.splice(index, 1);
    // 删除相关连接
    connections.value = connections.value.filter(
      conn => conn.from !== selectedNodeId.value && conn.to !== selectedNodeId.value
    );
    selectedNodeId.value = '';
  }
};

const handleConnectionCreate = (payload: any) => {
  connections.value.push({
    id: `conn-${Date.now()}`,
    ...payload
  });
};

const handleConnectionDelete = (connectionId: string) => {
  const index = connections.value.findIndex(c => c.id === connectionId);
  if (index > -1) {
    connections.value.splice(index, 1);
  }
};

const handleCanvasClick = () => {
  selectedNodeId.value = '';
};

const handleNodeAIAnalyze = async () => {
  if (!selectedNode.value) return;
  
  try {
    uni.showLoading({ title: 'AI分析中...' });
    
    // 构建分析上下文
    const context = {
      nodeType: selectedNode.value.type,
      nodeTitle: selectedNode.value.data.title,
      content: selectedNode.value.data.content,
      relatedNodes: getRelatedNodes(selectedNode.value.id),
      projectInfo: {
        name: workpaper.value.title,
        industry: '通用',
        auditType: '内部审计'
      }
    };
    
    // 调用AI分析
    const result = await aiService.analyzeNode(
      selectedNode.value.id,
      context
    );
    
    // 更新节点的AI分析结果
    selectedNode.value.aiAnalysis = result;
    
    uni.hideLoading();
    uni.showToast({ title: 'AI分析完成', icon: 'success' });
  } catch (error) {
    uni.hideLoading();
    console.error('节点AI分析失败:', error);
    uni.showToast({ 
      title: 'AI分析失败，请稍后重试', 
      icon: 'none' 
    });
  }
};

// 缩放控制
const handleZoomIn = () => {
  canvasZoom.value = Math.min(canvasZoom.value + 0.1, 2);
};

const handleZoomOut = () => {
  canvasZoom.value = Math.max(canvasZoom.value - 0.1, 0.5);
};

const handleZoomReset = () => {
  canvasZoom.value = 1;
};

const getNodeTypeName = (type: string) => {
  const node = allNodeTypes.value.find(n => n.type === type);
  return node ? node.name : type;
};

// 获取相关节点
const getRelatedNodes = (nodeId: string) => {
  const related: any[] = [];
  
  // 获取输入节点
  connections.value
    .filter(conn => conn.to === nodeId)
    .forEach(conn => {
      const node = nodes.value.find(n => n.id === conn.from);
      if (node) {
        related.push({
          id: node.id,
          type: node.type,
          title: node.data.title,
          content: node.data.content
        });
      }
    });
  
  // 获取输出节点
  connections.value
    .filter(conn => conn.from === nodeId)
    .forEach(conn => {
      const node = nodes.value.find(n => n.id === conn.to);
      if (node) {
        related.push({
          id: node.id,
          type: node.type,
          title: node.data.title,
          content: node.data.content
        });
      }
    });
  
  return related;
};

// 自动保存（监听数据变化）
watch([nodes, connections], () => {
  if (!workpaperId.value) return;
  
  const saveData = {
    nodes: nodes.value,
    connections: connections.value,
    metadata: {
      version: Date.now(),
      lastModified: new Date().toISOString(),
      autoSaved: true
    }
  };
  
  autoSaveManager.debounceSave(
    workpaperId.value,
    saveData,
    async (id, data) => {
      await updateWorkpaper(id, data);
    },
    { immediate: false, showToast: false }
  );
}, { deep: true });

// 页面卸载时清理
onUnmounted(() => {
  autoSaveManager.clearTimer();
});
</script>

<style lang="scss" scoped>
.workpaper-detail {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: #1e1e1e;
  color: #e0e0e0;
}

// 工具栏样式（类似ComfyUI）
.toolbar {
  height: 60px;
  background: #2d2d2d;
  border-bottom: 1px solid #3d3d3d;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
  
  .toolbar-left {
    display: flex;
    align-items: center;
    gap: 15px;
  }
  
  .back-btn {
    width: 36px;
    height: 36px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #3d3d3d;
    border-radius: 6px;
    cursor: pointer;
    
    &:hover {
      background: #4d4d4d;
    }
  }
  
  .title-info {
    display: flex;
    flex-direction: column;
    gap: 4px;
    
    .title {
      font-size: 16px;
      font-weight: 600;
      color: #fff;
    }
    
    .status {
      font-size: 12px;
      padding: 2px 8px;
      border-radius: 4px;
      width: fit-content;
      
      &.status-draft {
        background: #4a4a4a;
        color: #aaa;
      }
      
      &.status-locked {
        background: #ffa50033;
        color: #ffa500;
      }
      
      &.status-reviewed {
        background: #1890ff33;
        color: #1890ff;
      }
      
      &.status-approved {
        background: #52c41a33;
        color: #52c41a;
      }
    }
  }
  
  .toolbar-right {
    display: flex;
    gap: 10px;
  }
  
  .tool-btn {
    padding: 8px 16px;
    background: #3d3d3d;
    border-radius: 6px;
    font-size: 14px;
    cursor: pointer;
    transition: all 0.2s;
    
    &:hover {
      background: #4d4d4d;
    }
    
    &.primary {
      background: #1890ff;
      color: #fff;
      
      &:hover {
        background: #40a9ff;
      }
    }
  }
}

// 主工作区
.main-workspace {
  flex: 1;
  display: flex;
  overflow: hidden;
}

// 侧边面板样式
.node-panel,
.property-panel {
  background: #252525;
  border-right: 1px solid #3d3d3d;
  display: flex;
  flex-direction: column;
  transition: all 0.3s;
  
  &.collapsed {
    width: 40px;
    
    .panel-content {
      display: none;
    }
  }
}

.node-panel {
  width: 250px;
  border-right: 1px solid #3d3d3d;
}

.property-panel {
  width: 300px;
  border-left: 1px solid #3d3d3d;
  border-right: none;
}

.panel-header {
  height: 50px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 15px;
  border-bottom: 1px solid #3d3d3d;
  
  .panel-title {
    font-size: 14px;
    font-weight: 600;
    color: #fff;
  }
  
  .toggle-btn {
    width: 24px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    border-radius: 4px;
    
    &:hover {
      background: #3d3d3d;
    }
  }
}

.panel-content {
  flex: 1;
  padding: 15px;
}

// 节点库
.node-category {
  margin-bottom: 20px;
  
  .category-title {
    font-size: 12px;
    color: #888;
    margin-bottom: 10px;
    text-transform: uppercase;
  }
  
  .node-item {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px;
    background: #2d2d2d;
    border-radius: 6px;
    margin-bottom: 8px;
    cursor: pointer;
    transition: all 0.2s;
    
    &:hover {
      background: #3d3d3d;
      transform: translateX(5px);
    }
    
    .node-icon {
      font-size: 20px;
    }
    
    .node-name {
      font-size: 13px;
      color: #e0e0e0;
    }
  }
}

// 画布容器
.canvas-container {
  flex: 1;
  position: relative;
  background: #1a1a1a;
  background-image: 
    linear-gradient(rgba(255, 255, 255, 0.05) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255, 255, 255, 0.05) 1px, transparent 1px);
  background-size: 20px 20px;
}

// 缩放控制
.zoom-controls {
  position: absolute;
  bottom: 20px;
  right: 20px;
  display: flex;
  gap: 5px;
  background: #2d2d2d;
  border-radius: 8px;
  padding: 5px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
  
  .zoom-btn,
  .zoom-display {
    width: 36px;
    height: 36px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 6px;
    font-size: 14px;
    cursor: pointer;
    
    &:hover {
      background: #3d3d3d;
    }
  }
  
  .zoom-display {
    font-size: 12px;
    cursor: default;
    
    &:hover {
      background: transparent;
    }
  }
}

// 属性面板
.property-content {
  .property-section {
    margin-bottom: 25px;
    
    .section-title {
      font-size: 13px;
      color: #888;
      margin-bottom: 12px;
      text-transform: uppercase;
    }
    
    .property-item {
      margin-bottom: 15px;
      
      &.full {
        .textarea {
          height: 200px;
        }
      }
      
      .label {
        display: block;
        font-size: 12px;
        color: #aaa;
        margin-bottom: 6px;
      }
      
      .input,
      .textarea {
        width: 100%;
        padding: 8px 12px;
        background: #2d2d2d;
        border: 1px solid #3d3d3d;
        border-radius: 6px;
        color: #e0e0e0;
        font-size: 13px;
        
        &:focus {
          border-color: #1890ff;
          outline: none;
        }
      }
      
      .textarea {
        min-height: 80px;
        resize: vertical;
      }
      
      .value {
        color: #e0e0e0;
        font-size: 13px;
      }
    }
  }
  
  .ai-result {
    .risk-level {
      padding: 8px 12px;
      border-radius: 6px;
      margin-bottom: 10px;
      font-size: 13px;
      
      &.risk-low {
        background: #52c41a33;
        color: #52c41a;
      }
      
      &.risk-medium {
        background: #ffa50033;
        color: #ffa500;
      }
      
      &.risk-high {
        background: #ff4d4f33;
        color: #ff4d4f;
      }
    }
    
    .findings {
      .finding-item {
        padding: 10px;
        background: #2d2d2d;
        border-radius: 6px;
        margin-bottom: 8px;
        
        .finding-title {
          display: block;
          font-size: 13px;
          font-weight: 600;
          color: #fff;
          margin-bottom: 4px;
        }
        
        .finding-desc {
          font-size: 12px;
          color: #aaa;
          line-height: 1.5;
        }
      }
    }
  }
  
  .property-actions {
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin-top: 20px;
    
    .action-btn {
      padding: 10px;
      background: #1890ff;
      color: #fff;
      border-radius: 6px;
      text-align: center;
      cursor: pointer;
      
      &:hover {
        background: #40a9ff;
      }
      
      &.danger {
        background: #ff4d4f;
        
        &:hover {
          background: #ff7875;
        }
      }
    }
  }
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  text-align: center;
  
  .empty-icon {
    font-size: 48px;
    margin-bottom: 15px;
    opacity: 0.3;
  }
  
  .empty-text {
    font-size: 14px;
    color: #666;
  }
}

// 弹窗样式
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  width: 600px;
  max-height: 80vh;
  background: #2d2d2d;
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  
  .modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 20px;
    border-bottom: 1px solid #3d3d3d;
    
    .modal-title {
      font-size: 18px;
      font-weight: 600;
      color: #fff;
    }
    
    .close-btn {
      width: 32px;
      height: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 6px;
      cursor: pointer;
      
      &:hover {
        background: #3d3d3d;
      }
    }
  }
  
  .modal-body {
    flex: 1;
    padding: 20px;
    overflow-y: auto;
    
    .node-type-card {
      display: flex;
      align-items: center;
      gap: 15px;
      padding: 15px;
      background: #252525;
      border-radius: 8px;
      margin-bottom: 10px;
      cursor: pointer;
      transition: all 0.2s;
      
      &:hover {
        background: #3d3d3d;
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
      }
      
      .card-icon {
        font-size: 36px;
      }
      
      .card-info {
        flex: 1;
        
        .card-title {
          display: block;
          font-size: 15px;
          font-weight: 600;
          color: #fff;
          margin-bottom: 4px;
        }
        
        .card-desc {
          font-size: 13px;
          color: #888;
        }
      }
    }
  }
}
</style>
