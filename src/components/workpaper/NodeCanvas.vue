<template>
  <view 
    class="node-canvas"
    @touchstart="handleCanvasTouch"
    @click="$emit('canvas-click')"
  >
    <!-- SVG连线层 -->
    <svg class="connections-layer" width="100%" height="100%">
      <defs>
        <!-- 连线箭头定义 -->
        <marker
          id="arrowhead"
          markerWidth="10"
          markerHeight="10"
          refX="8"
          refY="3"
          orient="auto"
        >
          <polygon 
            points="0 0, 10 3, 0 6" 
            fill="#666"
          />
        </marker>
      </defs>
      
      <!-- 绘制所有连线 -->
      <path
        v-for="conn in connections"
        :key="conn.id"
        :d="getConnectionPath(conn)"
        class="connection-line"
        :class="{ selected: selectedConnection === conn.id }"
        stroke="#666"
        stroke-width="2"
        fill="none"
        marker-end="url(#arrowhead)"
        @click.stop="handleConnectionClick(conn.id)"
      />
      
      <!-- 正在绘制的临时连线 -->
      <path
        v-if="draggingConnection"
        :d="getTempConnectionPath()"
        class="connection-line temp"
        stroke="#1890ff"
        stroke-width="2"
        stroke-dasharray="5,5"
        fill="none"
      />
    </svg>

    <!-- 节点层 -->
    <view 
      class="node-item"
      v-for="node in nodes"
      :key="node.id"
      :class="{ selected: node.id === selectedNodeId }"
      :style="{
        left: node.position.x + 'px',
        top: node.position.y + 'px'
      }"
      @click.stop="$emit('node-select', node.id)"
      @touchstart.stop="handleNodeTouchStart($event, node)"
      @touchmove.stop="handleNodeTouchMove"
      @touchend.stop="handleNodeTouchEnd"
    >
      <!-- 节点头部 -->
      <view class="node-header" :class="'node-type-' + node.type">
        <text class="node-icon">{{ getNodeIcon(node.type) }}</text>
        <text class="node-title">{{ node.data.title }}</text>
        <view class="node-menu" @click.stop="handleNodeMenu(node.id)">
          <text>⋮</text>
        </view>
      </view>
      
      <!-- 输入端口 -->
      <view class="node-ports inputs" v-if="node.inputs && node.inputs.length">
        <view 
          class="port"
          v-for="(port, index) in node.inputs"
          :key="port"
          @touchstart.stop="handlePortTouchStart($event, node.id, port, 'input')"
        >
          <view class="port-dot"></view>
          <text class="port-label">输入{{ index + 1 }}</text>
        </view>
      </view>
      
      <!-- 节点内容预览 -->
      <view class="node-content">
        <text class="content-preview">
          {{ node.data.content || '点击编辑内容...' }}
        </text>
      </view>
      
      <!-- 输出端口 -->
      <view class="node-ports outputs" v-if="node.outputs && node.outputs.length">
        <view 
          class="port"
          v-for="(port, index) in node.outputs"
          :key="port"
          @touchstart.stop="handlePortTouchStart($event, node.id, port, 'output')"
        >
          <text class="port-label">输出{{ index + 1 }}</text>
          <view class="port-dot"></view>
        </view>
      </view>
      
      <!-- AI分析状态标记 -->
      <view v-if="node.aiAnalysis" class="ai-badge" :class="'risk-' + node.aiAnalysis.riskLevel">
        <text>🤖</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';

interface Props {
  nodes: any[];
  connections: any[];
  selectedNodeId?: string;
}

const props = withDefaults(defineProps<Props>(), {
  selectedNodeId: ''
});

const emit = defineEmits([
  'node-select',
  'node-move',
  'node-delete',
  'connection-create',
  'connection-delete',
  'canvas-click'
]);

// 节点拖拽状态
const draggingNode = ref<string | null>(null);
const dragStartPos = ref({ x: 0, y: 0 });
const dragOffset = ref({ x: 0, y: 0 });

