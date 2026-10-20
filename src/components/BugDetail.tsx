import { useEffect, useState } from 'react';
import {
  supabase,
  type Bug,
  type Attachment,
  type AIPrediction,
  type Profile,
  type BugInvestigation,
  type BugFix,
  type BugVerification,
} from '@/lib/supabase';
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
import {
  ArrowLeft,
  Paperclip,
  Sparkles,
  Download,
  Bot,
} from 'lucide-react';
import AIDebugAssistant from '@/components/AIDebugAssistant';
type Props = {
  bug: Bug;
  reporter?: Profile | null;
  assignee?: Profile | null;
  onBack: () => void;
  /** Show the developer controls */
  showDeveloperControls?: boolean;
  /** Show admin controls */
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
  const [prediction, setPrediction] =
    useState<AIPrediction | null>(null);
  const [attachments, setAttachments] =
    useState<Attachment[]>([]);
  const [showAIDebugAssistant, setShowAIDebugAssistant] =
    useState(false);
  const [investigation, setInvestigation] =
    useState<BugInvestigation | null>(null);
  // =========================================================
  // REPRODUCTION
  // =========================================================
  const [reproductionStatus, setReproductionStatus] =
    useState<BugInvestigation['reproduction_status']>(
      'not_attempted'
    );
  const [reproductionNotes, setReproductionNotes] =
    useState('');
  // =========================================================
  // INVESTIGATION
  // =========================================================
  const [investigationNotes, setInvestigationNotes] =
    useState('');
  const [suspectedFile, setSuspectedFile] =
    useState('');
  const [suspectedFunction, setSuspectedFunction] =
    useState('');
  const [suspectedLine, setSuspectedLine] =
    useState('');
  const [rootCause, setRootCause] =
    useState('');
  // =========================================================
  // FIX PROPOSAL
  // =========================================================
  const [fixDescription, setFixDescription] =
    useState('');
  const [originalCode, setOriginalCode] =
    useState('');
  const [modifiedCode, setModifiedCode] =
    useState('');
  const [patch, setPatch] =
    useState('');
  const [fixId, setFixId] =
    useState<string | null>(null);
  const [fix, setFix] = useState<BugFix | null>(null);
  const [testName, setTestName] = useState('');
  const [testCode, setTestCode] = useState('');
  const [testType, setTestType] =
    useState<'regression' | 'unit' | 'integration' | 'manual'>(
      'regression'
    );
  const [executionStatus, setExecutionStatus] =
    useState<'not_run' | 'passed' | 'failed' | 'error'>(
      'not_run'
    );
  const [testOutput, setTestOutput] = useState('');
  const [testId, setTestId] = useState<string | null>(null);
  const [reproductionResult, setReproductionResult] =
    useState<'not_checked' | 'passed' | 'failed'>(
      'not_checked'
    );
  const [regressionResult, setRegressionResult] =
    useState<'not_checked' | 'passed' | 'failed'>(
      'not_checked'
    );
  const [existingTestsResult, setExistingTestsResult] =
    useState<'not_checked' | 'passed' | 'failed'>(
      'not_checked'
    );
  const [verificationResult, setVerificationResult] =
    useState<'pending' | 'passed' | 'failed'>(
      'pending'
    );
  const [failureReason, setFailureReason] =
    useState('');
  const [verificationId, setVerificationId] =
    useState<string | null>(null);
  // =========================================================
  // EXISTING BUG CONTROLS
  // =========================================================
  const [status, setStatus] =
    useState(bug.status);
  const [resolution, setResolution] =
    useState(bug.resolution_details ?? '');
  const [assigneeId, setAssigneeId] =
    useState(bug.assignee_id ?? '');
  const [saving, setSaving] =
    useState(false);
  const [message, setMessage] =
    useState<string | null>(null);
  // =========================================================
  // SYNC BUG + INVESTIGATION DATA
  // =========================================================
  useEffect(() => {
    setStatus(bug.status);
    setResolution(bug.resolution_details ?? '');
    setAssigneeId(bug.assignee_id ?? '');
    setReproductionStatus(
      investigation?.reproduction_status ??
        'not_attempted'
    );
    setReproductionNotes(
      investigation?.reproduction_notes ?? ''
    );
    setInvestigationNotes(
      investigation?.investigation_notes ?? ''
    );
    setSuspectedFile(
      investigation?.suspected_file ?? ''
    );
    setSuspectedFunction(
      investigation?.suspected_function ?? ''
    );
    setSuspectedLine(
      investigation?.suspected_line?.toString() ?? ''
    );
    setRootCause(
      investigation?.root_cause ?? ''
    );
  }, [bug, investigation]);
  // =========================================================
  // LOAD DATA
  // =========================================================
  useEffect(() => {
  async function load() {
    const [
      pred,
      atts,
      inv,
      savedFix,
      savedTest,
      savedVerification,
    ] = await Promise.all([
        supabase
          .from('ai_predictions')
          .select('*')
          .eq('bug_id', bug.id)
          .maybeSingle(),
        supabase
          .from('attachments')
          .select('*')
          .eq('bug_id', bug.id),
        supabase
          .from('bug_investigations')
          .select('*')
          .eq('bug_id', bug.id)
          .maybeSingle(),
        supabase
          .from('bug_fixes')
          .select('*')
          .eq('bug_id', bug.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from('bug_tests')
          .select('*')
          .eq('bug_id', bug.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from('bug_verifications')
          .select('*')
          .eq('bug_id', bug.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);
    setPrediction(
      pred.data as AIPrediction | null
    );
    setAttachments(
      (atts.data as Attachment[]) ?? []
    );
    setInvestigation(
      inv.data as BugInvestigation | null
    );
    setFix(
      savedFix.data as BugFix | null
    );
    setFixId(
      savedFix.data?.id ?? null
    );
    if (savedFix.data) {
      setFixDescription(
        savedFix.data.description ?? ''
      );
      setOriginalCode(
        savedFix.data.original_code ?? ''
      );
      setModifiedCode(
        savedFix.data.modified_code ?? ''
      );
      setPatch(
        savedFix.data.patch ?? ''
      );
    }
    if (savedTest.data) {
      setTestId(savedTest.data.id);
      setTestName(savedTest.data.test_name ?? '');
      setTestCode(savedTest.data.test_code ?? '');
      setTestType(savedTest.data.test_type);
      setExecutionStatus(savedTest.data.execution_status);
      setTestOutput(savedTest.data.output ?? '');
    } else {
      setTestId(null);
      setTestName('');
      setTestCode('');
      setTestType('regression');
      setExecutionStatus('not_run');
      setTestOutput('');
    }

    if (savedVerification.data) {
      const verification =
        savedVerification.data as BugVerification;

      setVerificationId(verification.id);
      setReproductionResult(
        verification.reproduction_result
      );
      setRegressionResult(
        verification.regression_result
      );
      setExistingTestsResult(
        verification.existing_tests_result
      );
      setVerificationResult(
        verification.overall_result
      );
      setFailureReason(
        verification.failure_reason ?? ''
      );
    } else {
      setVerificationId(null);
      setReproductionResult('not_checked');
      setRegressionResult('not_checked');
      setExistingTestsResult('not_checked');
      setVerificationResult('pending');
      setFailureReason('');
    }
  }
  load();
}, [bug.id]);
  // =========================================================
  // SAVE REPRODUCTION RESULT
  // =========================================================
  async function handleReproductionSave() {
    if (!assignee?.id) {
      setMessage(
        'No developer is assigned to this bug.'
      );
      return;
    }
    setSaving(true);
    setMessage(null);
    const investigationData = {
      bug_id: bug.id,
      developer_id: assignee.id,
      reproduction_status: reproductionStatus,
      reproduction_notes:
        reproductionNotes || null,
    };
    const result = investigation
      ? await supabase
          .from('bug_investigations')
          .update(investigationData)
          .eq('id', investigation.id)
      : await supabase
          .from('bug_investigations')
          .insert(investigationData);
    if (result.error) {
      setMessage(result.error.message);
    } else {
      setMessage(
        'Reproduction details saved successfully.'
      );
      const { data } = await supabase
        .from('bug_investigations')
        .select('*')
        .eq('bug_id', bug.id)
        .maybeSingle();
      setInvestigation(
        data as BugInvestigation | null
      );
    }
    setSaving(false);
  }
  // =========================================================
  // SAVE ENGINEERING INVESTIGATION
  // =========================================================
  async function handleInvestigationSave() {
    if (!assignee?.id) {
      setMessage(
        'No developer is assigned to this bug.'
      );
      return;
    }
    setSaving(true);
    setMessage(null);
    const investigationData = {
      bug_id: bug.id,
      developer_id: assignee.id,
      reproduction_status:
        reproductionStatus,
      reproduction_notes:
        reproductionNotes || null,
      investigation_notes:
        investigationNotes || null,
      suspected_file:
        suspectedFile || null,
      suspected_function:
        suspectedFunction || null,
      suspected_line:
        suspectedLine
          ? Number(suspectedLine)
          : null,
      root_cause:
        rootCause || null,
    };
    const result = investigation
      ? await supabase
          .from('bug_investigations')
          .update(investigationData)
          .eq('id', investigation.id)
      : await supabase
          .from('bug_investigations')
          .insert(investigationData);
    if (result.error) {
      setMessage(result.error.message);
    } else {
      setMessage(
        'Investigation details saved successfully.'
      );
      const { data } = await supabase
        .from('bug_investigations')
        .select('*')
        .eq('bug_id', bug.id)
        .maybeSingle();
      setInvestigation(
        data as BugInvestigation | null
      );
    }
    setSaving(false);
  }
  // =========================================================
  // SAVE FIX PROPOSAL
  // =========================================================
  async function handleFixSave() {
    if (!assignee?.id) {
      setMessage(
        'No developer is assigned to this bug.'
      );
      return;
    }
    setSaving(true);
    setMessage(null);
    const fixData = {
      bug_id: bug.id,
      developer_id: assignee.id,
      description: fixDescription || null,
      original_code: originalCode || null,
      modified_code: modifiedCode || null,
      patch: patch || null,
      status: 'proposed' as const,
    };
    const result = fixId
      ? await supabase
          .from('bug_fixes')
          .update(fixData)
          .eq('id', fixId)
      : await supabase
          .from('bug_fixes')
          .insert(fixData)
          .select()
          .single();
    if (result.error) {
      setMessage(result.error.message);
    } else {
      setMessage(
        'Fix proposal saved successfully.'
      );
      if (result.data) {
        setFixId(result.data.id);
      }
    }
    setSaving(false);
  }
  async function handleTestSave() {
  if (!assignee?.id) {
    setMessage('No developer is assigned to this bug.');
    return;
  }
  if (!testName.trim()) {
    setMessage('Please enter a test name.');
    return;
  }
  setSaving(true);
  setMessage(null);
  const testData = {
    bug_id: bug.id,
    developer_id: assignee.id,
    test_name: testName.trim(),
    test_code: testCode || null,
    test_type: testType,
    execution_status: executionStatus,
    output: testOutput || null,
  };
  const result = testId
    ? await supabase
        .from('bug_tests')
        .update(testData)
        .eq('id', testId)
        .select()
        .single()
    : await supabase
        .from('bug_tests')
        .insert(testData)
        .select()
        .single();
  if (result.error) {
    setMessage(result.error.message);
  } else {
    setMessage('Test result saved successfully.');
    if (result.data) {
      setTestId(result.data.id);
    }
  }
  setSaving(false);
}
  // =========================================================
  // UPDATE STATUS + RESOLUTION
  // =========================================================
  async function handleVerificationSave() {
  if (!assignee?.id) {
    setMessage('No developer is assigned to this bug.');
    return;
  }
  if (!fixId) {
    setMessage('Please save a fix proposal before verification.');
    return;
  }
  const overallResult =
    reproductionResult === 'passed' &&
    regressionResult === 'passed' &&
    existingTestsResult === 'passed'
      ? 'passed'
      : reproductionResult === 'failed' ||
        regressionResult === 'failed' ||
        existingTestsResult === 'failed'
      ? 'failed'
      : 'pending';
  setSaving(true);
  setMessage(null);
  const verificationData = {
    bug_id: bug.id,
    fix_id: fixId,
    developer_id: assignee.id,
    reproduction_result: reproductionResult,
    regression_result: regressionResult,
    existing_tests_result: existingTestsResult,
    overall_result: overallResult,
    failure_reason:
      overallResult === 'failed'
        ? failureReason || null
        : null,
    verified_at:
      overallResult === 'pending'
        ? null
        : new Date().toISOString(),
  };
  const result = verificationId
    ? await supabase
        .from('bug_verifications')
        .update(verificationData)
        .eq('id', verificationId)
    : await supabase
        .from('bug_verifications')
        .insert(verificationData)
        .select()
        .single();
  if (result.error) {
    setMessage(result.error.message);
  } else {
    setVerificationResult(overallResult);
    if (result.data) {
      setVerificationId(result.data.id);
    }
    setMessage(
      overallResult === 'passed'
        ? 'Fix verification passed successfully.'
        : overallResult === 'failed'
        ? 'Fix verification failed.'
        : 'Verification saved as pending.'
    );
  }
  setSaving(false);
}
  async function handleStatusUpdate() {
    if (
      status === 'resolved' &&
      verificationResult !== 'passed'
    ) {
      setMessage(
        'The bug cannot be resolved until the fix verification passes.'
      );
      return;
    }

    setSaving(true);
    setMessage(null);
    const { error } = await supabase
      .from('bugs')
      .update({
        status,
        resolution_details:
          resolution || null,
      })
      .eq('id', bug.id);
    if (error) {
      setMessage(error.message);
    } else {
      setMessage(
        'Bug updated successfully.'
      );
      if (status !== bug.status) {
        await supabase
          .from('notifications')
          .insert({
            user_id: bug.reporter_id,
            bug_id: bug.id,
            message: `The status of your bug "${bug.title}" has changed to ${
              statusLabel[
                status as keyof typeof statusLabel
              ]
            }.`,
            type: 'status_change',
          });
      }
      onBugUpdated?.();
    }
    setSaving(false);
  }
  // =========================================================
  // ASSIGN DEVELOPER
  // =========================================================
  async function handleAssign() {
    setSaving(true);
    setMessage(null);
    const { error } = await supabase
      .from('bugs')
      .update({
        assignee_id:
          assigneeId || null,
      })
      .eq('id', bug.id);
    if (error) {
      setMessage(error.message);
    } else {
      setMessage(
        'Developer assigned successfully.'
      );
      if (
        assigneeId &&
        assigneeId !== bug.assignee_id
      ) {
        await supabase
          .from('notifications')
          .insert({
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
  // =========================================================
  // UI
  // =========================================================
  return (
    <div className="max-w-4xl mx-auto">
      {/* Back button */}
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-800 mb-4 transition"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to list
      </button>
      {/* =====================================================
          BUG HEADER
      ===================================================== */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 mb-6">
        <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
          <h1 className="text-xl font-bold text-slate-900">
            {bug.title}
          </h1>
          <span
            className={`px-3 py-1 rounded-full text-xs font-medium border ${
              statusStyles[bug.status]
            }`}
          >
            {statusLabel[bug.status]}
          </span>
        </div>
        <div className="flex flex-wrap gap-2 mb-4">
          <span
            className={`px-2.5 py-1 rounded-md text-xs font-medium border ${
              severityStyles[bug.severity]
            }`}
          >
            Severity: {severityLabel[bug.severity]}
          </span>
          <span
            className={`px-2.5 py-1 rounded-md text-xs font-medium border ${
              priorityStyles[bug.priority]
            }`}
          >
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
          <span>
            Reported by:{' '}
            {reporter?.full_name ||
              reporter?.email ||
              'Unknown'}
          </span>
          <span>
            Assigned to:{' '}
            {assignee?.full_name ||
              assignee?.email ||
              'Unassigned'}
          </span>
          <span>
            Created: {formatDate(bug.created_at)}
          </span>
          <span>
            Updated: {formatDate(bug.updated_at)}
          </span>
        </div>
      </div>
      {/* =====================================================
          AI PREDICTION
      ===================================================== */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-500">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <div className="flex-1">
            <h2 className="text-base font-semibold text-slate-900">
              AI Prediction
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Initial automated bug classification
            </p>
          </div>
          {showDeveloperControls && (
            <button
              type="button"
              onClick={() => setShowAIDebugAssistant(true)}
              className="inline-flex items-center gap-2 px-3 py-2 bg-violet-600 text-white text-xs font-medium rounded-lg hover:bg-violet-700 transition"
            >
              <Bot className="w-4 h-4" />
              Ask AI Developer Assistant
            </button>
          )}
        </div>
        {prediction ? (
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <div className="text-xs text-slate-500 mb-1">
                  Predicted Category
                </div>
                <div className="text-sm font-medium text-slate-800">
                  {categoryLabel[
                    prediction.predicted_category
                  ] ||
                    prediction.predicted_category}
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs text-slate-500 mb-1">
                  Confidence
                </div>
                <div className="text-lg font-bold text-sky-600">
                  {prediction.confidence_score}%
                </div>
              </div>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-sky-500 to-cyan-400 rounded-full transition-all"
                style={{
                  width: `${prediction.confidence_score}%`,
                }}
              />
            </div>
            <div>
              <div className="text-xs text-slate-500 mb-1">
                Probable Root Cause
              </div>
              <div className="text-sm text-slate-700 bg-slate-50 rounded-lg p-3 border border-slate-100">
                {prediction.probable_root_cause}
              </div>
            </div>
            <div className="text-xs text-slate-400">
              Model: {prediction.model_version}
            </div>
          </div>
        ) : (
          <div className="text-sm text-slate-400">
            No prediction available.
          </div>
        )}
      </div>
      {showAIDebugAssistant && showDeveloperControls && (
        <AIDebugAssistant
          bug={bug}
          existingPrediction={prediction}
          onClose={() => setShowAIDebugAssistant(false)}
        />
      )}
      {/* =====================================================
          ENGINEERING INVESTIGATION
      ===================================================== */}
      {showDeveloperControls && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-slate-900">
              Engineering Investigation
            </h2>
            <span className="text-xs px-2.5 py-1 rounded-full bg-slate-100 text-slate-600">
              {investigation?.reproduction_status ??
                'Not Started'}
            </span>
          </div>
          {/* -------------------------------------------------
              REPRODUCTION
          ------------------------------------------------- */}
          <div className="space-y-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Reproduction Status
              </label>
              <select
                value={reproductionStatus}
                onChange={(e) =>
                  setReproductionStatus(
                    e.target.value as BugInvestigation['reproduction_status']
                  )
                }
                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
              >
                <option value="not_attempted">
                  Not Attempted
                </option>
                <option value="reproduced">
                  Reproduced
                </option>
                <option value="not_reproduced">
                  Not Reproduced
                </option>
                <option value="blocked">
                  Blocked
                </option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Reproduction Notes
              </label>
              <textarea
                value={reproductionNotes}
                onChange={(e) =>
                  setReproductionNotes(
                    e.target.value
                  )
                }
                rows={2}
                placeholder="Describe how you reproduced the bug, what happened, or why reproduction was blocked..."
                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 resize-none"
              />
            </div>
            <button
              onClick={handleReproductionSave}
              disabled={saving}
              className="px-4 py-2.5 bg-sky-600 text-white text-sm font-medium rounded-xl hover:bg-sky-700 transition disabled:opacity-60"
            >
              {saving
                ? 'Saving...'
                : 'Save Reproduction Result'}
            </button>
          </div>
          {/* -------------------------------------------------
              INVESTIGATION
          ------------------------------------------------- */}
          <div className="space-y-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Investigation Notes
              </label>
              <textarea
                value={investigationNotes}
                onChange={(e) =>
                  setInvestigationNotes(
                    e.target.value
                  )
                }
                rows={4}
                placeholder="Describe what you investigated, what you checked, and what you found..."
                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 resize-none"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Suspected File
                </label>
                <input
                  type="text"
                  value={suspectedFile}
                  onChange={(e) =>
                    setSuspectedFile(
                      e.target.value
                    )
                  }
                  placeholder="e.g. OrderConfirmation.tsx"
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Suspected Function
                </label>
                <input
                  type="text"
                  value={suspectedFunction}
                  onChange={(e) =>
                    setSuspectedFunction(
                      e.target.value
                    )
                  }
                  placeholder="e.g. renderOrderSummary"
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Suspected Line
                </label>
                <input
                  type="number"
                  value={suspectedLine}
                  onChange={(e) =>
                    setSuspectedLine(
                      e.target.value
                    )
                  }
                  placeholder="e.g. 142"
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Root Cause
              </label>
              <textarea
                value={rootCause}
                onChange={(e) =>
                  setRootCause(
                    e.target.value
                  )
                }
                rows={4}
                placeholder="Describe the technical root cause of the bug..."
                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 resize-none"
              />
            </div>
            <button
              onClick={handleInvestigationSave}
              disabled={saving}
              className="px-4 py-2.5 bg-sky-600 text-white text-sm font-medium rounded-xl hover:bg-sky-700 transition disabled:opacity-60"
            >
              {saving
                ? 'Saving...'
                : 'Save Investigation'}
            </button>
          </div>
          {/* -------------------------------------------------
              SAVED INVESTIGATION
          ------------------------------------------------- */}
          {investigation ? (
            <div className="space-y-4">
              <div>
                <p className="text-xs font-medium text-slate-500 mb-1">
                  Reproduction Notes
                </p>
                <p className="text-sm text-slate-700">
                  {investigation.reproduction_notes ||
                    'No reproduction notes yet.'}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500 mb-1">
                  Investigation Notes
                </p>
                <p className="text-sm text-slate-700">
                  {investigation.investigation_notes ||
                    'No investigation notes yet.'}
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-xs font-medium text-slate-500 mb-1">
                    Suspected File
                  </p>
                  <p className="text-sm text-slate-700">
                    {investigation.suspected_file ||
                      'Not identified'}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-500 mb-1">
                    Suspected Function
                  </p>
                  <p className="text-sm text-slate-700">
                    {investigation.suspected_function ||
                      'Not identified'}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-500 mb-1">
                    Suspected Line
                  </p>
                  <p className="text-sm text-slate-700">
                    {investigation.suspected_line ??
                      'Not identified'}
                  </p>
                </div>
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500 mb-1">
                  Root Cause
                </p>
                <p className="text-sm text-slate-700">
                  {investigation.root_cause ||
                    'Not identified yet.'}
                </p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-slate-500">
              No investigation has been started yet.
            </p>
          )}
        </div>
      )}
            {/* =====================================================
          FIX PROPOSAL
      ===================================================== */}
      {showDeveloperControls && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-slate-900">
              Fix Proposal
            </h2>
            <span className="text-xs px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-100">
              Proposed
            </span>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Fix Description
              </label>
              <textarea
                value={fixDescription}
                onChange={(e) =>
                  setFixDescription(e.target.value)
                }
                rows={4}
                placeholder="Describe what you are changing to fix the bug..."
                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 resize-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Original Code
              </label>
              <textarea
                value={originalCode}
                onChange={(e) =>
                  setOriginalCode(e.target.value)
                }
                rows={4}
                placeholder="Paste the relevant buggy code here..."
                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm font-mono focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 resize-y"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Modified Code
              </label>
              <textarea
                value={modifiedCode}
                onChange={(e) =>
                  setModifiedCode(e.target.value)
                }
                rows={4}
                placeholder="Paste the proposed corrected code here..."
                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm font-mono focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 resize-y"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Patch / Diff
              </label>
              <textarea
                value={patch}
                onChange={(e) =>
                  setPatch(e.target.value)
                }
                rows={4}
                placeholder="Paste a unified diff / patch showing the changes..."
                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm font-mono focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 resize-y"
              />
            </div>
            {message && (
              <div className="text-sm text-slate-600 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
                {message}
              </div>
            )}
            <button
              onClick={handleFixSave}
              disabled={saving}
              className="px-4 py-2.5 bg-sky-600 text-white text-sm font-medium rounded-xl hover:bg-sky-700 transition disabled:opacity-60"
            >
              {saving ? 'Saving...' : 'Save Fix Proposal'}
            </button>
          </div>
        </div>
      )}
      {/* =====================================================
    TESTING & REGRESSION
\\===================================================== */}
{showDeveloperControls && (
  <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 mb-6">
    <div className="flex items-center justify-between mb-4">
      <h2 className="text-base font-semibold text-slate-900">
        Testing & Regression
      </h2>
      <span className="text-xs px-2.5 py-1 rounded-full bg-slate-100 text-slate-600">
        {executionStatus === 'not_run'
          ? 'Not Run'
          : executionStatus}
      </span>
    </div>
    <div className="space-y-4">
      {/* Test Name */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1.5">
          Test Name
        </label>
        <input
          type="text"
          value={testName}
          onChange={(e) => setTestName(e.target.value)}
          placeholder="e.g. Order confirmation address regression test"
          className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
        />
      </div>
      {/* Test Type */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1.5">
          Test Type
        </label>
        <select
          value={testType}
          onChange={(e) =>
            setTestType(
              e.target.value as
                | 'regression'
                | 'unit'
                | 'integration'
                | 'manual'
            )
          }
          className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
        >
          <option value="regression">
            Regression
          </option>
          <option value="unit">
            Unit
          </option>
          <option value="integration">
            Integration
          </option>
          <option value="manual">
            Manual
          </option>
        </select>
      </div>
      {/* Test Code / Steps */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1.5">
          Test Code / Steps
        </label>
        <textarea
          value={testCode}
          onChange={(e) => setTestCode(e.target.value)}
          rows={4}
          placeholder="Enter the test code or describe the steps used to verify the fix..."
          className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm font-mono focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 resize-y"
        />
      </div>
      {/* Execution Status */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1.5">
          Execution Status
        </label>
        <select
          value={executionStatus}
          onChange={(e) =>
            setExecutionStatus(
              e.target.value as
                | 'not_run'
                | 'passed'
                | 'failed'
                | 'error'
            )
          }
          className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
        >
          <option value="not_run">
            Not Run
          </option>
          <option value="passed">
            Passed
          </option>
          <option value="failed">
            Failed
          </option>
          <option value="error">
            Error
          </option>
        </select>
      </div>
      {/* Test Output */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1.5">
          Test Output
        </label>
        <textarea
          value={testOutput}
          onChange={(e) => setTestOutput(e.target.value)}
          rows={3}
          placeholder="Enter the test result, console output, or verification notes..."
          className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm font-mono focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 resize-y"
        />
      </div>
      {message && (
        <div className="text-sm text-slate-600 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
          {message}
        </div>
      )}
      <button
        onClick={handleTestSave}
        disabled={saving}
        className="px-4 py-2.5 bg-sky-600 text-white text-sm font-medium rounded-xl hover:bg-sky-700 transition disabled:opacity-60"
      >
        {saving ? 'Saving...' : 'Save Test Result'}
      </button>
    </div>
  </div>
)}
{/* =====================================================
    FIX VERIFICATION
\\===================================================== */}
{showDeveloperControls && (
  <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 mb-6">
    <div className="flex items-center justify-between mb-4">
      <h2 className="text-base font-semibold text-slate-900">
        Fix Verification
      </h2>
      <span
        className={`text-xs px-2.5 py-1 rounded-full ${
          verificationResult === 'passed'
            ? 'bg-emerald-50 text-emerald-700'
            : verificationResult === 'failed'
            ? 'bg-red-50 text-red-700'
            : 'bg-slate-100 text-slate-600'
        }`}
      >
        {verificationResult === 'passed'
          ? 'Passed'
          : verificationResult === 'failed'
          ? 'Failed'
          : 'Pending'}
      </span>
    </div>
    <div className="space-y-4">
      {/* Original Bug Reproduction */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1.5">
          Original Bug Reproduction
        </label>
        <select
          value={reproductionResult}
          onChange={(e) =>
            setReproductionResult(
              e.target.value as
                | 'not_checked'
                | 'passed'
                | 'failed'
            )
          }
          className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
        >
          <option value="not_checked">
            Not Checked
          </option>
          <option value="passed">
            Passed
          </option>
          <option value="failed">
            Failed
          </option>
        </select>
      </div>
      {/* Regression Tests */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1.5">
          Regression Tests
        </label>
        <select
          value={regressionResult}
          onChange={(e) =>
            setRegressionResult(
              e.target.value as
                | 'not_checked'
                | 'passed'
                | 'failed'
            )
          }
          className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
        >
          <option value="not_checked">
            Not Checked
          </option>
          <option value="passed">
            Passed
          </option>
          <option value="failed">
            Failed
          </option>
        </select>
      </div>
      {/* Existing Tests */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1.5">
          Existing Tests
        </label>
        <select
          value={existingTestsResult}
          onChange={(e) =>
            setExistingTestsResult(
              e.target.value as
                | 'not_checked'
                | 'passed'
                | 'failed'
            )
          }
          className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
        >
          <option value="not_checked">
            Not Checked
          </option>
          <option value="passed">
            Passed
          </option>
          <option value="failed">
            Failed
          </option>
        </select>
      </div>
      {/* Failure Reason */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1.5">
          Verification Notes / Failure Reason
        </label>
        <textarea
          value={failureReason}
          onChange={(e) =>
            setFailureReason(e.target.value)
          }
          rows={3}
          placeholder="Add verification notes or explain why verification failed..."
          className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 resize-y"
        />
      </div>
      {message && (
        <div className="text-sm text-slate-600 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
          {message}
        </div>
      )}
      <button
        onClick={handleVerificationSave}
        disabled={saving}
        className="px-4 py-2.5 bg-sky-600 text-white text-sm font-medium rounded-xl hover:bg-sky-700 transition disabled:opacity-60"
      >
        {saving
          ? 'Verifying...'
          : 'Verify Fix'}
      </button>
    </div>
  </div>
)}
{/* =====================================================
          ATTACHMENTS
      ===================================================== */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Paperclip className="w-4 h-4 text-slate-500" />
          <h2 className="text-base font-semibold text-slate-900">
            Attachments
          </h2>
        </div>
        {attachments.length === 0 ? (
          <div className="text-sm text-slate-400">
            No attachments.
          </div>
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
                    {formatBytes(a.file_size)} ·{' '}
                    {formatDate(a.created_at)}
                  </div>
                </div>
                <a
                  href={`${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/${a.file_path}`}
                  target="\_blank"
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
      {/* =====================================================
          DEVELOPER STATUS / RESOLUTION
      ===================================================== */}
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
                onChange={(e) =>
                  setStatus(
                    e.target.value as Bug['status']
                  )
                }
                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
              >
                <option value="open">
                  Open
                </option>
                <option value="in_progress">
                  In Progress
                </option>
                <option
                  value="resolved"
                  disabled={verificationResult !== 'passed'}
                >
                  Resolved
                  {verificationResult !== 'passed'
                    ? ' — Verification Required'
                    : ''}
                </option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Resolution Details
              </label>
              <textarea
                value={resolution}
                onChange={(e) =>
                  setResolution(
                    e.target.value
                  )
                }
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
              {saving
                ? 'Saving...'
                : 'Save Changes'}
            </button>
          </div>
        </div>
      )}
      {/* =====================================================
          ADMIN ASSIGNMENT
      ===================================================== */}
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
                onChange={(e) =>
                  setAssigneeId(
                    e.target.value
                  )
                }
                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
              >
                <option value="">
                  Unassigned
                </option>
                {developers.map((d) => (
                  <option
                    key={d.id}
                    value={d.id}
                  >
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
              {saving
                ? 'Saving...'
                : 'Assign Developer'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
