import { useEffect, useMemo, useState } from 'react';
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
import {
  LayoutDashboard,
  Users,
  FileText,
  Bell,
  Search,
  Filter,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Activity,
  ShieldCheck,
  CircleAlert,
  UserX,
} from 'lucide-react';

const NAV: NavItem[] = [
  {
    label: 'Dashboard',
    icon: LayoutDashboard,
    view: 'dashboard',
  },
  {
    label: 'Users',
    icon: Users,
    view: 'users',
  },
  {
    label: 'All Bugs',
    icon: FileText,
    view: 'bugs',
  },
  {
    label: 'SLA Monitor',
    icon: Clock,
    view: 'sla',
  },
  {
    label: 'Audit Log',
    icon: Activity,
    view: 'audit',
  },
  {
    label: 'Notifications',
    icon: Bell,
    view: 'notifications',
  },
];

type Notification = {
  id: string;
  message: string;
  is_read: boolean;
  created_at: string;
  bug_id: string | null;
};

type BugActivity = {
  id: string;
  bug_id: string;
  user_id: string;
  action: string;
  details: string | null;
  created_at: string;
};

type SLAInfo = {
  deadline: Date | null;
  hoursAllowed: number;
  hoursRemaining: number;
  status: 'completed' | 'breached' | 'due_soon' | 'on_track';
  percentage: number;
};

const SLA_HOURS: Record<string, number> = {
  critical: 4,
  high: 24,
  medium: 72,
  low: 168,
};

