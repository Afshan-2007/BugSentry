import { AuthProvider, useAuth } from '@/context/AuthContext';
import AuthPage from '@/pages/AuthPage';
import ReporterDashboard from '@/pages/ReporterDashboard';
import DeveloperDashboard from '@/pages/DeveloperDashboard';
import AdministratorDashboard from '@/pages/AdministratorDashboard';
import { Bug } from 'lucide-react';

function AppContent() {
  const { user, profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-sky-500 to-cyan-400 animate-pulse">
            <Bug className="w-7 h-7 text-white" />
          </div>
          <p className="text-slate-400 text-sm">Loading BugSentry AI...</p>
        </div>
      </div>
    );
  }

  if (!user || !profile) {
    return <AuthPage />;
  }

  switch (profile.role) {
    case 'reporter':
      return <ReporterDashboard />;
    case 'developer':
      return <DeveloperDashboard />;
    case 'administrator':
      return <AdministratorDashboard />;
    default:
      return <AuthPage />;
  }
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
