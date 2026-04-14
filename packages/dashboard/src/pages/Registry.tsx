import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, Play, Loader } from 'lucide-react';
import { useAgents } from '../hooks/useAgents.js';
import { AgentCard } from '../components/AgentCard.js';
import { OfflineState } from '../components/OfflineState.js';
import { invokeAgent } from '../lib/api.js';
import { glass } from '../lib/theme.js';

export function Registry() {
  const { agents, loading, error } = useAgents();
  const [search, setSearch] = useState('');
  const [selectedAgent, setSelectedAgent] = useState<any>(null);
  const [invokeInput, setInvokeInput] = useState('');
  const [invokeResult, setInvokeResult] = useState<{ output?: string; error?: string; responseMs?: number } | null>(null);
  const [invokeLoading, setInvokeLoading] = useState(false);

  const filtered = agents.filter((a: any) =>
    a.card.name.toLowerCase().includes(search.toLowerCase()) ||
    a.card.capabilities.some((c: string) => c.toLowerCase().includes(search.toLowerCase()))
  );

  function handleSelectAgent(a: any) {
    setSelectedAgent(a);
    setInvokeInput('');
    setInvokeResult(null);
  }

  async function handleInvoke() {
    if (!invokeInput.trim() || !selectedAgent || invokeLoading) return;
    setInvokeLoading(true);
    setInvokeResult(null);
    try {
      const result = await invokeAgent(selectedAgent.card.name, invokeInput);
      setInvokeResult(result);
    } catch (err) {
      setInvokeResult({ error: String(err) });
    }
    setInvokeLoading(false);
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Agent Registry</h1>
      <div className={`${glass} flex items-center gap-3 px-4 py-2.5 mb-6 max-w-md`}>
        <Search size={16} className="text-zinc-500" />
        <input type="text" placeholder="Search agents or capabilities..." value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="bg-transparent outline-none text-sm text-white placeholder-zinc-500 flex-1" />
      </div>

      {error ? (
        <OfflineState />
      ) : loading ? (
        <div className="text-zinc-500">Loading agents...</div>
      ) : filtered.length === 0 ? (
        <div className="text-zinc-500">No agents registered. Run <code className="font-mono bg-white/5 px-1 rounded">npx agentbridge up</code> to start.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <AnimatePresence>
            {filtered.map((a: any) => (
              <AgentCard key={a.card.name} name={a.card.name} description={a.card.description}
                status={a.status} capabilities={a.card.capabilities} url={a.card.url}
                totalTasks={a.metrics.totalTasks} onClick={() => handleSelectAgent(a)} />
            ))}
          </AnimatePresence>
        </div>
      )}

      <AnimatePresence>
        {selectedAgent && (
          <motion.div initial={{ x: 400, opacity: 0 }} animate={{ x: 0, opacity: 1 }}
            exit={{ x: 400, opacity: 0 }} transition={{ type: 'spring', damping: 25 }}
            className={`fixed top-0 right-0 h-full w-[420px] ${glass} rounded-none border-l border-white/10 p-6 overflow-auto z-50`}>
            <button onClick={() => setSelectedAgent(null)} className="absolute top-4 right-4 text-zinc-500 hover:text-white"><X size={20} /></button>
            <h2 className="text-lg font-bold mb-1">{selectedAgent.card.name}</h2>
            <p className="text-sm text-zinc-400 mb-4">{selectedAgent.card.description}</p>

            {/* Test Agent */}
            <div className="mb-5">
              <div className="text-zinc-500 text-xs mb-2">Test Agent</div>
              <textarea
                value={invokeInput}
                onChange={(e) => setInvokeInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleInvoke(); }}
                placeholder="Type your input here... (Ctrl+Enter to run)"
                rows={3}
                className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 outline-none resize-none focus:border-indigo-500/50 transition-colors"
              />
              <button
                onClick={handleInvoke}
                disabled={!invokeInput.trim() || invokeLoading}
                className="mt-2 w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 text-sm hover:bg-indigo-500/30 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {invokeLoading ? <Loader size={14} className="animate-spin" /> : <Play size={14} />}
                {invokeLoading ? 'Running...' : 'Run Agent'}
              </button>
              {invokeResult && (
                <div className="mt-3">
                  <div className="flex items-center justify-between mb-1">
                    <div className={`text-xs font-medium ${invokeResult.error ? 'text-red-400' : 'text-green-400'}`}>
                      {invokeResult.error ? 'Error' : 'Output'}
                    </div>
                    {invokeResult.responseMs && (
                      <div className="text-xs text-zinc-600">{invokeResult.responseMs}ms</div>
                    )}
                  </div>
                  <pre className="font-mono text-xs text-zinc-300 bg-black/30 rounded-lg p-3 overflow-auto whitespace-pre-wrap max-h-48">
                    {invokeResult.error ?? invokeResult.output ?? 'No output'}
                  </pre>
                </div>
              )}
            </div>

            <div className="border-t border-white/5 pt-4 space-y-4 text-sm">
              <div><div className="text-zinc-500 text-xs mb-1">URL</div><div className="font-mono text-zinc-300 break-all">{selectedAgent.card.url}</div></div>
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
