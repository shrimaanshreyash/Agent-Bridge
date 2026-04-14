import { useState, useEffect } from 'react';
import { Outlet, NavLink } from 'react-router-dom';
import { LayoutGrid, MessageSquare, GitBranch, Activity } from 'lucide-react';
import { glass } from '../lib/theme.js';

const navItems = [
  { to: '/registry', icon: LayoutGrid, label: 'Registry' },
  { to: '/messages', icon: MessageSquare, label: 'Messages' },
  { to: '/workflows', icon: GitBranch, label: 'Workflows' },
  { to: '/health', icon: Activity, label: 'Health' },
];

function useRegistryStatus() {
  const [status, setStatus] = useState<'checking' | 'up' | 'down'>('checking');

  useEffect(() => {
    async function check() {
      try {
        const res = await fetch('/health', { signal: AbortSignal.timeout(3000) });
        setStatus(res.ok ? 'up' : 'down');
      } catch {
        setStatus('down');
      }
    }
    check();
    const interval = setInterval(check, 15_000);
    return () => clearInterval(interval);
  }, []);

  return status;
}

export function Layout() {
  const registryStatus = useRegistryStatus();

  return (
    <div className="flex h-screen bg-zinc-950">
      <nav className={`w-56 ${glass} rounded-none border-r border-white/10 p-4 flex flex-col gap-1`}>
        <div className="text-lg font-bold text-indigo-400 mb-6 px-3">AgentBridge</div>

        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink key={to} to={to} className={({ isActive }) =>
            `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
              isActive ? 'bg-indigo-500/20 text-indigo-300' : 'text-zinc-400 hover:text-white hover:bg-white/5'
            }`}>
            <Icon size={18} />
            {label}
          </NavLink>
        ))}

        {/* Registry status — pinned to bottom of sidebar */}
        <div className="mt-auto pt-4 border-t border-white/5">
          <div className="flex items-center gap-2 px-3 py-2">
            <span className="relative flex h-2 w-2 shrink-0">
              {registryStatus === 'up' && (
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-60" />
              )}
              <span className={`relative inline-flex rounded-full h-2 w-2 ${
                registryStatus === 'up' ? 'bg-green-400'
                  : registryStatus === 'down' ? 'bg-red-400'
                  : 'bg-zinc-500'
              }`} />
            </span>
            <span className={`text-xs ${
              registryStatus === 'up' ? 'text-zinc-400'
                : registryStatus === 'down' ? 'text-red-400'
                : 'text-zinc-600'
            }`}>
              Registry {registryStatus === 'checking' ? '…' : registryStatus}
            </span>
          </div>
        </div>
      </nav>

      <main className="flex-1 overflow-auto p-6">
        <Outlet />
      </main>
    </div>
  );
}
