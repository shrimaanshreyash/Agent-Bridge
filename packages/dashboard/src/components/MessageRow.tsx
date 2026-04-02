import { motion } from 'framer-motion';

interface MessageRowProps { timestamp: string; type: string; from?: string; to?: string; taskId?: string; latencyMs?: number; }

const statusBadge: Record<string, string> = {
  task_sent: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  task_completed: 'bg-green-500/20 text-green-300 border-green-500/30',
  task_failed: 'bg-red-500/20 text-red-300 border-red-500/30',
  agent_registered: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
  agent_removed: 'bg-zinc-500/20 text-zinc-300 border-zinc-500/30',
};

export function MessageRow({ timestamp, type, from, to, taskId, latencyMs }: MessageRowProps) {
  const badge = statusBadge[type] ?? statusBadge.agent_removed;
  return (
    <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
      className={`flex items-center gap-4 px-4 py-2.5 border-b border-white/5 text-sm ${type === 'task_failed' ? 'bg-red-500/5' : ''}`}>
      <span className="font-mono text-xs text-zinc-500 w-20 shrink-0">{new Date(timestamp).toLocaleTimeString()}</span>
      <span className={`px-2 py-0.5 text-xs rounded-full border ${badge}`}>{type.replace('_', ' ')}</span>
      {from && to && <span className="text-zinc-400"><span className="text-white">{from}</span><span className="mx-2 text-zinc-600">-&gt;</span><span className="text-white">{to}</span></span>}
      {taskId && <span className="font-mono text-xs text-zinc-600">{taskId.slice(0, 8)}</span>}
      {latencyMs != null && <span className="ml-auto font-mono text-xs text-zinc-500">{latencyMs}ms</span>}
    </motion.div>
  );
}