export default function AdministratorDashboard() {
  const { profile } = useAuth();

  const [view, setView] = useState('dashboard');

  const [bugs, setBugs] = useState<Bug[]>([]);
  const [users, setUsers] = useState<Profile[]>([]);
  const [developers, setDevelopers] = useState<Profile[]>([]);

  const [selectedBug, setSelectedBug] = useState<Bug | null>(null);

  const [userMap, setUserMap] = useState<Record<string, Profile>>({});

  const [notifications, setNotifications] = useState<
    Notification[]
  >([]);

  const [activities, setActivities] = useState<BugActivity[]>([]);

  const [bugSearch, setBugSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [assignmentFilter, setAssignmentFilter] =
    useState('all');

  const [auditSearch, setAuditSearch] = useState('');

  async function loadBugs() {
    const { data } = await supabase
      .from('bugs')
      .select('*')
      .order('created_at', {
        ascending: false,
      });

    const list = (data as Bug[]) ?? [];

    setBugs(list);

    const ids = new Set<string>();

    list.forEach((bug) => {
      ids.add(bug.reporter_id);

      if (bug.assignee_id) {
        ids.add(bug.assignee_id);
      }
    });

    if (ids.size > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('*')
        .in('id', Array.from(ids));

      const map: Record<string, Profile> = {};

      (profiles as Profile[] | null)?.forEach((user) => {
        map[user.id] = user;
      });

      setUserMap(map);
    }
  }

  async function loadUsers() {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', {
        ascending: false,
      });

    const list = (data as Profile[]) ?? [];

    setUsers(list);

    setDevelopers(
      list.filter((user) => user.role === 'developer')
    );

    const map: Record<string, Profile> = {};

    list.forEach((user) => {
      map[user.id] = user;
    });

    setUserMap((previous) => ({
      ...previous,
      ...map,
    }));
  }

  async function loadNotifications() {
    if (!profile) return;

    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', profile.id)
      .order('created_at', {
        ascending: false,
      });

    setNotifications(
      (data as Notification[]) ?? []
    );
  }

  async function loadActivities() {
    const { data, error } = await supabase
      .from('bug_activity')
      .select('*')
      .order('created_at', {
        ascending: false,
      })
      .limit(200);

    if (error) {
      console.error(
        'Failed to load audit activity:',
        error
      );
      return;
    }

    setActivities(
      (data as BugActivity[]) ?? []
    );
  }

  useEffect(() => {
    loadBugs();
    loadUsers();
    loadNotifications();
    loadActivities();
  }, [profile]);

  useEffect(() => {
    if (!profile) return;

    const profileId = profile.id;

    const channel = supabase
      .channel('admin-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${profileId}`,
        },
        () => loadNotifications()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile]);

  const stats = useMemo(
    () => ({
      users: users.length,
      total: bugs.length,
      open: bugs.filter(
        (b) => b.status === 'open'
      ).length,
      inProgress: bugs.filter(
        (b) => b.status === 'in_progress'
      ).length,
      resolved: bugs.filter(
        (b) => b.status === 'resolved'
      ).length,
      closed: bugs.filter(
        (b) => b.status === 'closed'
      ).length,
      critical: bugs.filter(
        (b) => b.severity === 'critical'
      ).length,
      unassigned: bugs.filter(
        (b) => !b.assignee_id
      ).length,
    }),
    [bugs]
  );

  const getSLAInfo = (bug: Bug): SLAInfo => {
    const hoursAllowed =
      SLA_HOURS[bug.severity] ?? 72;

    const createdAt = new Date(bug.created_at);

    const deadline = new Date(
      createdAt.getTime() +
        hoursAllowed * 60 * 60 * 1000
    );

    const now = new Date();

    if (
      bug.status === 'resolved' ||
      bug.status === 'closed'
    ) {
      return {
        deadline,
        hoursAllowed,
        hoursRemaining: 0,
        status: 'completed',
        percentage: 100,
      };
    }

    const millisecondsRemaining =
      deadline.getTime() - now.getTime();

    const hoursRemaining =
      millisecondsRemaining /
      (1000 * 60 * 60);

    const elapsed =
      now.getTime() - createdAt.getTime();

    const total =
      deadline.getTime() -
      createdAt.getTime();

    const percentage = Math.min(
      100,
      Math.max(
        0,
        Math.round((elapsed / total) * 100)
      )
    );

    if (hoursRemaining <= 0) {
      return {
        deadline,
        hoursAllowed,
        hoursRemaining,
        status: 'breached',
        percentage: 100,
      };
    }

    if (
      hoursRemaining <=
      Math.max(4, hoursAllowed * 0.25)
    ) {
      return {
        deadline,
        hoursAllowed,
        hoursRemaining,
        status: 'due_soon',
        percentage,
      };
    }

    return {
      deadline,
      hoursAllowed,
      hoursRemaining,
      status: 'on_track',
      percentage,
    };
  };

  const slaBugs = useMemo(
    () =>
      bugs
        .filter(
          (bug) =>
            bug.status !== 'resolved' &&
            bug.status !== 'closed'
        )
        .map((bug) => ({
          bug,
          sla: getSLAInfo(bug),
        }))
        .sort((a, b) => {
          const order = {
            breached: 0,
            due_soon: 1,
            on_track: 2,
            completed: 3,
          };

          return (
            order[a.sla.status] -
            order[b.sla.status]
          );
        }),
    [bugs]
  );

  const breachedCount = slaBugs.filter(
    (item) => item.sla.status === 'breached'
  ).length;

  const dueSoonCount = slaBugs.filter(
    (item) => item.sla.status === 'due_soon'
  ).length;

  const filteredBugs = useMemo(() => {
    const search =
      bugSearch.trim().toLowerCase();

    return bugs.filter((bug) => {
      const matchesSearch =
        !search ||
        bug.title
          .toLowerCase()
          .includes(search) ||
        bug.description
          .toLowerCase()
          .includes(search);

      const matchesStatus =
        statusFilter === 'all' ||
        bug.status === statusFilter;

      const matchesSeverity =
        severityFilter === 'all' ||
        bug.severity === severityFilter;

      const matchesAssignment =
        assignmentFilter === 'all' ||
        (assignmentFilter === 'unassigned'
          ? !bug.assignee_id
          : bug.assignee_id ===
            assignmentFilter);

      return (
        matchesSearch &&
        matchesStatus &&
        matchesSeverity &&
        matchesAssignment
      );
    });
  }, [
    bugs,
    bugSearch,
    statusFilter,
    severityFilter,
    assignmentFilter,
  ]);

  const attentionBugs = bugs
    .filter(
      (bug) =>
        bug.status !== 'resolved' &&
        bug.status !== 'closed'
    )
    .sort((a, b) => {
      const severityWeight: Record<
        string,
        number
      > = {
        critical: 4,
        high: 3,
        medium: 2,
        low: 1,
      };

      return (
        (severityWeight[b.severity] ?? 0) -
        (severityWeight[a.severity] ?? 0)
      );
    })
    .slice(0, 5);

  const developerWorkload =
    developers.map((developer) => {
      const assigned = bugs.filter(
        (bug) =>
          bug.assignee_id === developer.id
      );

      return {
        developer,
        total: assigned.length,
        open: assigned.filter(
          (bug) => bug.status === 'open'
        ).length,
        inProgress: assigned.filter(
          (bug) =>
            bug.status === 'in_progress'
        ).length,
        resolved: assigned.filter(
          (bug) =>
            bug.status === 'resolved'
        ).length,
      };
    });

  const filteredActivities =
    activities.filter((activity) => {
      const search =
        auditSearch.trim().toLowerCase();

      if (!search) return true;

      const bug =
        bugs.find(
          (item) =>
            item.id === activity.bug_id
        );

      const user =
        users.find(
          (item) =>
            item.id === activity.user_id
        );

      return (
        activity.action
          .toLowerCase()
          .includes(search) ||
        activity.details
          ?.toLowerCase()
          .includes(search) ||
        bug?.title
          .toLowerCase()
          .includes(search) ||
        user?.full_name
          ?.toLowerCase()
          .includes(search)
      );
    });

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
          reporter={
            userMap[selectedBug.reporter_id]
          }
          assignee={
            selectedBug.assignee_id
              ? userMap[
                  selectedBug.assignee_id
                ]
              : null
          }
          onBack={() =>
            setSelectedBug(null)
          }
          showAdminControls
          developers={developers}
          onBugUpdated={() => {
            loadBugs();
            loadActivities();
          }}
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
      {/* ================================================= */}
      {/* DASHBOARD */}
      {/* ================================================= */}

      {view === 'dashboard' && (
        <div>
          <div className="mb-7">
            <h1 className="text-2xl font-bold text-slate-900">
              Welcome,{' '}
              {profile?.full_name || 'Admin'} 👋
            </h1>

            <p className="text-slate-500 text-sm mt-1">
              Monitor bugs, SLA health, developers,
              and system activity.
            </p>
          </div>

          {/* KPI CARDS */}

          <div className="grid grid-cols-2 xl:grid-cols-6 gap-4 mb-7">
            <StatCard
              label="Total Bugs"
              value={stats.total}
              color="slate"
              icon={FileText}
            />

            <StatCard
              label="Open"
              value={stats.open}
              color="blue"
              icon={CircleAlert}
            />

            <StatCard
              label="In Progress"
              value={stats.inProgress}
              color="amber"
              icon={Clock}
            />

            <StatCard
              label="Resolved"
              value={stats.resolved}
              color="emerald"
              icon={CheckCircle2}
            />

            <StatCard
              label="Critical"
              value={stats.critical}
              color="red"
              icon={AlertTriangle}
            />

            <StatCard
              label="Unassigned"
              value={stats.unassigned}
              color="purple"
              icon={UserX}
            />
          </div>

          {/* SLA ALERT */}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-7">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-red-500" />
                </div>

                <div>
                  <div className="text-2xl font-bold text-slate-900">
                    {breachedCount}
                  </div>

                  <div className="text-sm text-slate-500">
                    SLA Breaches
                  </div>
                </div>
              </div>

              <button
                onClick={() => setView('sla')}
                className="text-xs text-red-600 font-medium mt-4 hover:text-red-700"
              >
                Review SLA breaches →
              </button>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center">
                  <Clock className="w-5 h-5 text-amber-500" />
                </div>

                <div>
                  <div className="text-2xl font-bold text-slate-900">
                    {dueSoonCount}
                  </div>

                  <div className="text-sm text-slate-500">
                    Approaching SLA
                  </div>
                </div>
              </div>

              <button
                onClick={() => setView('sla')}
                className="text-xs text-amber-600 font-medium mt-4 hover:text-amber-700"
              >
                Review upcoming deadlines →
              </button>
            </div>
          </div>

          {/* TOP SECTIONS */}

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-6">
            {/* ATTENTION */}

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm">
              <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h2 className="font-semibold text-slate-900">
                    Work Requiring Attention
                  </h2>

                  <p className="text-xs text-slate-500 mt-1">
                    Highest-priority unresolved bugs
                  </p>
                </div>

                <button
                  onClick={() => setView('bugs')}
                  className="text-xs font-medium text-sky-600"
                >
                  View all
                </button>
              </div>

              {attentionBugs.length === 0 ? (
                <div className="px-5 py-12 text-center">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />

                  <p className="text-sm font-medium text-slate-700">
                    Everything looks good
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-slate-50">
                  {attentionBugs.map((bug) => (
                    <button
                      key={bug.id}
                      onClick={() =>
                        setSelectedBug(bug)
                      }
                      className="w-full text-left px-5 py-4 hover:bg-slate-50 transition"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <div className="font-medium text-sm text-slate-900 truncate">
                            {bug.title}
                          </div>

                          <div className="text-xs text-slate-500 mt-1">
                            {categoryLabel[
                              bug.category
                            ]}{' '}
                            ·{' '}
                            {bug.assignee_id
                              ? userMap[
                                  bug.assignee_id
                                ]?.full_name ||
                                'Assigned'
                              : 'Unassigned'}
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2 py-0.5 rounded-md text-xs border ${severityStyles[bug.severity]}`}
                          >
                            {severityLabel[
                              bug.severity
                            ]}
                          </span>

                          <span
                            className={`px-2 py-0.5 rounded-md text-xs border ${statusStyles[bug.status]}`}
                          >
                            {statusLabel[
                              bug.status
                            ]}
                          </span>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* STATUS */}

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm">
              <div className="px-5 py-4 border-b border-slate-100">
                <h2 className="font-semibold text-slate-900">
                  Bug Status Overview
                </h2>

                <p className="text-xs text-slate-500 mt-1">
                  Current distribution
                </p>
              </div>

              <div className="p-5 space-y-5">
                <StatusBar
                  label="Open"
                  value={stats.open}
                  total={stats.total}
                  className="bg-blue-500"
                />

                <StatusBar
                  label="In Progress"
                  value={stats.inProgress}
                  total={stats.total}
                  className="bg-amber-500"
                />

                <StatusBar
                  label="Resolved"
                  value={stats.resolved}
                  total={stats.total}
                  className="bg-emerald-500"
                />

                <StatusBar
                  label="Closed"
                  value={stats.closed}
                  total={stats.total}
                  className="bg-slate-500"
                />
              </div>
            </div>
          </div>

          {/* DEVELOPER WORKLOAD */}

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm mb-6">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
              <Activity className="w-4 h-4 text-sky-500" />

              <div>
                <h2 className="font-semibold text-slate-900">
                  Developer Workload
                </h2>

                <p className="text-xs text-slate-500 mt-1">
                  Current assignment distribution
                </p>
              </div>
            </div>

            {developerWorkload.length === 0 ? (
              <div className="px-5 py-10 text-center text-sm text-slate-400">
                No developers available.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
                    <tr>
                      <th className="text-left px-5 py-3">
                        Developer
                      </th>

                      <th className="text-center px-4 py-3">
                        Assigned
                      </th>

                      <th className="text-center px-4 py-3">
                        Open
                      </th>

                      <th className="text-center px-4 py-3">
                        In Progress
                      </th>

                      <th className="text-center px-4 py-3">
                        Resolved
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-50">
                    {developerWorkload.map(
                      (item) => (
                        <tr
                          key={
                            item.developer.id
                          }
                          className="hover:bg-slate-50"
                        >
                          <td className="px-5 py-4">
                            <div className="font-medium text-slate-800">
                              {
                                item.developer
                                  .full_name
                              }
                            </div>

                            <div className="text-xs text-slate-400">
                              {
                                item.developer
                                  .email
                              }
                            </div>
                          </td>

                          <td className="text-center font-semibold">
                            {item.total}
                          </td>

                          <td className="text-center text-blue-600">
                            {item.open}
                          </td>

                          <td className="text-center text-amber-600">
                            {item.inProgress}
                          </td>

                          <td className="text-center text-emerald-600">
                            {item.resolved}
                          </td>
                        </tr>
                      )
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* RECENT BUGS */}

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h2 className="font-semibold text-slate-900">
                  Recent Bugs
                </h2>

                <p className="text-xs text-slate-500 mt-1">
                  Latest system activity
                </p>
              </div>

              <button
                onClick={() => setView('bugs')}
                className="text-sm text-sky-600 font-medium"
              >
                View all
              </button>
            </div>

            <BugList
              bugs={bugs.slice(0, 5)}
              userMap={userMap}
              onSelect={setSelectedBug}
            />
          </div>
        </div>
      )}

      {/* ================================================= */}
      {/* USERS */}
      {/* ================================================= */}

      {view === 'users' && (
        <div>
          <div className="mb-5">
            <h1 className="text-xl font-bold text-slate-900">
              Users
            </h1>

            <p className="text-sm text-slate-500 mt-1">
              Registered users and system roles.
            </p>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
                <tr>
                  <th className="text-left px-5 py-3">
                    Name
                  </th>

                  <th className="text-left px-5 py-3">
                    Email
                  </th>

                  <th className="text-left px-5 py-3">
                    Role
                  </th>

                  <th className="text-left px-5 py-3">
                    Joined
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-50">
                {users.map((user) => (
                  <tr
                    key={user.id}
                    className="hover:bg-slate-50"
                  >
                    <td className="px-5 py-3 font-medium">
                      {user.full_name || '—'}
                    </td>

                    <td className="px-5 py-3 text-slate-600">
                      {user.email}
                    </td>

                    <td className="px-5 py-3">
                      <span className="px-2 py-0.5 rounded-md text-xs border bg-slate-100 text-slate-700 border-slate-200 capitalize">
                        {user.role}
                      </span>
                    </td>

                    <td className="px-5 py-3 text-xs text-slate-500">
                      {formatDate(
                        user.created_at
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ================================================= */}
      {/* ALL BUGS */}
      {/* ================================================= */}

      {view === 'bugs' && (
        <div>
          <div className="mb-5">
            <h1 className="text-xl font-bold text-slate-900">
              All Bugs
            </h1>

            <p className="text-sm text-slate-500 mt-1">
              Search and monitor every bug.
            </p>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 mb-5">
            <div className="flex items-center gap-2 mb-4">
              <Filter className="w-4 h-4 text-slate-500" />

              <span className="text-sm font-medium">
                Filters
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />

                <input
                  value={bugSearch}
                  onChange={(e) =>
                    setBugSearch(e.target.value)
                  }
                  placeholder="Search bugs..."
                  className="w-full pl-9 pr-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-sky-500"
                />
              </div>

              <select
                value={statusFilter}
                onChange={(e) =>
                  setStatusFilter(
                    e.target.value
                  )
                }
                className="px-3 py-2.5 text-sm border border-slate-200 rounded-xl"
              >
                <option value="all">
                  All Statuses
                </option>

                <option value="open">
                  Open
                </option>

                <option value="in_progress">
                  In Progress
                </option>

                <option value="resolved">
                  Resolved
                </option>

                <option value="closed">
                  Closed
                </option>
              </select>

              <select
                value={severityFilter}
                onChange={(e) =>
                  setSeverityFilter(
                    e.target.value
                  )
                }
                className="px-3 py-2.5 text-sm border border-slate-200 rounded-xl"
              >
                <option value="all">
                  All Severities
                </option>

                <option value="critical">
                  Critical
                </option>

                <option value="high">
                  High
                </option>

                <option value="medium">
                  Medium
                </option>

                <option value="low">
                  Low
                </option>
              </select>

              <select
                value={assignmentFilter}
                onChange={(e) =>
                  setAssignmentFilter(
                    e.target.value
                  )
                }
                className="px-3 py-2.5 text-sm border border-slate-200 rounded-xl"
              >
                <option value="all">
                  All Assignments
                </option>

                <option value="unassigned">
                  Unassigned
                </option>

                {developers.map(
                  (developer) => (
                    <option
                      key={developer.id}
                      value={developer.id}
                    >
                      {developer.full_name ||
                        developer.email}
                    </option>
                  )
                )}
              </select>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm">
            <div className="px-5 py-3 border-b border-slate-100 text-xs text-slate-500">
              Showing{' '}
              {filteredBugs.length} of{' '}
              {bugs.length} bugs
            </div>

            <BugList
              bugs={filteredBugs}
              userMap={userMap}
              onSelect={setSelectedBug}
            />
          </div>
        </div>
      )}

      {/* ================================================= */}
      {/* SLA MONITOR */}
      {/* ================================================= */}

      {view === 'sla' && (
        <div>
          <div className="mb-6">
            <h1 className="text-xl font-bold text-slate-900">
              SLA Monitor
            </h1>

            <p className="text-sm text-slate-500 mt-1">
              Monitor resolution deadlines and identify
              bugs requiring escalation.
            </p>
          </div>

          {/* SLA POLICY */}

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 mb-6">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-sky-50 flex items-center justify-center">
                <ShieldCheck className="w-5 h-5 text-sky-500" />
              </div>

              <div>
                <h2 className="font-semibold text-slate-900">
                  Resolution SLA Policy
                </h2>

                <p className="text-xs text-slate-500">
                  Maximum target resolution time by severity
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <SLAPolicy
                severity="Critical"
                time="4 hours"
                className="bg-red-50 text-red-700"
              />

              <SLAPolicy
                severity="High"
                time="24 hours"
                className="bg-orange-50 text-orange-700"
              />

              <SLAPolicy
                severity="Medium"
                time="72 hours"
                className="bg-amber-50 text-amber-700"
              />

              <SLAPolicy
                severity="Low"
                time="7 days"
                className="bg-slate-50 text-slate-700"
              />
            </div>
          </div>

          {/* SLA SUMMARY */}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <SLAStat
              label="Active Bugs"
              value={slaBugs.length}
              icon={Clock}
              className="text-sky-600 bg-sky-50"
            />

            <SLAStat
              label="Approaching Deadline"
              value={dueSoonCount}
              icon={AlertTriangle}
              className="text-amber-600 bg-amber-50"
            />

            <SLAStat
              label="SLA Breached"
              value={breachedCount}
              icon={CircleAlert}
              className="text-red-600 bg-red-50"
            />
          </div>

          {/* SLA TABLE */}

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100">
              <h2 className="font-semibold text-slate-900">
                Active SLA Tracking
              </h2>
            </div>

            {slaBugs.length === 0 ? (
              <div className="px-5 py-14 text-center">
                <CheckCircle2 className="w-9 h-9 text-emerald-500 mx-auto mb-3" />

                <p className="font-medium text-slate-700">
                  No active SLA items
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
                    <tr>
                      <th className="text-left px-5 py-3">
                        Bug
                      </th>

                      <th className="text-left px-4 py-3">
                        Severity
                      </th>

                      <th className="text-left px-4 py-3">
                        Developer
                      </th>

                      <th className="text-left px-4 py-3">
                        Deadline
                      </th>

                      <th className="text-left px-4 py-3">
                        Status
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-50">
                    {slaBugs.map(
                      ({ bug, sla }) => (
                        <tr
                          key={bug.id}
                          className="hover:bg-slate-50"
                        >
                          <td className="px-5 py-4">
                            <button
                              onClick={() =>
                                setSelectedBug(
                                  bug
                                )
                              }
                              className="text-left"
                            >
                              <div className="font-medium text-slate-900 hover:text-sky-600">
                                {bug.title}
                              </div>

                              <div className="text-xs text-slate-400 mt-1">
                                {formatDate(
                                  bug.created_at
                                )}
                              </div>
                            </button>
                          </td>

                          <td className="px-4 py-4">
                            <span
                              className={`px-2 py-0.5 rounded-md text-xs border ${severityStyles[bug.severity]}`}
                            >
                              {severityLabel[
                                bug.severity
                              ]}
                            </span>
                          </td>

                          <td className="px-4 py-4 text-slate-600">
                            {bug.assignee_id
                              ? userMap[
                                  bug.assignee_id
                                ]?.full_name ||
                                'Assigned'
                              : 'Unassigned'}
                          </td>

                          <td className="px-4 py-4 text-slate-600 text-xs">
                            {sla.deadline
                              ? formatDate(
                                  sla.deadline.toISOString()
                                )
                              : '—'}
                          </td>

                          <td className="px-4 py-4">
                            <SLAStatus
                              sla={sla}
                            />
                          </td>
                        </tr>
                      )
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ================================================= */}
      {/* AUDIT LOG */}
      {/* ================================================= */}

      {view === 'audit' && (
        <div>
          <div className="mb-6">
            <h1 className="text-xl font-bold text-slate-900">
              System Audit Log
            </h1>

            <p className="text-sm text-slate-500 mt-1">
              Track important activity across bugs and users.
            </p>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 mb-5">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />

              <input
                value={auditSearch}
                onChange={(e) =>
                  setAuditSearch(
                    e.target.value
                  )
                }
                placeholder="Search activity, user, bug, or action..."
                className="w-full pl-9 pr-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-sky-500"
              />
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm">
            {filteredActivities.length === 0 ? (
              <div className="px-5 py-14 text-center">
                <Activity className="w-9 h-9 text-slate-300 mx-auto mb-3" />

                <p className="font-medium text-slate-600">
                  No audit activity found.
                </p>

                <p className="text-xs text-slate-400 mt-1">
                  Activity will appear here as users perform actions.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-50">
                {filteredActivities.map(
                  (activity) => {
                    const bug = bugs.find(
                      (item) =>
                        item.id ===
                        activity.bug_id
                    );

                    const user = users.find(
                      (item) =>
                        item.id ===
                        activity.user_id
                    );

                    return (
                      <div
                        key={activity.id}
                        className="px-5 py-4 hover:bg-slate-50 transition"
                      >
                        <div className="flex items-start gap-4">
                          <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center flex-shrink-0">
                            <Activity className="w-4 h-4 text-slate-500" />
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-medium text-slate-800">
                                {user?.full_name ||
                                  'Unknown user'}
                              </span>

                              <span className="text-slate-400">
                                performed
                              </span>

                              <span className="px-2 py-0.5 rounded-md bg-sky-50 text-sky-700 text-xs font-medium">
                                {activity.action}
                              </span>
                            </div>

                            {bug && (
                              <button
                                onClick={() =>
                                  setSelectedBug(
                                    bug
                                  )
                                }
                                className="text-sm text-slate-700 hover:text-sky-600 font-medium mt-1"
                              >
                                {bug.title}
                              </button>
                            )}

                            {activity.details && (
                              <p className="text-xs text-slate-500 mt-1">
                                {
                                  activity.details
                                }
                              </p>
                            )}

                            <p className="text-xs text-slate-400 mt-2">
                              {formatDate(
                                activity.created_at
                              )}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  }
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ================================================= */}
      {/* NOTIFICATIONS */}
      {/* ================================================= */}

      {view === 'notifications' && (
        <div>
          <div className="mb-5">
            <h1 className="text-xl font-bold text-slate-900">
              Notifications
            </h1>

            <p className="text-sm text-slate-500 mt-1">
              Administrative notifications and updates.
            </p>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm divide-y divide-slate-50">
            {notifications.length === 0 ? (
              <div className="px-5 py-14 text-center">
                <Bell className="w-8 h-8 text-slate-300 mx-auto mb-3" />

                <p className="text-sm font-medium text-slate-600">
                  No notifications yet.
                </p>

                <p className="text-xs text-slate-400 mt-1">
                  Administrative notifications will appear here.
                </p>
              </div>
            ) : (
              notifications.map(
                (notification) => (
                  <div
                    key={notification.id}
                    className={`px-5 py-4 ${
                      notification.is_read
                        ? 'text-slate-500'
                        : 'text-slate-800 font-medium'
                    }`}
                  >
                    <div>
                      {notification.message}
                    </div>

                    <div className="text-xs text-slate-400 mt-1">
                      {formatDate(
                        notification.created_at
                      )}
                    </div>
                  </div>
                )
              )
            )}
          </div>
        </div>
      )}
    </DashboardShell>
  );
}

/* ================================================= */
/* STAT CARD */
/* ================================================= */

function StatCard({
  label,
  value,
  color,
  icon: Icon,
}: {
  label: string;
  value: number;
  color: string;
  icon: React.ElementType;
}) {
  const colors: Record<
    string,
    string
  > = {
    slate: 'from-slate-500 to-slate-600',
    blue: 'from-blue-500 to-sky-500',
    amber: 'from-amber-500 to-orange-500',
    emerald: 'from-emerald-500 to-teal-500',
    red: 'from-red-500 to-rose-500',
    purple: 'from-violet-500 to-fuchsia-500',
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
      <div
        className={`w-9 h-9 rounded-xl bg-gradient-to-br ${colors[color]} mb-3 flex items-center justify-center`}
      >
        <Icon className="w-4 h-4 text-white" />
      </div>

      <div className="text-2xl font-bold text-slate-900">
        {value}
      </div>

      <div className="text-xs text-slate-500 mt-0.5">
        {label}
      </div>
    </div>
  );
}

/* ================================================= */
/* STATUS BAR */
/* ================================================= */

function StatusBar({
  label,
  value,
  total,
  className,
}: {
  label: string;
  value: number;
  total: number;
  className: string;
}) {
  const percentage =
    total > 0
      ? Math.round(
          (value / total) * 100
        )
      : 0;

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-slate-700">
          {label}
        </span>

        <span className="text-xs text-slate-500">
          {value} · {percentage}%
        </span>
      </div>

      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full ${className}`}
          style={{
            width: `${percentage}%`,
          }}
        />
      </div>
    </div>
  );
}

/* ================================================= */
/* SLA POLICY */
/* ================================================= */

function SLAPolicy({
  severity,
  time,
  className,
}: {
  severity: string;
  time: string;
  className: string;
}) {
  return (
    <div
      className={`rounded-xl p-4 ${className}`}
    >
      <div className="text-xs font-medium uppercase tracking-wide">
        {severity}
      </div>

      <div className="text-lg font-bold mt-1">
        {time}
      </div>
    </div>
  );
}

/* ================================================= */
/* SLA STAT */
/* ================================================= */

function SLAStat({
  label,
  value,
  icon: Icon,
  className,
}: {
  label: string;
  value: number;
  icon: React.ElementType;
  className: string;
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
      <div className="flex items-center gap-3">
        <div
          className={`w-10 h-10 rounded-xl flex items-center justify-center ${className}`}
        >
          <Icon className="w-5 h-5" />
        </div>

        <div>
          <div className="text-2xl font-bold text-slate-900">
            {value}
          </div>

          <div className="text-sm text-slate-500">
            {label}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ================================================= */
/* SLA STATUS */
/* ================================================= */

function SLAStatus({
  sla,
}: {
  sla: SLAInfo;
}) {
  if (sla.status === 'breached') {
    return (
      <div>
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium bg-red-50 text-red-700 border border-red-200">
          <AlertTriangle className="w-3 h-3" />
          Breached
        </span>

        <div className="text-xs text-red-500 mt-1">
          {Math.abs(
            Math.round(sla.hoursRemaining)
          )}{' '}
          hrs overdue
        </div>
      </div>
    );
  }

  if (sla.status === 'due_soon') {
    return (
      <div>
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
          <Clock className="w-3 h-3" />
          Due Soon
        </span>

        <div className="text-xs text-amber-600 mt-1">
          {formatRemainingHours(
            sla.hoursRemaining
          )}{' '}
          remaining
        </div>
      </div>
    );
  }

  return (
    <div>
      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
        <CheckCircle2 className="w-3 h-3" />
        On Track
      </span>

      <div className="text-xs text-slate-400 mt-1">
        {formatRemainingHours(
          sla.hoursRemaining
        )}{' '}
        remaining
      </div>
    </div>
  );
}

function formatRemainingHours(
  hours: number
) {
  if (hours < 1) {
    return `${Math.max(
      1,
      Math.round(hours * 60)
    )} min`;
  }

  if (hours < 24) {
    return `${Math.round(hours)} hrs`;
  }

  return `${Math.round(
    hours / 24
  )} days`;
}

/* ================================================= */
/* BUG LIST */
/* ================================================= */

function BugList({
  bugs,
  userMap,
  onSelect,
}: {
  bugs: Bug[];
  userMap: Record<string, Profile>;
  onSelect: (bug: Bug) => void;
}) {
  if (bugs.length === 0) {
    return (
      <div className="px-5 py-12 text-center text-sm text-slate-400">
        No bugs found.
      </div>
    );
  }

  return (
    <div className="divide-y divide-slate-50">
      {bugs.map((bug) => (
        <button
          key={bug.id}
          onClick={() => onSelect(bug)}
          className="w-full text-left px-5 py-4 hover:bg-slate-50 transition flex flex-wrap items-center justify-between gap-3"
        >
          <div className="min-w-0 flex-1">
            <div className="font-medium text-slate-900 truncate">
              {bug.title}
            </div>
            <div className="text-xs text-slate-500 mt-1">
              {categoryLabel[
                bug.category
              ]}{' '}
              · {formatDate(bug.created_at)}
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <span
              className={`px-2 py-0.5 rounded-md text-xs border ${severityStyles[bug.severity]}`}
            >
              {severityLabel[
                bug.severity
              ]}
            </span>
            <span
              className={`px-2 py-0.5 rounded-md text-xs border ${priorityStyles[bug.priority]}`}
            >
              {priorityLabel[
                bug.priority
              ]}
            </span>
            <span
              className={`px-2.5 py-0.5 rounded-md text-xs border ${statusStyles[bug.status]}`}
            >
              {statusLabel[
                bug.status
              ]}
            </span>
            <span className="text-xs text-slate-500 hidden lg:inline">
              {bug.assignee_id
                ? userMap[
                    bug.assignee_id
                  ]?.full_name ||
                  'Assigned'
                : 'Unassigned'}
            </span>
          </div>
        </button>
      ))}
    </div>
  );
}