export interface ScheduleConfig {
  hours: number[];
}

export function shouldFetchNow(lastFetch: number | null, config: ScheduleConfig): boolean {
  if (lastFetch === null) return true;
  const now = new Date();
  for (const hour of config.hours) {
    const t = new Date();
    t.setHours(hour, 0, 0, 0);
    if (now >= t && lastFetch < t.getTime()) return true;
  }
  return false;
}

export function msUntilNext(config: ScheduleConfig): number {
  const now = new Date();
  const sorted = [...config.hours].sort((a, b) => a - b);
  for (const hour of sorted) {
    const t = new Date();
    t.setHours(hour, 0, 0, 0);
    if (t > now) return t.getTime() - now.getTime();
  }
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(sorted[0], 0, 0, 0);
  return tomorrow.getTime() - now.getTime();
}

export function formatLastUpdated(timestamp: number | null): string {
  if (!timestamp) return 'Nunca atualizado';
  return new Date(timestamp).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
