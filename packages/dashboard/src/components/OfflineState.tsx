import { WifiOff } from 'lucide-react';

interface OfflineStateProps {
  message?: string;
}

export function OfflineState({ message = 'Cannot reach registry. Is `agentbridge up` running?' }: OfflineStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <WifiOff size={36} className="text-zinc-600 mb-4" />
      <p className="text-zinc-400 text-sm max-w-xs">{message}</p>
      <code className="mt-3 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs text-indigo-300 font-mono">
        npx agentbridge up
      </code>
    </div>
  );
}
