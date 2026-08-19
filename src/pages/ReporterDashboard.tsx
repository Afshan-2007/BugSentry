import { useEffect, useState, type FormEvent } from 'react';
import { supabase, type Bug, type Profile, type Severity, type Priority, type BugCategory } from '@/lib/supabase';
import { predict } from '@/lib/aiPrediction';
import {
  statusStyles,
  severityStyles,
  priorityStyles,
  statusLabel,
  severityLabel,
  priorityLabel,
  categoryLabel,
  formatDate,
} from '@/lib/ui';
import DashboardShell, { type NavItem } from '@/components/DashboardShell';
import BugDetail from '@/components/BugDetail';
import { useAuth } from '@/context/AuthContext';
import { LayoutDashboard, PlusCircle, FileText, Bell } from 'lucide-react';

const NAV: NavItem[] = [
  { label: 'Dashboard', icon: LayoutDashboard, view: 'dashboard' },
  { label: 'Report Bug', icon: PlusCircle, view: 'report' },
  { label: 'My Bugs', icon: FileText, view: 'bugs' },
  { label: 'Notifications', icon: Bell, view: 'notifications' },
];

const SEVERITIES: Severity[] = ['low', 'medium', 'high', 'critical'];
const PRIORITIES: Priority[] = ['low', 'normal', 'high', 'urgent'];
const CATEGORIES: BugCategory[] = [
  'ui', 'backend', 'database', 'network', 'security', 'performance', 'api', 'other',
];

export default function ReporterDashboard() {
  const { profile } = useAuth();
  const [view, setView] = useState('dashboard');
  const [bugs, setBugs] = useState<Bug[]>([]);
  const [selectedBug, setSelectedBug] = useState<Bug | null>(null);
  const [reporterMap, setReporterMap] = useState<Record<string, Profile>>({});
  const [assigneeMap, setAssigneeMap] = useState<Record<string, Profile>>({});
  const [notifications, setNotifications] = useState<
    { id: string; message: string; is_read: boolean; created_at: string; bug_id: string | null }[]
  >([]);

  async function loadBugs() {
    if (!profile) return;
    const { data } = await supabase
      .from('bugs')
      .select('*')
      .eq('reporter_id', profile.id)
      .order('created_at', { ascending: false });
    const list = (data as Bug[]) ?? [];
    setBugs(list);
    const ids = new Set<string>();
    list.forEach((b) => {
      ids.add(b.reporter_id);
      if (b.assignee_id) ids.add(b.assignee_id);
    });
    if (ids.size > 0) {
      const { data: profs } = await supabase
        .from('profiles')
        .select('*')
        .in('id', Array.from(ids));
      const map: Record<string, Profile> = {};
      (profs as Profile[])?.forEach((p) => (map[p.id] = p));
      setReporterMap(map);
      setAssigneeMap(map);
    }
  }

  async function loadNotifications() {
    if (!profile) return;
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', profile.id)
      .order('created_at', { ascending: false });
    setNotifications((data as typeof notifications) ?? []);
  }

  useEffect(() => {
    loadBugs();
    loadNotifications();
  }, [profile]);

  // Realtime for notifications
  useEffect(() => {
    if (!profile) return;
    const profileId = profile.id;
    const ch = supabase
      .channel('reporter-notifs')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${profileId}` },
        () => loadNotifications()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [profile]);

  const stats = {
    total: bugs.length,
    open: bugs.filter((b) => b.status === 'open').length,
    inProgress: bugs.filter((b) => b.status === 'in_progress').length,
    resolved: bugs.filter((b) => b.status === 'resolved').length,
  };

  if (selectedBug) {
    return (
      <DashboardShell
        navItems={NAV}
        currentView={view}
        onNavigate={(v) => {
          setSelectedBug(null);
          setView(v);
        }}
        roleLabel="Reporter"
      >
        <BugDetail
          bug={selectedBug}
          reporter={reporterMap[selectedBug.reporter_id]}
          assignee={selectedBug.assignee_id ? assigneeMap[selectedBug.assignee_id] : null}
          onBack={() => setSelectedBug(null)}
          developers={[]}
        />
      </DashboardShell>
    );
  }

  return (
    <DashboardShell
      navItems={NAV}
      currentView={view}
      onNavigate={setView}
      roleLabel="Reporter"
    >
      {view === 'dashboard' && (
        <div>
          <h1 className="text-2xl font-bold text-slate-900 mb-1">
            Welcome, {profile?.full_name || 'Reporter'}
          </h1>
          <p className="text-slate-500 text-sm mb-6">
            Track your reported bugs and their status.
          </p>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <StatCard label="Total Bugs" value={stats.total} color="slate" />
            <StatCard label="Open" value={stats.open} color="blue" />
            <StatCard label="In Progress" value={stats.inProgress} color="amber" />
            <StatCard label="Resolved" value={stats.resolved} color="emerald" />
          </div>
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm">
            <div className="px-5 py-4 border-b border-slate-100">
              <h2 className="font-semibold text-slate-900">Recent Bugs</h2>
            </div>
            <BugList
              bugs={bugs.slice(0, 5)}
              reporterMap={reporterMap}
              assigneeMap={assigneeMap}
              onSelect={(b) => setSelectedBug(b)}
            />
          </div>
        </div>
      )}

      {view === 'report' && (
        <ReportBugForm
          onSubmitted={() => {
            loadBugs();
            setView('bugs');
          }}
        />
      )}

      {view === 'bugs' && (
        <div>
          <h1 className="text-xl font-bold text-slate-900 mb-4">My Reported Bugs</h1>
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm">
            <BugList
              bugs={bugs}
              reporterMap={reporterMap}
              assigneeMap={assigneeMap}
              onSelect={(b) => setSelectedBug(b)}
            />
          </div>
        </div>
      )}

      {view === 'notifications' && (
        <div>
          <h1 className="text-xl font-bold text-slate-900 mb-4">Notifications</h1>
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm divide-y divide-slate-50">
            {notifications.length === 0 ? (
              <div className="px-5 py-12 text-center text-sm text-slate-400">
                No notifications yet.
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  className={`px-5 py-4 ${n.is_read ? 'text-slate-500' : 'text-slate-800 font-medium'}`}
                >
                  {n.message}
                  <div className="text-xs text-slate-400 mt-1">
                    {formatDate(n.created_at)}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </DashboardShell>
  );
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  const colors: Record<string, string> = {
    slate: 'from-slate-500 to-slate-600',
    blue: 'from-blue-500 to-sky-500',
    amber: 'from-amber-500 to-orange-500',
    emerald: 'from-emerald-500 to-teal-500',
  };
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
      <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${colors[color]} mb-3`} />
      <div className="text-2xl font-bold text-slate-900">{value}</div>
      <div className="text-sm text-slate-500">{label}</div>
    </div>
  );
}

