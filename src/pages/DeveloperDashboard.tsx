import { useEffect, useState } from 'react';
import { supabase, type Bug, type Profile } from '@/lib/supabase';
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
import { LayoutDashboard, FileText, Bell } from 'lucide-react';

const NAV: NavItem[] = [
  { label: 'Dashboard', icon: LayoutDashboard, view: 'dashboard' },
  { label: 'Assigned Bugs', icon: FileText, view: 'bugs' },
  { label: 'Notifications', icon: Bell, view: 'notifications' },
];

export default function DeveloperDashboard() {
  const { profile } = useAuth();
  const [view, setView] = useState('dashboard');
  const [bugs, setBugs] = useState<Bug[]>([]);
  const [selectedBug, setSelectedBug] = useState<Bug | null>(null);
  const [reporterMap, setReporterMap] = useState<Record<string, Profile>>({});
  const [notifications, setNotifications] = useState<
    { id: string; message: string; is_read: boolean; created_at: string; bug_id: string | null }[]
  >([]);

  async function loadBugs() {
    if (!profile) return;
    const { data } = await supabase
      .from('bugs')
      .select('*')
      .eq('assignee_id', profile.id)
      .order('created_at', { ascending: false });
    const list = (data as Bug[]) ?? [];
    setBugs(list);
    const ids = Array.from(new Set(list.map((b) => b.reporter_id)));
    if (ids.length > 0) {
      const { data: profs } = await supabase
        .from('profiles')
        .select('*')
        .in('id', ids);
      const map: Record<string, Profile> = {};
      (profs as Profile[])?.forEach((p) => (map[p.id] = p));
      setReporterMap(map);
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

  useEffect(() => {
    if (!profile) return;
    const profileId = profile.id;
    const ch = supabase
      .channel('dev-notifs')
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
        roleLabel="Developer"
      >
        <BugDetail
          bug={selectedBug}
          reporter={reporterMap[selectedBug.reporter_id]}
          assignee={profile}
          onBack={() => {
            setSelectedBug(null);
            loadBugs();
          }}
          showDeveloperControls
          developers={[]}
          onBugUpdated={loadBugs}
        />
      </DashboardShell>
    );
  }

  return (
    <DashboardShell
      navItems={NAV}
      currentView={view}
      onNavigate={setView}
      roleLabel="Developer"
    >
      {view === 'dashboard' && (
        <div>
          <h1 className="text-2xl font-bold text-slate-900 mb-1">
            Welcome, {profile?.full_name || 'Developer'}
          </h1>
          <p className="text-slate-500 text-sm mb-6">
            Bugs assigned to you and their AI predictions.
          </p>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <StatCard label="Assigned" value={stats.total} color="slate" />
            <StatCard label="Open" value={stats.open} color="blue" />
            <StatCard label="In Progress" value={stats.inProgress} color="amber" />
            <StatCard label="Resolved" value={stats.resolved} color="emerald" />
          </div>
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm">
            <div className="px-5 py-4 border-b border-slate-100">
              <h2 className="font-semibold text-slate-900">Assigned Bugs</h2>
            </div>
            <BugList bugs={bugs} reporterMap={reporterMap} onSelect={(b) => setSelectedBug(b)} />
          </div>
        </div>
      )}

      {view === 'bugs' && (
        <div>
          <h1 className="text-xl font-bold text-slate-900 mb-4">My Assigned Bugs</h1>
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm">
            <BugList bugs={bugs} reporterMap={reporterMap} onSelect={(b) => setSelectedBug(b)} />
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
  onSelect,
}: {
  bugs: Bug[];
  reporterMap: Record<string, Profile>;
  onSelect: (b: Bug) => void;
}) {
  if (bugs.length === 0) {
    return (
      <div className="px-5 py-12 text-center text-sm text-slate-400">
        No bugs assigned to you yet.
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
              {categoryLabel[b.category]} · Reported by {reporterMap[b.reporter_id]?.full_name || 'Unknown'} · {formatDate(b.created_at)}
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
