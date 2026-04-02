import { useEffect, useState } from 'react';
import { useSpring, useTransform } from 'framer-motion';

interface NumberTickerProps { value: number; label: string; }

export function NumberTicker({ value, label }: NumberTickerProps) {
  const spring = useSpring(0, { stiffness: 100, damping: 30 });
  const display = useTransform(spring, (v) => Math.round(v));
  const [displayVal, setDisplayVal] = useState(0);

  useEffect(() => {
    spring.set(value);
    return display.on('change', (v) => setDisplayVal(v));
  }, [value, spring, display]);

  return (
    <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-xl p-5">
      <div className="text-3xl font-bold text-white font-mono">{displayVal}</div>
      <div className="text-sm text-zinc-400 mt-1">{label}</div>
    </div>
  );
}
