/**
 * 自动布局算法
 * 提供层次布局、网格对齐等功能
 */

interface Node {
  id: string;
  position: { x: number; y: number };
  inputs?: string[];
  outputs?: string[];
}

interface Connection {
  id: string;
  from: string;
  to: string;
}

interface LayoutConfig {
  nodeWidth: number;
  nodeHeight: number;
  horizontalSpacing: number;
  verticalSpacing: number;
  startX: number;
  startY: number;
}

const DEFAULT_CONFIG: LayoutConfig = {
  nodeWidth: 260,
  nodeHeight: 120,
  horizontalSpacing: 150,
  verticalSpacing: 100,
  startX: 50,
  startY: 50
};

/**
 * 层次布局算法（适用于DAG）
 */
export function hierarchicalLayout(
  nodes: Node[],
  connections: Connection[],
  config: Partial<LayoutConfig> = {}
): Node[] {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  
  // 构建邻接表
  const adjList = buildAdjacencyList(nodes, connections);
  
  // 拓扑排序，计算每个节点的层级
  const levels = calculateLevels(nodes, adjList);
  
  // 按层级分组
  const layers = groupByLevel(nodes, levels);
  
  // 计算每个节点的位置
  const layoutNodes = nodes.map(node => ({
    ...node,
    position: calculatePosition(node.id, layers, levels, cfg)
  }));
  
  return layoutNodes;
}

/**
 * 网格对齐布局
 */
export function gridLayout(
  nodes: Node[],
  config: Partial<LayoutConfig> = {}
): Node[] {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  
  // 计算网格大小
  const cols = Math.ceil(Math.sqrt(nodes.length));
  const rows = Math.ceil(nodes.length / cols);
  
  return nodes.map((node, index) => {
    const col = index % cols;
    const row = Math.floor(index / cols);
    
    return {
      ...node,
      position: {
        x: cfg.startX + col * (cfg.nodeWidth + cfg.horizontalSpacing),
        y: cfg.startY + row * (cfg.nodeHeight + cfg.verticalSpacing)
      }
    };
  });
}

/**
 * 力导向布局（简化版）
 */
export function forceDirectedLayout(
  nodes: Node[],
  connections: Connection[],
  iterations: number = 50
): Node[] {
  const repulsionStrength = 5000;
  const attractionStrength = 0.01;
  const centerStrength = 0.05;
  
  let layoutNodes = nodes.map(n => ({ ...n }));
  
  for (let i = 0; i < iterations; i++) {
    const forces = new Map<string, { x: number; y: number }>();
    
    // 初始化力
    layoutNodes.forEach(node => {
      forces.set(node.id, { x: 0, y: 0 });
    });
    
    // 计算斥力（节点之间互相排斥）
    for (let j = 0; j < layoutNodes.length; j++) {
      for (let k = j + 1; k < layoutNodes.length; k++) {
        const node1 = layoutNodes[j];
        const node2 = layoutNodes[k];
        
        const dx = node2.position.x - node1.position.x;
        const dy = node2.position.y - node1.position.y;
        const distance = Math.sqrt(dx * dx + dy * dy) || 1;
        
        const force = repulsionStrength / (distance * distance);
        const fx = (dx / distance) * force;
        const fy = (dy / distance) * force;
        
        const force1 = forces.get(node1.id)!;
        const force2 = forces.get(node2.id)!;
        
        force1.x -= fx;
        force1.y -= fy;
        force2.x += fx;
        force2.y += fy;
      }
    }
    
    // 计算引力（连接的节点互相吸引）
    connections.forEach(conn => {
      const node1 = layoutNodes.find(n => n.id === conn.from);
      const node2 = layoutNodes.find(n => n.id === conn.to);
      
      if (node1 && node2) {
        const dx = node2.position.x - node1.position.x;
        const dy = node2.position.y - node1.position.y;
        const distance = Math.sqrt(dx * dx + dy * dy) || 1;
        
        const force = distance * attractionStrength;
        const fx = (dx / distance) * force;
        const fy = (dy / distance) * force;
        
        const force1 = forces.get(node1.id)!;
        const force2 = forces.get(node2.id)!;
        
        force1.x += fx;
        force1.y += fy;
        force2.x -= fx;
        force2.y -= fy;
      }
    });
    
    // 向中心的引力
    const centerX = 500;
    const centerY = 300;
    layoutNodes.forEach(node => {
      const force = forces.get(node.id)!;
      force.x += (centerX - node.position.x) * centerStrength;
      force.y += (centerY - node.position.y) * centerStrength;
    });
    
    // 应用力
    layoutNodes = layoutNodes.map(node => {
      const force = forces.get(node.id)!;
      return {
        ...node,
        position: {
          x: Math.max(50, node.position.x + force.x),
          y: Math.max(50, node.position.y + force.y)
        }
      };
    });
  }
  
  return layoutNodes;
}

