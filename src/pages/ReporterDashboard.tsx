import { useEffect, useState, type FormEvent } from 'react';

import { supabase, type Bug, type Profile, type Severity, type Priority, type BugCategory } from '@/lib/supabase';

import { predict } from '@/lib/aiPrediction';

import { statusStyles, severityStyles, priorityStyles, statusLabel, severityLabel, priorityLabel, categoryLabel, formatDate } from '@/lib/ui';

import DashboardShell, { type NavItem } from '@/components/DashboardShell';

import BugDetail from '@/components/BugDetail';

import { useAuth } from '@/context/AuthContext';

import { LayoutDashboard, PlusCircle, FileText, Bell, Trash2, X, Paperclip, Pencil, CheckCircle2, RotateCcw, Clock, Save } from 'lucide-react';

const NAV: NavItem[] = [

  { label: 'Dashboard', icon: LayoutDashboard, view: 'dashboard' },

  { label: 'Report Bug', icon: PlusCircle, view: 'report' },

  { label: 'My Bugs', icon: FileText, view: 'bugs' },
  { label: 'Activity', icon: Clock, view: 'activity' },

  { label: 'Notifications', icon: Bell, view: 'notifications' },

];

const SEVERITIES: Severity[] = ['low', 'medium', 'high', 'critical'];

const PRIORITIES: Priority[] = ['low', 'normal', 'high', 'urgent'];

const CATEGORIES: BugCategory[] = ['ui', 'backend', 'database', 'network', 'security', 'performance', 'api', 'other'];

type Activity = { id: string; bug_id: string; user_id: string; action: string; details: string | null; created_at: string };

type NotificationItem = { id: string; message: string; is_read: boolean; created_at: string; bug_id: string | null };