// 连线拖拽状态
const draggingConnection = ref<any>(null);
const selectedConnection = ref<string | null>(null);

// 节点图标映射
const nodeIcons: Record<string, string> = {
  voucher: '📝',
  invoice: '🧾',
  contract: '📄',
  bank_flow: '💰',
  data_analysis: '📊',
  risk_assess: '⚠️',
  anomaly_detect: '🔍',
  summary: '📋',
  conclusion: '✅'
};

const getNodeIcon = (type: string) => {
  return nodeIcons[type] || '📦';
};

// 节点触摸开始
const handleNodeTouchStart = (event: any, node: any) => {
  const touch = event.touches[0];
  draggingNode.value = node.id;
  dragStartPos.value = {
    x: touch.clientX,
    y: touch.clientY
  };
  dragOffset.value = {
    x: node.position.x,
    y: node.position.y
  };
};

// 节点拖拽移动
const handleNodeTouchMove = (event: any) => {
  if (!draggingNode.value) return;
  
  const touch = event.touches[0];
  const deltaX = touch.clientX - dragStartPos.value.x;
  const deltaY = touch.clientY - dragStartPos.value.y;
  
  const newPosition = {
    x: Math.max(0, dragOffset.value.x + deltaX),
    y: Math.max(0, dragOffset.value.y + deltaY)
  };
  
  emit('node-move', {
    nodeId: draggingNode.value,
    position: newPosition
  });
};

// 节点拖拽结束
const handleNodeTouchEnd = () => {
  draggingNode.value = null;
};

// 端口触摸开始（用于连线）
const handlePortTouchStart = (event: any, nodeId: string, portId: string, portType: 'input' | 'output') => {
  if (portType === 'output') {
    const touch = event.touches[0];
    draggingConnection.value = {
      from: nodeId,
      fromPort: portId,
      currentPos: {
        x: touch.clientX,
        y: touch.clientY
      }
    };
  }
};

// 画布触摸处理
const handleCanvasTouch = (event: any) => {
  if (draggingConnection.value) {
    const touch = event.touches[0];
    draggingConnection.value.currentPos = {
      x: touch.clientX,
      y: touch.clientY
    };
  }
};

// 获取连线路径（贝塞尔曲线）
const getConnectionPath = (conn: any) => {
  const fromNode = props.nodes.find(n => n.id === conn.from);
  const toNode = props.nodes.find(n => n.id === conn.to);
  
  if (!fromNode || !toNode) return '';
  
  // 计算起点和终点坐标
  const startX = fromNode.position.x + 260; // 节点宽度
  const startY = fromNode.position.y + 60;  // 大致中间位置
  const endX = toNode.position.x;
  const endY = toNode.position.y + 60;
  
  // 控制点（使曲线更平滑）
  const controlX1 = startX + (endX - startX) / 3;
  const controlY1 = startY;
  const controlX2 = endX - (endX - startX) / 3;
  const controlY2 = endY;
  
  return `M ${startX} ${startY} C ${controlX1} ${controlY1}, ${controlX2} ${controlY2}, ${endX} ${endY}`;
};

// 获取临时连线路径
const getTempConnectionPath = () => {
  if (!draggingConnection.value) return '';
  
  const fromNode = props.nodes.find(n => n.id === draggingConnection.value.from);
  if (!fromNode) return '';
  
  const startX = fromNode.position.x + 260;
  const startY = fromNode.position.y + 60;
  const endX = draggingConnection.value.currentPos.x;
  const endY = draggingConnection.value.currentPos.y;
  
  const controlX1 = startX + (endX - startX) / 3;
  const controlY1 = startY;
  const controlX2 = endX - (endX - startX) / 3;
  const controlY2 = endY;
  
  return `M ${startX} ${startY} C ${controlX1} ${controlY1}, ${controlX2} ${controlY2}, ${endX} ${endY}`;
};

// 连线点击
const handleConnectionClick = (connectionId: string) => {
  selectedConnection.value = connectionId;
};

