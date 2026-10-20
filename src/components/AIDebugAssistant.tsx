import { useState } from 'react';
import { X, Sparkles, Loader2, Lightbulb, Wrench, TestTube2 } from 'lucide-react';
import type { Bug } from '@/lib/supabase';
import {
  analyzeBugWithOllama,
  type AIDebugAnalysis,
} from '@/lib/ollama';

type Props = {
  bug: Bug;
  existingPrediction?: {
    predicted_category?: string;
    probable_root_cause?: string;
    confidence_score?: number;
  } | null;
  onClose: () => void;
};

export default function AIDebugAssistant({
  bug,
  existingPrediction,
  onClose,
}: Props) {
  const [analysis, setAnalysis] = useState<AIDebugAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAnalyze() {
    setLoading(true);
    setError(null);

    try {
      const result = await analyzeBugWithOllama(
        bug,
        existingPrediction
      );

      setAnalysis(result);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to analyze the bug.'
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <button
        type="button"
        aria-label="Close AI assistant"
        onClick={onClose}
        className="absolute inset-0 bg-slate-900/30 backdrop-blur-[1px]"
      />

      {/* Assistant panel */}
      <div className="relative w-full max-w-xl h-full bg-white shadow-2xl overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>

            <div>
              <h2 className="font-semibold text-slate-900">
                AI Developer Assistant
              </h2>

              <p className="text-xs text-slate-500">
                Powered by local Ollama
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          {/* Bug being analyzed */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mb-6">
            <div className="text-xs font-medium text-slate-500 mb-1">
              BUG BEING ANALYZED
            </div>

            <div className="text-sm font-semibold text-slate-900">
              {bug.title}
            </div>

            <div className="text-xs text-slate-500 mt-2 line-clamp-3">
              {bug.description}
            </div>
          </div>

          {/* Initial state */}
          {!analysis && !loading && !error && (
            <div className="text-center py-10">
              <div className="w-14 h-14 rounded-2xl bg-violet-50 flex items-center justify-center mx-auto mb-4">
                <Sparkles className="w-7 h-7 text-violet-500" />
              </div>

              <h3 className="text-base font-semibold text-slate-900 mb-2">
                Need help investigating this bug?
              </h3>

              <p className="text-sm text-slate-500 max-w-sm mx-auto mb-6">
                Ollama will analyze the bug details and provide
                possible root causes, investigation steps, a
                suggested fix, and a regression test.
              </p>

              <button
                type="button"
                onClick={handleAnalyze}
                className="px-5 py-2.5 bg-violet-600 text-white text-sm font-medium rounded-xl hover:bg-violet-700 transition"
              >
                Analyze Bug
              </button>
            </div>
          )}

          {/* Loading */}
          {loading && (
            <div className="text-center py-14">
              <Loader2 className="w-8 h-8 text-violet-500 animate-spin mx-auto mb-4" />

              <h3 className="text-sm font-semibold text-slate-800">
                Analyzing bug...
              </h3>

              <p className="text-xs text-slate-500 mt-1">
                Ollama is reviewing the available bug information.
              </p>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="space-y-4">
              <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                <div className="text-sm font-medium text-red-800 mb-1">
                  AI analysis failed
                </div>

                <div className="text-xs text-red-600 break-words">
                  {error}
                </div>
              </div>

              <button
                type="button"
                onClick={handleAnalyze}
                className="px-4 py-2 bg-slate-900 text-white text-sm font-medium rounded-lg hover:bg-slate-800 transition"
              >
                Try Again
              </button>
            </div>
          )}

          {/* Analysis */}
          {analysis && !loading && (
            <div className="space-y-5">
              {/* Summary */}
              <Section title="Analysis Summary">
                <p className="text-sm text-slate-700 leading-6">
                  {analysis.summary}
                </p>
              </Section>

              {/* Root cause */}
              <Section
                title="Likely Root Cause"
                icon={<Lightbulb className="w-4 h-4" />}
              >
                <div className="text-sm text-slate-700 leading-6">
                  {analysis.likely_root_cause}
                </div>
              </Section>

              {/* Investigation steps */}
              <Section title="Investigation Steps">
                <ol className="space-y-2">
                  {analysis.investigation_steps.map((step, index) => (
                    <li
                      key={index}
                      className="flex gap-3 text-sm text-slate-700"
                    >
                      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-violet-50 text-violet-600 text-xs font-semibold flex items-center justify-center">
                        {index + 1}
                      </span>

                      <span className="pt-0.5 leading-5">
                        {step}
                      </span>
                    </li>
                  ))}
                </ol>
              </Section>

              {/* Suspected location */}
              <Section title="Suspected Code Location">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <InfoBox
                    label="File"
                    value={analysis.suspected_file}
                  />

                  <InfoBox
                    label="Function"
                    value={analysis.suspected_function}
                  />
                </div>
              </Section>

              {/* Suggested fix */}
              <Section
                title="Suggested Fix"
                icon={<Wrench className="w-4 h-4" />}
              >
                <div className="text-sm text-slate-700 leading-6">
                  {analysis.suggested_fix}
                </div>
              </Section>

              {/* Regression test */}
              <Section
                title="Suggested Regression Test"
                icon={<TestTube2 className="w-4 h-4" />}
              >
                <div className="text-sm text-slate-700 leading-6">
                  {analysis.regression_test}
                </div>
              </Section>

              {/* Confidence */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-slate-500">
                    AI Confidence
                  </span>

                  <span className="text-sm font-bold text-violet-600">
                    {analysis.confidence}%
                  </span>
                </div>

                <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-violet-500 to-fuchsia-500 rounded-full"
                    style={{
                      width: `${Math.min(
                        100,
                        Math.max(0, analysis.confidence)
                      )}%`,
                    }}
                  />
                </div>
              </div>

              {/* Re-analyze */}
              <button
                type="button"
                onClick={handleAnalyze}
                className="w-full px-4 py-2.5 border border-slate-200 text-slate-700 text-sm font-medium rounded-xl hover:bg-slate-50 transition"
              >
                Analyze Again
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Section({
  title,
  icon,
  children,
}: {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden">
      <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center gap-2">
        {icon && (
          <span className="text-violet-500">
            {icon}
          </span>
        )}

        <h3 className="text-sm font-semibold text-slate-800">
          {title}
        </h3>
      </div>

      <div className="p-4">
        {children}
      </div>
    </div>
  );
}

function InfoBox({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
      <div className="text-xs text-slate-500 mb-1">
        {label}
      </div>

      <div className="text-sm font-medium text-slate-700 break-words">
        {value}
      </div>
    </div>
  );
}