export default function ReporterDashboard() {

  const { profile } = useAuth();

  const [view, setView] = useState('dashboard');

  const [bugs, setBugs] = useState<Bug[]>([]);

  const [selectedBug, setSelectedBug] = useState<Bug | null>(null);

  const [profileMap, setProfileMap] = useState<Record<string, Profile>>({});

  const [deletingBugId, setDeletingBugId] = useState<string | null>(null);

  const [editingBug, setEditingBug] = useState<Bug | null>(null);

  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  const [activities, setActivities] = useState<Activity[]>([]);

  const [loadingActivities, setLoadingActivities] = useState(false);

  async function loadBugs() {

    if (!profile) return;

    const { data } = await supabase.from('bugs').select('*').eq('reporter_id', profile.id).order('created_at', { ascending: false });

    const list = (data as Bug[]) ?? [];

    setBugs(list);

    const ids = new Set<string>();

    list.forEach((bug) => {

      ids.add(bug.reporter_id);

      if (bug.assignee_id) ids.add(bug.assignee_id);

    });

    if (ids.size > 0) {

      const { data: profiles } = await supabase.from('profiles').select('*').in('id', Array.from(ids));

      const map: Record<string, Profile> = {};

      (profiles as Profile[] | null)?.forEach((item) => { map[item.id] = item; });

      setProfileMap(map);

    }

  }

  async function loadNotifications() {

    if (!profile) return;

    const { data } = await supabase.from('notifications').select('*').eq('user_id', profile.id).order('created_at', { ascending: false });

    setNotifications((data as NotificationItem[]) ?? []);

  }

  async function loadActivities(bugId: string) {

    setLoadingActivities(true);

    const { data } = await supabase.from('bug_activity').select('*').eq('bug_id', bugId).order('created_at', { ascending: false });

    setActivities((data as Activity[]) ?? []);

    setLoadingActivities(false);

  }

  async function loadAllActivities() {
    if (!profile || bugs.length === 0) {
      setActivities([]);
      return;
    }
    setLoadingActivities(true);
    const bugIds = bugs.map((bug) => bug.id);
    const { data } = await supabase.from('bug_activity').select('*').in('bug_id', bugIds).order('created_at', { ascending: false });
    setActivities((data as Activity[]) ?? []);
    setLoadingActivities(false);
  }

  async function openBug(bug: Bug) {

    setSelectedBug(bug);

    await loadActivities(bug.id);

  }

  async function handleDeleteBug(bug: Bug) {

    if (!profile) return;

    const confirmed = window.confirm(`Delete "${bug.title}"?\n\nThis will permanently remove the bug from the system. ${bug.assignee_id ? 'The assigned developer and administrators will be notified.' : 'Administrators will be notified.'}`);

    if (!confirmed) return;

    setDeletingBugId(bug.id);

    const { error } = await supabase.rpc('withdraw_bug', { p_bug_id: bug.id });

    if (error) {

      window.alert(`Failed to withdraw bug: ${error.message}`);

      setDeletingBugId(null);

      return;

    }

    if (selectedBug?.id === bug.id) setSelectedBug(null);

    await loadBugs();

    setDeletingBugId(null);

  }

  async function handleReopenBug() {

    if (!selectedBug) return;

    const feedback = window.prompt('Why is the issue still happening? (Optional)') ?? '';

    const { error } = await supabase.rpc('reporter_reopen_bug', { p_bug_id: selectedBug.id, p_feedback: feedback });

    if (error) {

      window.alert(`Could not reopen the bug: ${error.message}`);

      return;

    }

    await loadBugs();

    const updated = { ...selectedBug, status: 'open' as const, resolution_details: null, updated_at: new Date().toISOString() };

    setSelectedBug(updated);

    await loadActivities(updated.id);

    window.alert('The bug has been reopened and the developer has been notified.');

  }

  async function handleConfirmFix() {

    if (!selectedBug) return;

    const feedback = window.prompt('Optional feedback about the fix:') ?? '';

    const { error } = await supabase.rpc('reporter_confirm_bug_fix', { p_bug_id: selectedBug.id, p_feedback: feedback });

    if (error) {

      window.alert(`Could not record confirmation: ${error.message}`);

      return;

    }

    await loadActivities(selectedBug.id);

    window.alert('Your confirmation has been recorded.');

  }

  useEffect(() => {

    loadBugs();

    loadNotifications();

  }, [profile]);

  useEffect(() => {
    if (view === 'activity') {
      loadAllActivities();
    }
  }, [view, bugs]);

  useEffect(() => {

    if (!profile) return;

    const profileId = profile.id;

    const channel = supabase.channel(`reporter-notifs-${profileId}`).on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${profileId}` }, () => loadNotifications()).subscribe();

    return () => { supabase.removeChannel(channel); };

  }, [profile]);

  const stats = {

    total: bugs.length,

    open: bugs.filter((b) => b.status === 'open').length,

    inProgress: bugs.filter((b) => b.status === 'in_progress').length,

    resolved: bugs.filter((b) => b.status === 'resolved').length,

  };

  if (selectedBug) {

    return (

      <DashboardShell navItems={NAV} currentView={view} onNavigate={(v) => { setSelectedBug(null); setView(v); }} roleLabel="Reporter">

        <div className="max-w-4xl mx-auto space-y-4">

          <ReporterBugActions bug={selectedBug} onEdit={() => setEditingBug(selectedBug)} onReopen={handleReopenBug} onConfirm={handleConfirmFix} />

          <BugTimeline activities={activities} loading={loadingActivities} />

          <BugDetail bug={selectedBug} reporter={profileMap[selectedBug.reporter_id] ?? (profile as Profile)} assignee={selectedBug.assignee_id ? profileMap[selectedBug.assignee_id] ?? null : null} onBack={() => setSelectedBug(null)} developers={[]} />

        </div>

        {editingBug && <EditBugModal bug={editingBug} onClose={() => setEditingBug(null)} onSaved={async (updated) => { setEditingBug(null); setSelectedBug(updated); await loadBugs(); await loadActivities(updated.id); }} />}

      </DashboardShell>

    );

  }

  return (

    <DashboardShell navItems={NAV} currentView={view} onNavigate={setView} roleLabel="Reporter">

      {view === 'dashboard' && (

        <div>

          <h1 className="text-2xl font-bold text-slate-900 mb-1">Welcome, {profile?.full_name || 'Reporter'}</h1>

          <p className="text-slate-500 text-sm mb-6">Track your reported bugs and their status.</p>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">

            <StatCard label="Total Bugs" value={stats.total} color="slate" />

            <StatCard label="Open" value={stats.open} color="blue" />

            <StatCard label="In Progress" value={stats.inProgress} color="amber" />

            <StatCard label="Resolved" value={stats.resolved} color="emerald" />

          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm">

            <div className="px-5 py-4 border-b border-slate-100"><h2 className="font-semibold text-slate-900">Recent Bugs</h2></div>

            <BugList bugs={bugs.slice(0, 5)} onSelect={openBug} onEdit={setEditingBug} onDelete={handleDeleteBug} deletingBugId={deletingBugId} />

          </div>

        </div>

      )}

      {view === 'report' && <ReportBugForm onSubmitted={async () => { await loadBugs(); setView('bugs'); }} />}

      {view === 'bugs' && (

        <div>

          <h1 className="text-xl font-bold text-slate-900 mb-4">My Reported Bugs</h1>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm"><BugList bugs={bugs} onSelect={openBug} onEdit={setEditingBug} onDelete={handleDeleteBug} deletingBugId={deletingBugId} /></div>

        </div>

      )}

      {view === 'activity' && (
        <div>
          <h1 className="text-xl font-bold text-slate-900 mb-1">Activity</h1>
          <p className="text-sm text-slate-500 mb-4">A history of activity across all your reported bugs.</p>
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
            {loadingActivities ? (
              <div className="text-sm text-slate-400 py-8 text-center">Loading activity...</div>
            ) : activities.length === 0 ? (
              <div className="text-sm text-slate-400 py-8 text-center">No activity recorded yet.</div>
            ) : (
              <div className="space-y-5">
                {activities.map((activity) => {
                  const bug = bugs.find((item) => item.id === activity.bug_id);
                  return (
                    <button key={activity.id} type="button" onClick={() => bug && openBug(bug)} disabled={!bug} className="w-full text-left flex gap-3 rounded-xl p-2 -m-2 hover:bg-slate-50 transition">
                      <div className="mt-1.5 w-2.5 h-2.5 rounded-full bg-sky-500 shrink-0" />
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-slate-800">{activity.action}</div>
                        {bug && <div className="text-sm text-sky-700 font-medium mt-0.5 truncate">{bug.title}</div>}
                        {activity.details && <div className="text-sm text-slate-500 mt-0.5">{activity.details}</div>}
                        <div className="text-xs text-slate-400 mt-1">{formatDate(activity.created_at)}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {view === 'notifications' && (

        <div>

          <h1 className="text-xl font-bold text-slate-900 mb-4">Notifications</h1>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm divide-y divide-slate-50">

            {notifications.length === 0 ? <div className="px-5 py-12 text-center text-sm text-slate-400">No notifications yet.</div> : notifications.map((n) => (

              <div key={n.id} className={`px-5 py-4 ${n.is_read ? 'text-slate-500' : 'text-slate-800 font-medium'}`}>

                {n.message}<div className="text-xs text-slate-400 mt-1">{formatDate(n.created_at)}</div>

              </div>

            ))}

          </div>

        </div>

      )}

      {editingBug && <EditBugModal bug={editingBug} onClose={() => setEditingBug(null)} onSaved={async (updated) => { setEditingBug(null); await loadBugs(); }} />}

    </DashboardShell>

  );

}

function ReporterBugActions({ bug, onEdit, onReopen, onConfirm }: { bug: Bug; onEdit: () => void; onReopen: () => void; onConfirm: () => void }) {

  return (

    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">

      <div className="flex flex-wrap items-center justify-between gap-3">

        <div><h2 className="font-semibold text-slate-900">Reporter Actions</h2><p className="text-xs text-slate-500 mt-1">Manage your report and verify the developer's resolution.</p></div>

        <div className="flex flex-wrap gap-2">

          {!bug.assignee_id && bug.status !== 'resolved' && <button type="button" onClick={onEdit} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-sky-700 border border-sky-200 bg-sky-50 hover:bg-sky-100"><Pencil className="w-4 h-4" />Edit Bug</button>}

          {bug.status === 'resolved' && <><button type="button" onClick={onConfirm} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-emerald-700 border border-emerald-200 bg-emerald-50 hover:bg-emerald-100"><CheckCircle2 className="w-4 h-4" />Confirm Fixed</button><button type="button" onClick={onReopen} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-amber-700 border border-amber-200 bg-amber-50 hover:bg-amber-100"><RotateCcw className="w-4 h-4" />Still Happening</button></>}

        </div>

      </div>

      {bug.status === 'resolved' && <div className="mt-4 p-3 rounded-xl bg-emerald-50 border border-emerald-100 text-sm text-emerald-800">The developer marked this bug as resolved. Please confirm whether the issue is actually fixed.</div>}

    </div>

  );

}

function BugTimeline({ activities, loading }: { activities: Activity[]; loading: boolean }) {

  return (

    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">

      <div className="flex items-center gap-2 mb-4"><Clock className="w-4 h-4 text-sky-600" /><h2 className="font-semibold text-slate-900">Bug Timeline</h2></div>

      {loading ? <div className="text-sm text-slate-400">Loading timeline...</div> : activities.length === 0 ? <div className="text-sm text-slate-400">No timeline events recorded yet.</div> : (

        <div className="space-y-4">

          {activities.map((activity) => <div key={activity.id} className="flex gap-3"><div className="mt-1.5 w-2 h-2 rounded-full bg-sky-500 shrink-0" /><div><div className="text-sm font-medium text-slate-800">{activity.action}</div>{activity.details && <div className="text-sm text-slate-500 mt-0.5">{activity.details}</div>}<div className="text-xs text-slate-400 mt-1">{formatDate(activity.created_at)}</div></div></div>)}

        </div>

      )}

    </div>

  );

}

function EditBugModal({ bug, onClose, onSaved }: { bug: Bug; onClose: () => void; onSaved: (bug: Bug) => Promise<void> | void }) {

  const [title, setTitle] = useState(bug.title);

  const [description, setDescription] = useState(bug.description);

  const [severity, setSeverity] = useState<Severity>(bug.severity);

  const [priority, setPriority] = useState<Priority>(bug.priority);

  const [category, setCategory] = useState<BugCategory>(bug.category);

  const [saving, setSaving] = useState(false);

  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {

    e.preventDefault();

    setSaving(true);

    setError(null);

    const { error: updateError } = await supabase.rpc('reporter_update_bug', { p_bug_id: bug.id, p_title: title.trim(), p_description: description.trim(), p_severity: severity, p_priority: priority, p_category: category });

    if (updateError) {

      setError(updateError.message);

      setSaving(false);

      return;

    }

    await onSaved({ ...bug, title: title.trim(), description: description.trim(), severity, priority, category, updated_at: new Date().toISOString() });

    setSaving(false);

  }

  return (

    <div className="fixed inset-0 z-50 bg-slate-900/40 flex items-center justify-center p-4">

      <form onSubmit={handleSubmit} className="w-full max-w-2xl bg-white rounded-2xl shadow-xl border border-slate-200 p-6 space-y-5 max-h-[90vh] overflow-y-auto">

        <div className="flex items-center justify-between"><div><h2 className="text-lg font-semibold text-slate-900">Edit Bug</h2><p className="text-xs text-slate-500 mt-1">Editing is allowed only before the bug is assigned.</p></div><button type="button" onClick={onClose} className="p-2 rounded-lg hover:bg-slate-100"><X className="w-5 h-5" /></button></div>

        <div><label className="block text-sm font-medium text-slate-700 mb-1.5">Title</label><input required value={title} onChange={(e) => setTitle(e.target.value)} className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500" /></div>

        <div><label className="block text-sm font-medium text-slate-700 mb-1.5">Description</label><textarea required value={description} onChange={(e) => setDescription(e.target.value)} rows={6} className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 resize-none" /></div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">

          <div><label className="block text-sm font-medium text-slate-700 mb-1.5">Severity</label><select value={severity} onChange={(e) => setSeverity(e.target.value as Severity)} className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm">{SEVERITIES.map((s) => <option key={s} value={s}>{severityLabel[s]}</option>)}</select></div>

          <div><label className="block text-sm font-medium text-slate-700 mb-1.5">Priority</label><select value={priority} onChange={(e) => setPriority(e.target.value as Priority)} className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm">{PRIORITIES.map((p) => <option key={p} value={p}>{priorityLabel[p]}</option>)}</select></div>

          <div><label className="block text-sm font-medium text-slate-700 mb-1.5">Category</label><select value={category} onChange={(e) => setCategory(e.target.value as BugCategory)} className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm">{CATEGORIES.map((c) => <option key={c} value={c}>{categoryLabel[c]}</option>)}</select></div>

        </div>

        {error && <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</div>}

        <div className="flex justify-end gap-2"><button type="button" onClick={onClose} className="px-4 py-2 rounded-lg text-sm border border-slate-200 text-slate-600 hover:bg-slate-50">Cancel</button><button type="submit" disabled={saving} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-sky-600 text-white hover:bg-sky-700 disabled:opacity-60"><Save className="w-4 h-4" />{saving ? 'Saving...' : 'Save Changes'}</button></div>

      </form>

    </div>

  );

}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {

  const colors: Record<string, string> = { slate: 'from-slate-500 to-slate-600', blue: 'from-blue-500 to-sky-500', amber: 'from-amber-500 to-orange-500', emerald: 'from-emerald-500 to-teal-500' };

  return <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5"><div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${colors[color]} mb-3`} /><div className="text-2xl font-bold text-slate-900">{value}</div><div className="text-sm text-slate-500">{label}</div></div>;

}

function BugList({ bugs, onSelect, onEdit, onDelete, deletingBugId }: { bugs: Bug[]; onSelect: (b: Bug) => void; onEdit: (b: Bug) => void; onDelete: (b: Bug) => void; deletingBugId: string | null }) {

  if (bugs.length === 0) return <div className="px-5 py-12 text-center text-sm text-slate-400">No bugs reported yet.</div>;

  return <div className="divide-y divide-slate-50">{bugs.map((b) => <div key={b.id} className="px-5 py-4 hover:bg-slate-50 transition flex flex-wrap items-center justify-between gap-3"><button type="button" onClick={() => onSelect(b)} className="min-w-0 flex-1 text-left"><div className="font-medium text-slate-900 truncate">{b.title}</div><div className="text-xs text-slate-500 mt-0.5">{categoryLabel[b.category]} · {formatDate(b.created_at)}</div></button><div className="flex items-center gap-2"><span className={`px-2 py-0.5 rounded-md text-xs border ${severityStyles[b.severity]}`}>{severityLabel[b.severity]}</span><span className={`px-2 py-0.5 rounded-md text-xs border ${priorityStyles[b.priority]}`}>{priorityLabel[b.priority]}</span><span className={`px-2.5 py-0.5 rounded-md text-xs border ${statusStyles[b.status]}`}>{statusLabel[b.status]}</span>{!b.assignee_id && b.status !== 'resolved' && <button type="button" onClick={(e) => { e.stopPropagation(); onEdit(b); }} className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-sky-700 border border-sky-200 bg-sky-50 hover:bg-sky-100"><Pencil className="w-3.5 h-3.5" />Edit</button>}<button type="button" onClick={(e) => { e.stopPropagation(); onDelete(b); }} disabled={deletingBugId === b.id} className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-red-600 border border-red-200 bg-red-50 hover:bg-red-100 disabled:opacity-50"><Trash2 className="w-3.5 h-3.5" />{deletingBugId === b.id ? 'Deleting...' : 'Delete'}</button></div></div>)}</div>;

}

function ReportBugForm({ onSubmitted }: { onSubmitted: () => void | Promise<void> }) {

  const { profile } = useAuth();

  const [title, setTitle] = useState('');

  const [description, setDescription] = useState('');

  const [severity, setSeverity] = useState<Severity>('medium');

  const [priority, setPriority] = useState<Priority>('normal');

  const [category, setCategory] = useState<BugCategory>('ui');

  const [files, setFiles] = useState<File[]>([]);

  const [submitting, setSubmitting] = useState(false);

  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {

    e.preventDefault();

    if (!profile) return;

    setSubmitting(true);

    setError(null);

    const { data: bug, error: bugError } = await supabase.from('bugs').insert({ title, description, severity, priority, category, reporter_id: profile.id }).select().single();

    if (bugError || !bug) { setError(bugError?.message ?? 'Failed to create bug.'); setSubmitting(false); return; }

    const prediction = await predict({ title, description, category, severity, priority });

    await supabase.from('ai_predictions').insert({ bug_id: bug.id, predicted_category: prediction.predicted_category, probable_root_cause: prediction.probable_root_cause, confidence_score: prediction.confidence_score, model_version: prediction.model_version });

    if (files.length > 0) {

      const uploadErrors: string[] = [];

      for (const file of files) {

        const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');

        const filePath = `${profile.id}/${bug.id}/${Date.now()}-${safeName}`;

        const { error: upErr } = await supabase.storage.from('bug-attachments').upload(filePath, file);

        if (upErr) { uploadErrors.push(`${file.name}: ${upErr.message}`); continue; }

        const { error: attachmentError } = await supabase.from('attachments').insert({ bug_id: bug.id, file_name: file.name, file_path: filePath, file_size: file.size, file_type: file.type, uploaded_by: profile.id });

        if (attachmentError) uploadErrors.push(`${file.name}: ${attachmentError.message}`);

      }

      if (uploadErrors.length > 0) { setError(`Bug reported, but some attachments could not be uploaded: ${uploadErrors.join(' | ')}`); setSubmitting(false); return; }

    }

    setSubmitting(false);

    await onSubmitted();

  }

  return (

    <div className="max-w-2xl">

      <h1 className="text-xl font-bold text-slate-900 mb-4">Report a New Bug</h1>

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-5">

        <div><label className="block text-sm font-medium text-slate-700 mb-1.5">Title</label><input type="text" required value={title} onChange={(e) => setTitle(e.target.value)} className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500" placeholder="Brief summary of the bug" /></div>

        <div><label className="block text-sm font-medium text-slate-700 mb-1.5">Description</label><textarea required value={description} onChange={(e) => setDescription(e.target.value)} rows={5} className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 resize-none" placeholder="Detailed description of the bug, steps to reproduce, expected vs actual behavior..." /></div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">

          <div><label className="block text-sm font-medium text-slate-700 mb-1.5">Severity</label><select value={severity} onChange={(e) => setSeverity(e.target.value as Severity)} className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm">{SEVERITIES.map((s) => <option key={s} value={s}>{severityLabel[s]}</option>)}</select></div>

          <div><label className="block text-sm font-medium text-slate-700 mb-1.5">Priority</label><select value={priority} onChange={(e) => setPriority(e.target.value as Priority)} className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm">{PRIORITIES.map((p) => <option key={p} value={p}>{priorityLabel[p]}</option>)}</select></div>

          <div><label className="block text-sm font-medium text-slate-700 mb-1.5">Category</label><select value={category} onChange={(e) => setCategory(e.target.value as BugCategory)} className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm">{CATEGORIES.map((c) => <option key={c} value={c}>{categoryLabel[c]}</option>)}</select></div>

        </div>

        <div><label className="block text-sm font-medium text-slate-700 mb-1.5">Screenshots / Attachments</label><div className="border border-dashed border-slate-300 rounded-xl p-4 bg-slate-50/50"><div className="flex flex-wrap items-center gap-3"><label className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"><Paperclip className="w-4 h-4" />Choose Files<input type="file" multiple accept="image/*,.pdf,.txt,.log,.csv,.json,.zip" className="hidden" onChange={(e) => { const selected = Array.from(e.target.files ?? []); const oversized = selected.filter((file) => file.size > 10 * 1024 * 1024); if (oversized.length) setError(`These files exceed the 10 MB limit: ${oversized.map((file) => file.name).join(', ')}`); const valid = selected.filter((file) => file.size <= 10 * 1024 * 1024); const combined = [...files, ...valid]; const unique = combined.filter((file, index, list) => index === list.findIndex((item) => item.name === file.name && item.size === file.size && item.lastModified === file.lastModified)); if (unique.length > 5) { setError('You can upload a maximum of 5 attachments per bug.'); setFiles(unique.slice(0, 5)); } else { if (!oversized.length) setError(null); setFiles(unique); } e.currentTarget.value = ''; }} /></label><span className="text-xs text-slate-500">Up to 5 files, 10 MB each</span></div>{files.length > 0 && <div className="mt-3 space-y-2">{files.map((file, index) => <div key={`${file.name}-${file.size}-${file.lastModified}-${index}`} className="flex items-center justify-between gap-3 bg-white border border-slate-200 rounded-lg px-3 py-2"><div className="min-w-0 flex items-center gap-2"><Paperclip className="w-4 h-4 text-slate-400 shrink-0" /><span className="text-sm text-slate-700 truncate">{file.name}</span><span className="text-xs text-slate-400 shrink-0">{(file.size / 1024 / 1024).toFixed(2)} MB</span></div><button type="button" onClick={() => setFiles(files.filter((_, fileIndex) => fileIndex !== index))} className="p-1 rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50"><X className="w-4 h-4" /></button></div>)}</div>}<p className="text-xs text-slate-400 mt-3">Upload screenshots, PDFs, logs, or other files that help explain the issue.</p></div></div>

        {error && <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</div>}

        <button type="submit" disabled={submitting} className="px-5 py-2.5 bg-sky-600 text-white text-sm font-medium rounded-xl hover:bg-sky-700 transition disabled:opacity-60">{submitting ? 'Submitting...' : 'Submit Bug Report'}</button>

      </form>

    </div>

  );

}
