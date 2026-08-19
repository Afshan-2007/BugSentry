import type { BugStatus, Severity, Priority } from '@/lib/supabase';

export const statusStyles: Record<BugStatus, string> = {
  open: 'bg-blue-100 text-blue-700 border-blue-200',
  in_progress: 'bg-amber-100 text-amber-700 border-amber-200',
  resolved: 'bg-emerald-100 text-emerald-700 border-emerald-200',
};

export const severityStyles: Record<Severity, string> = {
  low: 'bg-slate-100 text-slate-700 border-slate-200',
  medium: 'bg-sky-100 text-sky-700 border-sky-200',
  high: 'bg-orange-100 text-orange-700 border-orange-200',
  critical: 'bg-red-100 text-red-700 border-red-200',
};

export const priorityStyles: Record<Priority, string> = {
  low: 'bg-slate-100 text-slate-700 border-slate-200',
  normal: 'bg-sky-100 text-sky-700 border-sky-200',
  high: 'bg-orange-100 text-orange-700 border-orange-200',
  urgent: 'bg-red-100 text-red-700 border-red-200',
};

export const statusLabel: Record<BugStatus, string> = {
  open: 'Open',
  in_progress: 'In Progress',
  resolved: 'Resolved',
};

export const severityLabel: Record<Severity, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  critical: 'Critical',
};

export const priorityLabel: Record<Priority, string> = {
  low: 'Low',
  normal: 'Normal',
  high: 'High',
  urgent: 'Urgent',
};

export const categoryLabel: Record<string, string> = {
  ui: 'UI / Frontend',
  backend: 'Backend',
  database: 'Database',
  network: 'Network',
  security: 'Security',
  performance: 'Performance',
  api: 'API',
  other: 'Other',
};

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
