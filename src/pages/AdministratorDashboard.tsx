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
import { LayoutDashboard, Users, FileText, Bell } from 'lucide-react';

const NAV: NavItem[] = [
  { label: 'Dashboard', icon: LayoutDashboard, view: 'dashboard' },
  { label: 'Users', icon: Users, view: 'users' },
  { label: 'All Bugs', icon: FileText, view: 'bugs' },
  { label: 'Notifications', icon: Bell, view: 'notifications' },
];

export default function AdministratorDashboard() {
  const { profile } = useAuth();
  const [view, setView] = useState('dashboard');
  const [bugs, setBugs] = useState<Bug[]>([]);
  const [users, setUsers] = useState<Profile[]>([]);
  const [developers, setDevelopers] = useState<Profile[]>([]);
  const [selectedBug, setSelectedBug] = useState<Bug | null>(null);
  const [userMap, setUserMap] = useState<Record<string, Profile>>({});
  const [notifications, setNotifications] = useState<
    { id: string; message: string; is_read: boolean; created_at: string; bug_id: string | null }[]
  >([]);

  async function loadBugs() {
    const { data } = await supabase
      .from('bugs')
      .select('*')
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
      setUserMap(map);
    }
  }

  async function loadUsers() {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });
    const list = (data as Profile[]) ?? [];
    setUsers(list);
    setDevelopers(list.filter((u) => u.role === 'developer'));
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
    loadUsers();
    loadNotifications();
  }, [profile]);

  const stats = {
    users: users.length,
    bugs: bugs.length,
    open: bugs.filter((b) => b.status === 'open').length,
    unassigned: bugs.filter((b) => !b.assignee_id).length,
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
        roleLabel="Administrator"
      >
        <BugDetail
          bug={selectedBug}
          reporter={userMap[selectedBug.reporter_id]}
          assignee={selectedBug.assignee_id ? userMap[selectedBug.assignee_id] : null}
          onBack={() => setSelectedBug(null)}
          showAdminControls
          developers={developers}
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
      roleLabel="Administrator"
    >
      {view === 'dashboard' && (
        <div>
          <h1 className="text-2xl font-bold text-slate-900 mb-1">
            Welcome, {profile?.full_name || 'Admin'}
          </h1>
          <p className="text-slate-500 text-sm mb-6">
            Manage users, bugs, and developer assignments.
          </p>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <StatCard label="Total Users" value={stats.users} color="slate" />
            <StatCard label="Total Bugs" value={stats.bugs} color="blue" />
            <StatCard label="Open Bugs" value={stats.open} color="amber" />
            <StatCard label="Unassigned" value={stats.unassigned} color="red" />
          </div>
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <h2 className="font-semibold text-slate-900">All Bugs</h2>
              <button
                onClick={() => setView('bugs')}
                className="text-sm text-sky-600 hover:text-sky-700 font-medium"
              >
                View all
              </button>
            </div>
            <BugList bugs={bugs.slice(0, 5)} userMap={userMap} onSelect={(b) => setSelectedBug(b)} />
          </div>
        </div>
      )}

      {view === 'users' && (
        <div>
          <h1 className="text-xl font-bold text-slate-900 mb-4">Users</h1>
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
                <tr>
                  <th className="text-left px-5 py-3 font-medium">Name</th>
                  <th className="text-left px-5 py-3 font-medium">Email</th>
                  <th className="text-left px-5 py-3 font-medium">Role</th>
                  <th className="text-left px-5 py-3 font-medium">Joined</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50 transition">
                    <td className="px-5 py-3 font-medium text-slate-800">
                      {u.full_name || '—'}
                    </td>
                    <td className="px-5 py-3 text-slate-600">{u.email}</td>
                    <td className="px-5 py-3">
                      <span className="px-2 py-0.5 rounded-md text-xs font-medium border bg-slate-100 text-slate-700 border-slate-200 capitalize">
                        {u.role}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-slate-500 text-xs">
                      {formatDate(u.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {view === 'bugs' && (
        <div>
          <h1 className="text-xl font-bold text-slate-900 mb-4">All Bugs</h1>
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm">
            <BugList bugs={bugs} userMap={userMap} onSelect={(b) => setSelectedBug(b)} />
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
    red: 'from-red-500 to-rose-500',
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
  userMap,
  onSelect,
}: {
  bugs: Bug[];
  userMap: Record<string, Profile>;
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
            <span className={`px-2.5 py-0.5 rounded-md text-xs border ${statusStyles[b.status]}`}>
              {statusLabel[b.status]}
            </span>
            <span className="text-xs text-slate-500 hidden sm:inline">
              {b.assignee_id ? (userMap[b.assignee_id]?.full_name || 'Assigned') : 'Unassigned'}
            </span>
          </div>
        </button>
      ))}
    </div>
  );
}
