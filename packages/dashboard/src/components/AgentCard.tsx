import { motion } from 'framer-motion';
import { StatusDot } from './StatusDot.js';
import { glassHover } from '../lib/theme.js';

interface AgentCardProps {
  name: string; description: string; status: 'healthy' | 'unhealthy' | 'unknown';
  capabilities: string[]; url: string; totalTasks: number; onClick?: () => void;
}

export function AgentCard({ name, description, status, capabilities, url, totalTasks, onClick }: AgentCardProps) {
  const port = (() => { try { return new URL(url).port; } catch { return ''; } })();
  return (
    <motion.div layout initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className={`${glassHover} p-5 cursor-pointer`} onClick={onClick}>
      <div className="flex items-center gap-2 mb-2">
        <StatusDot status={status} />
        <h3 className="font-semibold text-white">{name}</h3>
        <span className="ml-auto font-mono text-xs text-zinc-500">:{port}</span>
      </div>
      <p className="text-sm text-zinc-400 mb-3 line-clamp-2">{description}</p>
      <div className="flex flex-wrap gap-1.5 mb-3">
        {capabilities.map((cap) => (
          <span key={cap} className="px-2 py-0.5 text-xs rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">{cap}</span>
        ))}
      </div>
      <div className="text-xs text-zinc-500">{totalTasks} tasks processed</div>
    </motion.div>
  );
}
