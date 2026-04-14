import { useState, useRef, useEffect } from 'react';
import { AnimatePresence } from 'framer-motion';
import { Pause, Play } from 'lucide-react';
import { useWebSocket } from '../hooks/useWebSocket.js';
import { MessageRow } from '../components/MessageRow.js';

export function MessageFlow() {
  const { messages, connected } = useWebSocket(`ws://${window.location.host}/ws`);
  const [paused, setPaused] = useState(false);
  const [filter, setFilter] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!paused && scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, paused]);

  const enriched = messages.map((m) => ({
    ...m,
    from: m.from ?? m.name ?? undefined,
    to: m.to ?? (m.type === 'agent_registered' ? 'registry' : m.type === 'task_completed' ? m.name : undefined),
    latencyMs: m.latencyMs ?? m.responseMs ?? undefined,
  }));

  const filtered = enriched.filter((m) => {
    if (!filter) return true;
    return m.type?.includes(filter) || m.from?.includes(filter) || m.to?.includes(filter) || m.taskId?.includes(filter);
  });

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-4 mb-4">
        <h1 className="text-2xl font-bold">Live Message Flow</h1>
        <span className={`text-xs px-2 py-1 rounded-full ${connected ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'}`}>
          {connected ? 'Connected' : 'Disconnected'}
        </span>
        <button onClick={() => setPaused(!paused)}
          className="ml-auto flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-sm text-zinc-400 hover:text-white">
          {paused ? <Play size={14} /> : <Pause size={14} />}
          {paused ? 'Resume' : 'Pause'}
        </button>
      </div>
      <input type="text" placeholder="Filter by agent, type, or task ID..." value={filter}
        onChange={(e) => setFilter(e.target.value)}
        className="bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-sm text-white placeholder-zinc-500 outline-none mb-4" />
      <div ref={scrollRef} className="flex-1 overflow-auto bg-zinc-950 rounded-xl border border-white/5">
        {filtered.length === 0 ? (
          <div className="text-zinc-600 text-center py-12">Waiting for messages...</div>
        ) : (
          <AnimatePresence initial={false}>
            {filtered.map((m, i) => (
              <MessageRow key={m.id ?? i} timestamp={m.timestamp} type={m.type} from={m.from} to={m.to} taskId={m.taskId} latencyMs={m.latencyMs} />
            ))}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
