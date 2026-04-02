import { Outlet, NavLink } from 'react-router-dom';
import { LayoutGrid, MessageSquare, GitBranch, Activity } from 'lucide-react';
import { glass } from '../lib/theme.js';

const navItems = [
  { to: '/registry', icon: LayoutGrid, label: 'Registry' },
  { to: '/messages', icon: MessageSquare, label: 'Messages' },
  { to: '/workflows', icon: GitBranch, label: 'Workflows' },
  { to: '/health', icon: Activity, label: 'Health' },
];

export function Layout() {
  return (
    <div className="flex h-screen">
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
      </nav>
      <main className="flex-1 overflow-auto p-6"><Outlet /></main>
    </div>
  );
}