/**
 * 对齐到网格
 */
export function alignToGrid(
  nodes: Node[],
  gridSize: number = 20
): Node[] {
  return nodes.map(node => ({
    ...node,
    position: {
      x: Math.round(node.position.x / gridSize) * gridSize,
      y: Math.round(node.position.y / gridSize) * gridSize
    }
  }));
}

/**
 * 构建邻接表
 */
function buildAdjacencyList(
  nodes: Node[],
  connections: Connection[]
): Map<string, string[]> {
  const adjList = new Map<string, string[]>();
  
  nodes.forEach(node => {
    adjList.set(node.id, []);
  });
  
  connections.forEach(conn => {
    const neighbors = adjList.get(conn.from) || [];
    neighbors.push(conn.to);
    adjList.set(conn.from, neighbors);
  });
  
  return adjList;
}

/**
 * 计算节点层级（拓扑排序）
 */
function calculateLevels(
  nodes: Node[],
  adjList: Map<string, string[]>
): Map<string, number> {
  const levels = new Map<string, number>();
  const visited = new Set<string>();
  
  // 计算入度
  const inDegree = new Map<string, number>();
  nodes.forEach(node => inDegree.set(node.id, 0));
  
  // 通过邻接表计算入度
  adjList.forEach((neighbors, nodeId) => {
    neighbors.forEach(neighborId => {
      inDegree.set(neighborId, (inDegree.get(neighborId) || 0) + 1);
    });
  });
  
  // BFS计算层级
  const queue: string[] = [];
  nodes.forEach(node => {
    if (inDegree.get(node.id) === 0) {
      queue.push(node.id);
      levels.set(node.id, 0);
    }
  });
  
  while (queue.length > 0) {
    const nodeId = queue.shift()!;
    const currentLevel = levels.get(nodeId) || 0;
    
    const neighbors = adjList.get(nodeId) || [];
    neighbors.forEach(neighborId => {
      const newLevel = currentLevel + 1;
      const existingLevel = levels.get(neighborId);
      
      if (existingLevel === undefined || newLevel > existingLevel) {
        levels.set(neighborId, newLevel);
      }
      
      if (!visited.has(neighborId)) {
        visited.add(neighborId);
        queue.push(neighborId);
      }
    });
  }
  
  // 没有被访问到的节点设为0级
  nodes.forEach(node => {
    if (!levels.has(node.id)) {
      levels.set(node.id, 0);
    }
  });
  
  return levels;
}

/**
 * 按层级分组
 */
function groupByLevel(
  nodes: Node[],
  levels: Map<string, number>
): Map<number, string[]> {
  const layers = new Map<number, string[]>();
  
  nodes.forEach(node => {
    const level = levels.get(node.id) || 0;
    const layer = layers.get(level) || [];
    layer.push(node.id);
    layers.set(level, layer);
  });
  
  return layers;
}

/**
 * 计算节点位置
 */
function calculatePosition(
  nodeId: string,
  layers: Map<number, string[]>,
  levels: Map<string, number>,
  config: LayoutConfig
): { x: number; y: number } {
  const level = levels.get(nodeId) || 0;
  const layer = layers.get(level) || [];
  const indexInLayer = layer.indexOf(nodeId);
  
  const layerHeight = layer.length * (config.nodeHeight + config.verticalSpacing);
  const startY = config.startY + (indexInLayer - layer.length / 2 + 0.5) * (config.nodeHeight + config.verticalSpacing);
  
  return {
    x: config.startX + level * (config.nodeWidth + config.horizontalSpacing),
    y: Math.max(config.startY, startY)
  };
}

/**
 * 优化连线交叉（减少连线交叉）
 */
export function optimizeCrossings(
  nodes: Node[],
  connections: Connection[]
): Node[] {
  // 这是一个简化版本，实际可以使用更复杂的算法
  // 例如：barycenter heuristic
  return nodes;
}

/**
 * 计算布局边界
 */
export function calculateBounds(nodes: Node[]): {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  width: number;
  height: number;
} {
  if (nodes.length === 0) {
    return { minX: 0, minY: 0, maxX: 0, maxY: 0, width: 0, height: 0 };
  }
  
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  
  nodes.forEach(node => {
    minX = Math.min(minX, node.position.x);
    minY = Math.min(minY, node.position.y);
    maxX = Math.max(maxX, node.position.x + DEFAULT_CONFIG.nodeWidth);
    maxY = Math.max(maxY, node.position.y + DEFAULT_CONFIG.nodeHeight);
  });
  
  return {
    minX,
    minY,
    maxX,
    maxY,
    width: maxX - minX,
    height: maxY - minY
  };
}
