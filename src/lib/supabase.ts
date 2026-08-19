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
