import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X } from 'lucide-react';
import { useAgents } from '../hooks/useAgents.js';
import { AgentCard } from '../components/AgentCard.js';
import { glass } from '../lib/theme.js';

export function Registry() {
  const { agents, loading } = useAgents();
  const [search, setSearch] = useState('');
  const [selectedAgent, setSelectedAgent] = useState<any>(null);

  const filtered = agents.filter((a: any) =>
    a.card.name.includes(search.toLowerCase()) ||
    a.card.capabilities.some((c: string) => c.includes(search.toLowerCase()))
  );

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Agent Registry</h1>
      <div className={`${glass} flex items-center gap-3 px-4 py-2.5 mb-6 max-w-md`}>
        <Search size={16} className="text-zinc-500" />
        <input type="text" placeholder="Search agents or capabilities..." value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="bg-transparent outline-none text-sm text-white placeholder-zinc-500 flex-1" />
      </div>

      {loading ? (
        <div className="text-zinc-500">Loading agents...</div>
      ) : filtered.length === 0 ? (
        <div className="text-zinc-500">No agents registered. Run `npx agentbridge up` to start.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <AnimatePresence>
            {filtered.map((a: any) => (
              <AgentCard key={a.card.name} name={a.card.name} description={a.card.description}
                status={a.status} capabilities={a.card.capabilities} url={a.card.url}
                totalTasks={a.metrics.totalTasks} onClick={() => setSelectedAgent(a)} />
            ))}
          </AnimatePresence>
        </div>
      )}

      <AnimatePresence>
        {selectedAgent && (
          <motion.div initial={{ x: 400, opacity: 0 }} animate={{ x: 0, opacity: 1 }}
            exit={{ x: 400, opacity: 0 }} transition={{ type: 'spring', damping: 25 }}
            className={`fixed top-0 right-0 h-full w-96 ${glass} rounded-none border-l border-white/10 p-6 overflow-auto z-50`}>
            <button onClick={() => setSelectedAgent(null)} className="absolute top-4 right-4 text-zinc-500 hover:text-white"><X size={20} /></button>
            <h2 className="text-lg font-bold mb-4">{selectedAgent.card.name}</h2>
            <p className="text-sm text-zinc-400 mb-4">{selectedAgent.card.description}</p>
            <div className="space-y-4 text-sm">
              <div><div className="text-zinc-500 text-xs mb-1">URL</div><div className="font-mono text-zinc-300">{selectedAgent.card.url}</div></div>
              <div><div className="text-zinc-500 text-xs mb-1">Version</div><div className="text-zinc-300">{selectedAgent.card.version}</div></div>
              <div><div className="text-zinc-500 text-xs mb-1">Skills</div>
                <pre className="font-mono text-xs text-zinc-400 bg-black/20 rounded p-3 overflow-auto">{JSON.stringify(selectedAgent.card.skills, null, 2)}</pre></div>
              <div><div className="text-zinc-500 text-xs mb-1">Metrics</div>
                <pre className="font-mono text-xs text-zinc-400 bg-black/20 rounded p-3 overflow-auto">{JSON.stringify(selectedAgent.metrics, null, 2)}</pre></div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
