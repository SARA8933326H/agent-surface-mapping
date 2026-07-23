'use client';

import { useMemo } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  NodeProps,
  Handle,
  Position,
  useNodesState,
  useEdgesState,
  Node,
  Edge,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { GraphData, GraphNodeType } from '@surface/shared';

const nodeTypeColors: Record<GraphNodeType, string> = {
  [GraphNodeType.PAGE]: '#6366F1',
  [GraphNodeType.FORM]: '#10B981',
  [GraphNodeType.ENDPOINT]: '#F59E0B',
  [GraphNodeType.ASSET]: '#9CA3AF',
  [GraphNodeType.SCRIPT]: '#EC4899',
  [GraphNodeType.AUTH]: '#EF4444',
  [GraphNodeType.ADMIN]: '#8B5CF6',
  [GraphNodeType.OBJECT]: '#3B82F6',
};

function BaseNode({ data, type }: NodeProps<{ label: string }>) {
  const color = nodeTypeColors[(type as GraphNodeType) || GraphNodeType.PAGE];
  return (
    <div
      className="rounded-md border px-3 py-2 text-xs font-medium text-white shadow-sm"
      style={{ borderColor: color, backgroundColor: `${color}20` }}
    >
      <Handle type="target" position={Position.Top} style={{ background: color }} />
      {data.label}
      <Handle type="source" position={Position.Bottom} style={{ background: color }} />
    </div>
  );
}

const nodeTypes = {
  [GraphNodeType.PAGE]: BaseNode,
  [GraphNodeType.FORM]: BaseNode,
  [GraphNodeType.ENDPOINT]: BaseNode,
  [GraphNodeType.ASSET]: BaseNode,
  [GraphNodeType.SCRIPT]: BaseNode,
  [GraphNodeType.AUTH]: BaseNode,
  [GraphNodeType.ADMIN]: BaseNode,
  [GraphNodeType.OBJECT]: BaseNode,
};

export function AttackGraph({ graph }: { graph: GraphData }) {
  const initialNodes: Node<{ label: string }>[] = useMemo(
    () =>
      graph.nodes.map((n) => ({
        id: n.id,
        type: n.type,
        position: { x: n.x ?? 0, y: n.y ?? 0 },
        data: { label: n.label, ...(n.data || {}) },
      })),
    [graph.nodes],
  );
  const initialEdges: Edge[] = useMemo(
    () =>
      graph.edges.map((e) => ({
        id: e.id,
        source: e.source,
        target: e.target,
        label: e.label,
        type: 'smoothstep',
      })),
    [graph.edges],
  );

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  return (
    <div className="h-[600px] w-full rounded-xl border border-border bg-surface">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        fitView
        proOptions={{ hideAttribution: true }}
      >
        <Background color="#374151" gap={16} />
        <Controls />
        <MiniMap nodeStrokeWidth={3} style={{ backgroundColor: '#1F2937' }} />
      </ReactFlow>
    </div>
  );
}