// 节点菜单
const handleNodeMenu = (nodeId: string) => {
  uni.showActionSheet({
    itemList: ['编辑', 'AI分析', '删除'],
    success: (res) => {
      if (res.tapIndex === 2) {
        emit('node-delete', nodeId);
      }
    }
  });
};
</script>

<style lang="scss" scoped>
.node-canvas {
  width: 100%;
  height: 100%;
  position: relative;
  overflow: hidden;
}

.connections-layer {
  position: absolute;
  top: 0;
  left: 0;
  pointer-events: none;
  
  .connection-line {
    pointer-events: stroke;
    transition: stroke 0.2s;
    
    &:hover {
      stroke: #1890ff;
      stroke-width: 3;
    }
    
    &.selected {
      stroke: #52c41a;
      stroke-width: 3;
    }
    
    &.temp {
      animation: dash 1s linear infinite;
    }
  }
}

@keyframes dash {
  to {
    stroke-dashoffset: -10;
  }
}

.node-item {
  position: absolute;
  width: 260px;
  background: #2d2d2d;
  border: 2px solid #3d3d3d;
  border-radius: 8px;
  cursor: move;
  transition: all 0.2s;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
  
  &.selected {
    border-color: #1890ff;
    box-shadow: 0 0 0 3px rgba(24, 144, 255, 0.2),
                0 4px 12px rgba(0, 0, 0, 0.4);
  }
  
  &:hover {
    border-color: #4d4d4d;
  }
}

.node-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  border-bottom: 1px solid #3d3d3d;
  border-radius: 6px 6px 0 0;
  
  &.node-type-voucher {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  }
  
  &.node-type-invoice {
    background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
  }
  
  &.node-type-contract {
    background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
  }
  
  &.node-type-bank_flow {
    background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%);
  }
  
  &.node-type-data_analysis {
    background: linear-gradient(135deg, #fa709a 0%, #fee140 100%);
  }
  
  &.node-type-risk_assess {
    background: linear-gradient(135deg, #ff6b6b 0%, #ffa500 100%);
  }
  
  &.node-type-anomaly_detect {
    background: linear-gradient(135deg, #30cfd0 0%, #330867 100%);
  }
  
  &.node-type-summary,
  &.node-type-conclusion {
    background: linear-gradient(135deg, #a8edea 0%, #fed6e3 100%);
  }
  
  .node-icon {
    font-size: 18px;
  }
  
  .node-title {
    flex: 1;
    font-size: 14px;
    font-weight: 600;
    color: #fff;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  
  .node-menu {
    width: 24px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 4px;
    color: #fff;
    
    &:hover {
      background: rgba(255, 255, 255, 0.2);
    }
  }
}

.node-content {
  padding: 12px;
  min-height: 60px;
  max-height: 120px;
  overflow: hidden;
  
  .content-preview {
    font-size: 12px;
    color: #aaa;
    line-height: 1.5;
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 3;
    overflow: hidden;
  }
}

.node-ports {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 8px 12px;
  
  &.inputs {
    border-top: 1px solid #3d3d3d;
  }
  
  &.outputs {
    border-top: 1px solid #3d3d3d;
  }
  
  .port {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 11px;
    color: #888;
    
    &:hover {
      color: #1890ff;
      
      .port-dot {
        background: #1890ff;
        transform: scale(1.3);
      }
    }
    
    .port-dot {
      width: 12px;
      height: 12px;
      background: #666;
      border: 2px solid #2d2d2d;
      border-radius: 50%;
      cursor: crosshair;
      transition: all 0.2s;
    }
    
    .port-label {
      user-select: none;
    }
  }
  
  &.outputs .port {
    flex-direction: row-reverse;
  }
}

.ai-badge {
  position: absolute;
  top: -8px;
  right: -8px;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
  
  &.risk-low {
    background: #52c41a;
  }
  
  &.risk-medium {
    background: #ffa500;
  }
  
  &.risk-high {
    background: #ff4d4f;
  }
}
</style>
