import { Handle, Position, type NodeProps } from '@xyflow/react';
import { StatusDot } from './StatusDot.js';

export function WorkflowNode({ data }: NodeProps) {
  const { label, status, capabilities } = data as { label: string; status: 'healthy' | 'unhealthy' | 'unknown' | 'working'; capabilities: string[] };
  const isActive = status === 'working';
  return (
    <div className={`px-4 py-3 rounded-xl bg-white/5 backdrop-blur-md border border-white/10 min-w-[160px] ${isActive ? 'shadow-lg shadow-indigo-500/30 border-indigo-500/50' : ''}`}>
      <Handle type="target" position={Position.Left} className="!bg-indigo-400 !w-2 !h-2" />
      <div className="flex items-center gap-2 mb-1">
        <StatusDot status={status ?? 'unknown'} />
        <span className="font-semibold text-sm text-white">{label}</span>
      </div>
      <div className="flex flex-wrap gap-1">
        {(capabilities ?? []).slice(0, 3).map((c: string) => (
          <span key={c} className="text-[10px] px-1.5 py-0.5 rounded-full bg-indigo-500/15 text-indigo-300">{c}</span>
        ))}
      </div>
      <Handle type="source" position={Position.Right} className="!bg-indigo-400 !w-2 !h-2" />
    </div>
  );
}
