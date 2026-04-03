import { useState, useEffect, useCallback } from 'react';
import { ReactFlow, Background, Controls, type Node, type Edge } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { WorkflowNode } from '../components/WorkflowNode.js';
import { WorkflowEdge } from '../components/WorkflowEdge.js';
import { fetchWorkflows, fetchAgents } from '../lib/api.js';

const nodeTypes = { workflow: WorkflowNode };
const edgeTypes = { animated: WorkflowEdge };

export function Workflows() {
  const [workflows, setWorkflows] = useState<any[]>([]);
  const [agents, setAgents] = useState<any[]>([]);
  const [activeWorkflow, setActiveWorkflow] = useState(0);

  useEffect(() => {
    fetchWorkflows().then(setWorkflows).catch(() => {});
    fetchAgents().then(setAgents).catch(() => {});
  }, []);

  const getAgentStatus = useCallback(
    (name: string) => agents.find((a: any) => a.card?.name === name)?.status ?? 'unknown',
    [agents],
  );

  const workflow = workflows[activeWorkflow];
  if (!workflow) {
    return (<div><h1 className="text-2xl font-bold mb-6">Workflow Visualizer</h1>
      <div className="text-zinc-500">No workflows defined. Add workflows to agentbridge.yaml.</div></div>);
  }

  const steps = workflow.steps ?? [];
  const nodes: Node[] = steps.map((step: any, i: number) => ({
    id: step.agent, type: 'workflow', position: { x: i * 250, y: 100 },
    data: { label: step.agent, status: getAgentStatus(step.agent),
      capabilities: agents.find((a: any) => a.card?.name === step.agent)?.card?.capabilities ?? [] },
  }));
  const edges: Edge[] = steps.slice(1).map((step: any, i: number) => ({
    id: `${steps[i].agent}-${step.agent}`, source: steps[i].agent, target: step.agent, type: 'animated', animated: true,
  }));

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-4 mb-4">
        <h1 className="text-2xl font-bold">Workflow Visualizer</h1>
        {workflows.length > 1 && <div className="flex gap-1">
          {workflows.map((w: any, i: number) => (
            <button key={i} onClick={() => setActiveWorkflow(i)}
              className={`px-3 py-1 text-sm rounded-lg ${i === activeWorkflow ? 'bg-indigo-500/20 text-indigo-300' : 'text-zinc-500 hover:text-white'}`}>
              {w.name ?? `Workflow ${i + 1}`}
            </button>
          ))}
        </div>}
      </div>
      <div className="flex-1 rounded-xl overflow-hidden border border-white/10">
        <ReactFlow nodes={nodes} edges={edges} nodeTypes={nodeTypes} edgeTypes={edgeTypes} fitView className="bg-slate-950">
          <Background color="#333" gap={20} />
          <Controls className="!bg-zinc-800 !border-zinc-700 !text-white" />
        </ReactFlow>
      </div>
    </div>
  );
}