function BugList({
  bugs,
  reporterMap,
  assigneeMap,
  onSelect,
}: {
  bugs: Bug[];
  reporterMap: Record<string, Profile>;
  assigneeMap: Record<string, Profile>;
  onSelect: (b: Bug) => void;
}) {
  if (bugs.length === 0) {
    return (
      <div className="px-5 py-12 text-center text-sm text-slate-400">
        No bugs reported yet.
      </div>
    );
  }
  return (
    <div className="divide-y divide-slate-50">
      {bugs.map((b) => (
        <button
          key={b.id}
          onClick={() => onSelect(b)}
          className="w-full text-left px-5 py-4 hover:bg-slate-50 transition flex flex-wrap items-center justify-between gap-3"
        >
          <div className="min-w-0 flex-1">
            <div className="font-medium text-slate-900 truncate">{b.title}</div>
            <div className="text-xs text-slate-500 mt-0.5">
              {categoryLabel[b.category]} · {formatDate(b.created_at)}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className={`px-2 py-0.5 rounded-md text-xs border ${severityStyles[b.severity]}`}>
              {severityLabel[b.severity]}
            </span>
            <span className={`px-2 py-0.5 rounded-md text-xs border ${priorityStyles[b.priority]}`}>
              {priorityLabel[b.priority]}
            </span>
            <span className={`px-2.5 py-0.5 rounded-md text-xs border ${statusStyles[b.status]}`}>
              {statusLabel[b.status]}
            </span>
          </div>
        </button>
      ))}
    </div>
  );
}

function ReportBugForm({ onSubmitted }: { onSubmitted: () => void }) {
  const { profile } = useAuth();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [severity, setSeverity] = useState<Severity>('medium');
  const [priority, setPriority] = useState<Priority>('normal');
  const [category, setCategory] = useState<BugCategory>('ui');
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!profile) return;
    setSubmitting(true);
    setError(null);

    const { data: bug, error: bugError } = await supabase
      .from('bugs')
      .insert({
        title,
        description,
        severity,
        priority,
        category,
        reporter_id: profile.id,
      })
      .select()
      .single();

    if (bugError || !bug) {
      setError(bugError?.message ?? 'Failed to create bug.');
      setSubmitting(false);
      return;
    }

    // Generate AI prediction
    const prediction = predict({ title, description, category, severity, priority });
    await supabase.from('ai_predictions').insert({
      bug_id: bug.id,
      predicted_category: prediction.predicted_category,
      probable_root_cause: prediction.probable_root_cause,
      confidence_score: prediction.confidence_score,
      model_version: prediction.model_version,
    });

    // Upload attachment if provided
    if (file) {
      const filePath = `${profile.id}/${bug.id}/${Date.now()}-${file.name}`;
      const { error: upErr } = await supabase.storage
        .from('bug-attachments')
        .upload(filePath, file);
      if (!upErr) {
        await supabase.from('attachments').insert({
          bug_id: bug.id,
          file_name: file.name,
          file_path: filePath,
          file_size: file.size,
          file_type: file.type,
          uploaded_by: profile.id,
        });
      }
    }

    setSubmitting(false);
    onSubmitted();
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-xl font-bold text-slate-900 mb-4">Report a New Bug</h1>
      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-5"
      >
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Title</label>
          <input
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
            placeholder="Brief summary of the bug"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Description</label>
          <textarea
            required
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={5}
            className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 resize-none"
            placeholder="Detailed description of the bug, steps to reproduce, expected vs actual behavior..."
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Severity</label>
            <select
              value={severity}
              onChange={(e) => setSeverity(e.target.value as Severity)}
              className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
            >
              {SEVERITIES.map((s) => (
                <option key={s} value={s}>{severityLabel[s]}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Priority</label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as Priority)}
              className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
            >
              {PRIORITIES.map((p) => (
                <option key={p} value={p}>{priorityLabel[p]}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as BugCategory)}
              className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{categoryLabel[c]}</option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Attachment</label>
          <input
            type="file"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="w-full text-sm text-slate-500 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200 transition"
          />
        </div>
        {error && (
          <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            {error}
          </div>
        )}
        <button
          type="submit"
          disabled={submitting}
          className="px-5 py-2.5 bg-sky-600 text-white text-sm font-medium rounded-xl hover:bg-sky-700 transition disabled:opacity-60"
        >
          {submitting ? 'Submitting...' : 'Submit Bug Report'}
        </button>
      </form>
    </div>
  );
}
