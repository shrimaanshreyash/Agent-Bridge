interface StatusDotProps { status: 'healthy' | 'unhealthy' | 'unknown' | 'working'; }
const statusColors = { healthy: 'bg-green-400', unhealthy: 'bg-red-400', unknown: 'bg-zinc-500', working: 'bg-yellow-400' };

export function StatusDot({ status }: StatusDotProps) {
  return (
    <span className="relative flex h-2.5 w-2.5">
      {status === 'healthy' && <span className={`animate-ping-slow absolute inline-flex h-full w-full rounded-full ${statusColors[status]} opacity-75`} />}
      <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${statusColors[status]}`} />
    </span>
  );
}
