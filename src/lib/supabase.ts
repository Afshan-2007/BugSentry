import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  detectSessionInUrl: true,
  flowType: 'implicit',
  },
});

export type Role = 'reporter' | 'developer' | 'administrator';

export type Profile = {
  id: string;
  email: string;
  full_name: string;
  role: Role;
  created_at: string;
};

export type BugStatus = 'open' | 'in_progress' | 'resolved';
export type Severity = 'low' | 'medium' | 'high' | 'critical';
export type Priority = 'low' | 'normal' | 'high' | 'urgent';
export type BugCategory =
  | 'ui'
  | 'backend'
  | 'database'
  | 'network'
  | 'security'
  | 'performance'
  | 'api'
  | 'other';

export type Bug = {
  id: string;
  title: string;
  description: string;
  severity: Severity;
  priority: Priority;
  category: BugCategory;
  status: BugStatus;
  reporter_id: string;
  assignee_id: string | null;
  resolution_details: string | null;
  created_at: string;
  updated_at: string;
  expected_behavior: string | null;
  actual_behavior: string | null;
  reproduction_steps: string | null;
  environment_details: string | null;
  stack_trace: string | null;
};
export type BugInvestigation = {
  id: string;
  bug_id: string;
  developer_id: string;
  reproduction_status:
    | 'not_attempted'
    | 'reproduced'
    | 'not_reproduced'
    | 'blocked';
  reproduction_notes: string | null;
  investigation_notes: string | null;
  suspected_file: string | null;
  suspected_function: string | null;
  suspected_line: number | null;
  root_cause: string | null;
  ai_reasoning: string | null;
  ai_confidence: number | null;
  created_at: string;
  updated_at: string;
};
export type BugFix = {
  id: string;
  bug_id: string;
  developer_id: string;
  description: string | null;
  original_code: string | null;
  modified_code: string | null;
  patch: string | null;
  status: 'proposed' | 'accepted' | 'rejected';
  created_at: string;
  updated_at: string;
};
export type BugTest = {
  id: string;
  bug_id: string;
  developer_id: string;
  test_name: string;
  test_code: string | null;
  test_type: 'regression' | 'unit' | 'integration' | 'manual';
  execution_status: 'not_run' | 'passed' | 'failed' | 'error';
  output: string | null;
  created_at: string;
  updated_at: string;
};
export type BugVerification = {
  id: string;
  bug_id: string;
  fix_id: string;
  developer_id: string;
  reproduction_result: 'not_checked' | 'passed' | 'failed';
  regression_result: 'not_checked' | 'passed' | 'failed';
  existing_tests_result: 'not_checked' | 'passed' | 'failed';
  overall_result: 'pending' | 'passed' | 'failed';
  failure_reason: string | null;
  verified_at: string | null;
  created_at: string;
};
export type BugActivity = {
  id: string;
  bug_id: string;
  user_id: string;
  action: string;
  details: string | null;
  created_at: string;
};
export type Attachment = {
  id: string;
  bug_id: string;
  file_name: string;
  file_path: string;
  file_size: number;
  file_type: string;
  uploaded_by: string;
  created_at: string;
};

export type AIPrediction = {
  id: string;
  bug_id: string;
  predicted_category: string;
  probable_root_cause: string;
  confidence_score: number;
  model_version: string;
  created_at: string;
};

export type Notification = {
  id: string;
  user_id: string;
  bug_id: string | null;
  message: string;
  type: 'status_change' | 'assignment' | 'general';
  is_read: boolean;
  created_at: string;
};
