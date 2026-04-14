import { useState, useEffect, useCallback } from 'react';
import {
  ReactFlow, Background, Controls,
  applyNodeChanges, applyEdgeChanges,
  type Node, type Edge, type NodeChange, type EdgeChange,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { LayoutGrid } from 'lucide-react';
import { WorkflowNode } from '../components/WorkflowNode.js';
import { WorkflowEdge } from '../components/WorkflowEdge.js';
import { OfflineState } from '../components/OfflineState.js';
import { fetchWorkflows, fetchAgents } from '../lib/api.js';

const nodeTypes = { workflow: WorkflowNode };
const edgeTypes = { animated: WorkflowEdge };

export function Workflows() {
  const [workflows, setWorkflows] = useState<any[]>([]);
  const [agents, setAgents] = useState<any[]>([]);
  const [activeWorkflow, setActiveWorkflow] = useState(0);
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    const load = () => {
      Promise.all([
        fetchWorkflows().then(setWorkflows),
        fetchAgents().then(setAgents),
      ])
        .then(() => setOffline(false))
        .catch(() => setOffline(true));
    };
    load();
    const interval = setInterval(load, 5000);
    return () => clearInterval(interval);
  }, []);

  const buildLayout = useCallback((wf: any, agentList: any[]) => {
    const steps = wf?.steps ?? [];
    setNodes(steps.map((step: any, i: number) => ({
      id: step.agent,
      type: 'workflow',
      position: { x: i * 280 + 60, y: 180 },
      data: {
        label: step.agent,
        status: agentList.find((a: any) => a.card?.name === step.agent)?.status ?? 'unknown',
        capabilities: agentList.find((a: any) => a.card?.name === step.agent)?.card?.capabilities ?? [],
      },
    })));
    setEdges(steps.slice(1).map((step: any, i: number) => ({
      id: `${steps[i].agent}-${step.agent}`,
      source: steps[i].agent,
      target: step.agent,
      type: 'animated',
      animated: true,
    })));
  }, []);

  // rebuild layout when active workflow or agents change
  useEffect(() => {
    buildLayout(workflows[activeWorkflow], agents);
  }, [activeWorkflow, workflows, agents, buildLayout]);

  // update node status live without resetting positions
  useEffect(() => {
    setNodes((nds) =>
      nds.map((n) => ({
        ...n,
        data: {
          ...n.data,
          status: agents.find((a: any) => a.card?.name === n.id)?.status ?? 'unknown',
          capabilities: agents.find((a: any) => a.card?.name === n.id)?.card?.capabilities ?? n.data.capabilities,
        },
      })),
    );
  }, [agents]);

  const onNodesChange = useCallback(
    (changes: NodeChange[]) => setNodes((nds) => applyNodeChanges(changes, nds)),
    [],
  );
  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => setEdges((eds) => applyEdgeChanges(changes, eds)),
    [],
  );

  const workflow = workflows[activeWorkflow];

  if (offline) {
    return (
      <div>
        <h1 className="text-2xl font-bold mb-6">Workflow Visualizer</h1>
        <OfflineState />
      </div>
    );
  }

  if (!workflow) {
    return (
      <div>
        <h1 className="text-2xl font-bold mb-6">Workflow Visualizer</h1>
        <div className="text-zinc-500">No workflows defined. Add a <code className="font-mono bg-white/5 px-1 rounded">workflows:</code> section to agentbridge.yaml.</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-4 mb-4">
        <h1 className="text-2xl font-bold">Workflow Visualizer</h1>
        {workflows.length > 1 && (
          <div className="flex gap-1">
            {workflows.map((w: any, i: number) => (
              <button key={i} onClick={() => setActiveWorkflow(i)}
                className={`px-3 py-1 text-sm rounded-lg ${i === activeWorkflow ? 'bg-indigo-500/20 text-indigo-300' : 'text-zinc-500 hover:text-white'}`}>
                {w.name ?? `Workflow ${i + 1}`}
              </button>
            ))}
          </div>
        )}
        <button
          onClick={() => buildLayout(workflow, agents)}
          className="ml-auto flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-sm text-zinc-400 hover:text-white transition-colors"
        >
          <LayoutGrid size={14} />
          Auto-arrange
        </button>
      </div>
      <div className="flex-1 rounded-xl overflow-hidden border border-white/10">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          fitView
          fitViewOptions={{ padding: 0.3 }}
          className="bg-slate-950"
        >
          <Background color="#333" gap={20} />
          <Controls className="!bg-zinc-800 !border-zinc-700 !text-white" />
        </ReactFlow>
      </div>
    </div>
  );
}
