import { motion } from 'framer-motion';

interface ProgressBarProps { value: number; label?: string; }

export function ProgressBar({ value, label }: ProgressBarProps) {
  const v = Math.min(100, Math.max(0, value));
  const color = v >= 90 ? 'from-green-500 to-green-400' : v >= 70 ? 'from-yellow-500 to-yellow-400' : 'from-red-500 to-red-400';
  return (
    <div>
      {label && <div className="text-xs text-zinc-400 mb-1">{label}</div>}
      <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
        <motion.div className={`h-full rounded-full bg-gradient-to-r ${color}`} initial={{ width: 0 }} animate={{ width: `${v}%` }} transition={{ duration: 0.8, ease: 'easeOut' }} />
      </div>
    </div>
  );
}
