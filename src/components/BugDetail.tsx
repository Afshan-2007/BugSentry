import { useEffect, useState } from 'react';
import { supabase, type Bug, type Attachment, type AIPrediction, type Profile } from '@/lib/supabase';
import {
  statusStyles,
  severityStyles,
  priorityStyles,
  statusLabel,
  severityLabel,
  priorityLabel,
  categoryLabel,
  formatDate,
  formatBytes,
} from '@/lib/ui';
import { ArrowLeft, Paperclip, Sparkles, Download, User as UserIcon } from 'lucide-react';

type Props = {
  bug: Bug;
  reporter?: Profile | null;
  assignee?: Profile | null;
  onBack: () => void;
  /** Show the developer controls (status + resolution) */
  showDeveloperControls?: boolean;
  /** Show admin controls (assign developer) */
  showAdminControls?: boolean;
  developers: Profile[];
  onBugUpdated?: () => void;
};

export default function BugDetail({
  bug,
  reporter,
  assignee,
  onBack,
  showDeveloperControls,
  showAdminControls,
  developers,
  onBugUpdated,
}: Props) {
  const [prediction, setPrediction] = useState<AIPrediction | null>(null);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [status, setStatus] = useState(bug.status);
  const [resolution, setResolution] = useState(bug.resolution_details ?? '');
  const [assigneeId, setAssigneeId] = useState(bug.assignee_id ?? '');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    setStatus(bug.status);
    setResolution(bug.resolution_details ?? '');
    setAssigneeId(bug.assignee_id ?? '');
  }, [bug]);

  useEffect(() => {
    async function load() {
      const [pred, atts] = await Promise.all([
        supabase
          .from('ai_predictions')
          .select('*')
          .eq('bug_id', bug.id)
          .maybeSingle(),
        supabase.from('attachments').select('*').eq('bug_id', bug.id),
      ]);
      setPrediction(pred.data as AIPrediction | null);
      setAttachments((atts.data as Attachment[]) ?? []);
    }
    load();
  }, [bug.id]);

  async function handleStatusUpdate() {
    setSaving(true);
    setMessage(null);
    const { error } = await supabase
      .from('bugs')
      .update({
        status,
        resolution_details: resolution || null,
      })
      .eq('id', bug.id);
    if (error) {
      setMessage(error.message);
    } else {
      setMessage('Bug updated successfully.');
      // Create notification for reporter on status change
      if (status !== bug.status) {
        await supabase.from('notifications').insert({
          user_id: bug.reporter_id,
          bug_id: bug.id,
          message: `The status of your bug "${bug.title}" has changed to ${statusLabel[status as keyof typeof statusLabel]}.`,
          type: 'status_change',
        });
      }
      onBugUpdated?.();
    }
    setSaving(false);
  }

  async function handleAssign() {
    setSaving(true);
    setMessage(null);
    const { error } = await supabase
      .from('bugs')
      .update({ assignee_id: assigneeId || null })
      .eq('id', bug.id);
    if (error) {
      setMessage(error.message);
    } else {
      setMessage('Developer assigned successfully.');
      if (assigneeId && assigneeId !== bug.assignee_id) {
        await supabase.from('notifications').insert({
          user_id: assigneeId,
          bug_id: bug.id,
          message: `You have been assigned to bug "${bug.title}".`,
          type: 'assignment',
        });
      }
      onBugUpdated?.();
    }
    setSaving(false);
  }

  return (
    <div className="max-w-4xl mx-auto">
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-800 mb-4 transition"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to list
      </button>

      {/* Header */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 mb-6">
        <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
          <h1 className="text-xl font-bold text-slate-900">{bug.title}</h1>
          <span
            className={`px-3 py-1 rounded-full text-xs font-medium border ${statusStyles[bug.status]}`}
          >
            {statusLabel[bug.status]}
          </span>
        </div>
        <div className="flex flex-wrap gap-2 mb-4">
          <span className={`px-2.5 py-1 rounded-md text-xs font-medium border ${severityStyles[bug.severity]}`}>
            Severity: {severityLabel[bug.severity]}
          </span>
          <span className={`px-2.5 py-1 rounded-md text-xs font-medium border ${priorityStyles[bug.priority]}`}>
            Priority: {priorityLabel[bug.priority]}
          </span>
          <span className="px-2.5 py-1 rounded-md text-xs font-medium border bg-slate-100 text-slate-700 border-slate-200">
            {categoryLabel[bug.category]}
          </span>
        </div>
        <div className="text-sm text-slate-600 whitespace-pre-wrap bg-slate-50 rounded-xl p-4 border border-slate-100">
          {bug.description}
        </div>
        <div className="flex flex-wrap gap-x-6 gap-y-1 mt-4 text-xs text-slate-500">
          <span>Reported by: {reporter?.full_name || reporter?.email || 'Unknown'}</span>
          <span>Assigned to: {assignee?.full_name || assignee?.email || 'Unassigned'}</span>
          <span>Created: {formatDate(bug.created_at)}</span>
          <span>Updated: {formatDate(bug.updated_at)}</span>
        </div>
      </div>

      {/* AI Prediction */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-500">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <h2 className="text-base font-semibold text-slate-900">
            AI Prediction
          </h2>
        </div>
        {prediction ? (
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <div className="text-xs text-slate-500 mb-1">Predicted Category</div>
                <div className="text-sm font-medium text-slate-800">
                  {categoryLabel[prediction.predicted_category] || prediction.predicted_category}
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs text-slate-500 mb-1">Confidence</div>
                <div className="text-lg font-bold text-sky-600">
                  {prediction.confidence_score}%
                </div>
              </div>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-sky-500 to-cyan-400 rounded-full transition-all"
                style={{ width: `${prediction.confidence_score}%` }}
              />
            </div>
            <div>
              <div className="text-xs text-slate-500 mb-1">Probable Root Cause</div>
              <div className="text-sm text-slate-700 bg-slate-50 rounded-lg p-3 border border-slate-100">
                {prediction.probable_root_cause}
              </div>
            </div>
            <div className="text-xs text-slate-400">
              Model: {prediction.model_version}
            </div>
          </div>
        ) : (
          <div className="text-sm text-slate-400">No prediction available.</div>
        )}
      </div>

      {/* Attachments */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Paperclip className="w-4 h-4 text-slate-500" />
          <h2 className="text-base font-semibold text-slate-900">Attachments</h2>
        </div>
        {attachments.length === 0 ? (
          <div className="text-sm text-slate-400">No attachments.</div>
        ) : (
          <ul className="space-y-2">
            {attachments.map((a) => (
              <li
                key={a.id}
                className="flex items-center justify-between gap-3 p-3 rounded-lg bg-slate-50 border border-slate-100"
              >
                <div className="min-w-0">
                  <div className="text-sm font-medium text-slate-700 truncate">
                    {a.file_name}
                  </div>
                  <div className="text-xs text-slate-400">
                    {formatBytes(a.file_size)} · {formatDate(a.created_at)}
                  </div>
                </div>
                <a
                  href={`${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/${a.file_path}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-slate-400 hover:text-slate-700 transition"
                >
                  <Download className="w-4 h-4" />
                </a>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Developer controls */}
      {showDeveloperControls && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 mb-6">
          <h2 className="text-base font-semibold text-slate-900 mb-4">
            Update Status & Resolution
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as Bug['status'])}
                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
              >
                <option value="open">Open</option>
                <option value="in_progress">In Progress</option>
                <option value="resolved">Resolved</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Resolution Details
              </label>
              <textarea
                value={resolution}
                onChange={(e) => setResolution(e.target.value)}
                rows={4}
                placeholder="Describe how the bug was resolved..."
                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 resize-none"
              />
            </div>
            {message && (
              <div className="text-sm text-slate-600 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
                {message}
              </div>
            )}
            <button
              onClick={handleStatusUpdate}
              disabled={saving}
              className="px-4 py-2.5 bg-sky-600 text-white text-sm font-medium rounded-xl hover:bg-sky-700 transition disabled:opacity-60"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      )}

      {/* Admin controls */}
      {showAdminControls && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 mb-6">
          <h2 className="text-base font-semibold text-slate-900 mb-4">
            Assign Developer
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Developer
              </label>
              <select
                value={assigneeId}
                onChange={(e) => setAssigneeId(e.target.value)}
                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
              >
                <option value="">Unassigned</option>
                {developers.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.full_name || d.email}
                  </option>
                ))}
              </select>
            </div>
            {message && (
              <div className="text-sm text-slate-600 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
                {message}
              </div>
            )}
            <button
              onClick={handleAssign}
              disabled={saving}
              className="px-4 py-2.5 bg-sky-600 text-white text-sm font-medium rounded-xl hover:bg-sky-700 transition disabled:opacity-60"
            >
              {saving ? 'Saving...' : 'Assign Developer'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
