import { type ReactNode, useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase, type Notification } from '@/lib/supabase';
import {
  Bug,
  LogOut,
  Bell,
  Menu,
  X,
  type LucideIcon,
} from 'lucide-react';

export type NavItem = {
  label: string;
  icon: LucideIcon;
  view: string;
};

type ShellProps = {
  navItems: NavItem[];
  currentView: string;
  onNavigate: (view: string) => void;
  roleLabel: string;
  children: ReactNode;
};

export default function DashboardShell({
  navItems,
  currentView,
  onNavigate,
  roleLabel,
  children,
}: ShellProps) {
  const { profile, signOut } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotif, setShowNotif] = useState(false);

  useEffect(() => {
    if (!profile) return;
    const profileId = profile.id;
    async function load() {
      const { data } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', profileId)
        .order('created_at', { ascending: false })
        .limit(10);
      setNotifications((data as Notification[]) ?? []);
    }
    load();

    const channel = supabase
      .channel('notifications-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${profileId}`,
        },
        () => load()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile]);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  async function markAllRead() {
    if (!profile) return;
    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', profile.id)
      .eq('is_read', false);
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
  }

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar */}
      <aside
        className={`fixed lg:sticky top-0 left-0 h-screen w-64 bg-slate-900 text-slate-300 flex flex-col z-40 transition-transform ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="flex items-center gap-3 px-5 h-16 border-b border-white/10">
          <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-br from-sky-500 to-cyan-400">
            <Bug className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="text-white font-semibold text-sm">BugSentry AI</div>
            <div className="text-xs text-slate-500">{roleLabel}</div>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = currentView === item.view;
            return (
              <button
                key={item.view}
                onClick={() => {
                  onNavigate(item.view);
                  setMobileOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  active
                    ? 'bg-sky-500/15 text-sky-400 border border-sky-500/20'
                    : 'text-slate-400 hover:bg-white/5 hover:text-white'
                }`}
              >
                <Icon className="w-4 h-4" />
                {item.label}
              </button>
            );
          })}
        </nav>

        <div className="p-3 border-t border-white/10">
          <div className="px-3 py-2 mb-2">
            <div className="text-sm text-white font-medium truncate">
              {profile?.full_name || profile?.email}
            </div>
            <div className="text-xs text-slate-500 truncate">
              {profile?.email}
            </div>
          </div>
          <button
            onClick={signOut}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-slate-400 hover:bg-white/5 hover:text-white transition-all"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="sticky top-0 z-20 bg-white/80 backdrop-blur-md border-b border-slate-200 h-16 flex items-center justify-between px-4 lg:px-8">
          <button
            onClick={() => setMobileOpen(true)}
            className="lg:hidden text-slate-600"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="hidden lg:block" />

          {/* Notifications */}
          <div className="relative">
            <button
              onClick={() => {
                setShowNotif((v) => !v);
                if (!showNotif) markAllRead();
              }}
              className="relative p-2 rounded-lg text-slate-600 hover:bg-slate-100 transition"
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
                  {unreadCount}
                </span>
              )}
            </button>
            {showNotif && (
              <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-100 font-medium text-sm text-slate-700">
                  Notifications
                </div>
                <div className="max-h-80 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="px-4 py-8 text-center text-sm text-slate-400">
                      No notifications yet
                    </div>
                  ) : (
                    notifications.map((n) => (
                      <div
                        key={n.id}
                        className={`px-4 py-3 border-b border-slate-50 text-sm ${
                          n.is_read ? 'text-slate-500' : 'text-slate-800 font-medium'
                        }`}
                      >
                        {n.message}
                        <div className="text-xs text-slate-400 mt-0.5">
                          {new Date(n.created_at).toLocaleString()}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </header>

        <main className="flex-1 p-4 lg:p-8 overflow-x-hidden">{children}</main>
      </div>
    </div>
  );
}
