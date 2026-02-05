
import React, { useState } from 'react';
import { HashRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import CommandCenter from './pages/CommandCenter';
import IncidentForm from './pages/IncidentForm';
import UserManagement from './pages/UserManagement';
import AuditLogs from './pages/AuditLogs';
import ResourceTracking from './pages/ResourceTracking';
import ResourceForm from './pages/ResourceForm';
import Settings from './pages/Settings';
import Login from './pages/Login';
import ResolvedCases from './pages/ResolvedCases';
import RestrictedPersons from './pages/RestrictedPersons';
import CCTVRequestForm from './pages/CCTVRequestForm';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { LanguageProvider } from './contexts/LanguageContext';
import { ToastProvider, useToast } from './contexts/ToastContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { supabaseService } from './services/supabaseService';
import { Lock, Save } from 'lucide-react';

const ProtectedRoute: React.FC<{ children: React.ReactNode, requiredRole?: 'supervisor' }> = ({ children, requiredRole }) => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
      return <div className="h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-white"></div></div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (requiredRole && user.role !== requiredRole) {
      return <Navigate to="/" replace />; // Unauthorized redirect to dashboard
  }

  return <>{children}</>;
};

// Component for Update Password Page
const UpdatePasswordPage: React.FC = () => {
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const { showToast } = useToast();
    const navigate = useNavigate();

    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await supabaseService.updatePassword(password);
            showToast("Password updated successfully", "success");
            navigate('/');
        } catch (error: any) {
            showToast(error.message, "error");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4">
             <div className="w-full max-w-md bg-white dark:bg-slate-800 rounded-[2rem] p-8 shadow-2xl">
                 <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6 flex items-center justify-center">
                     <Lock className="mr-2" />
                     New Password
                 </h2>
                 <form onSubmit={handleUpdate} className="space-y-4">
                     <div>
                         <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-2">Enter New Password</label>
                         <input 
                            type="password"
                            required
                            minLength={8}
                            className="w-full bg-gray-100 dark:bg-slate-700 rounded-xl py-3 px-4 outline-none border border-gray-200 dark:border-slate-600 dark:text-white"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                         />
                     </div>
                     <button 
                        type="submit" 
                        disabled={loading}
                        className="w-full bg-slate-900 dark:bg-blue-600 text-white font-bold py-3 rounded-xl flex items-center justify-center space-x-2 hover:opacity-90"
                     >
                         {loading ? "Updating..." : "Update Password"}
                     </button>
                 </form>
             </div>
        </div>
    );
};

const AppContent: React.FC = () => {
    const { user, isLoading } = useAuth();
    
    if (isLoading) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-slate-900">
           <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-white"></div>
        </div>
      );
    }

    // Independent Login Route
    if (!user) {
        return (
             <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/update-password" element={<UpdatePasswordPage />} />
                <Route path="*" element={<Navigate to="/login" />} />
             </Routes>
        );
    }

    return (
        <div className="min-h-screen text-slate-800 dark:text-slate-100 font-sans antialiased selection:bg-blue-100 selection:text-blue-900">
            <Sidebar />
            <main className="pb-32 md:pb-8 md:pl-64 transition-all duration-300">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
                <Routes>
                <Route path="/" element={<ProtectedRoute><CommandCenter /></ProtectedRoute>} />
                <Route path="/report" element={<ProtectedRoute><IncidentForm /></ProtectedRoute>} />
                <Route path="/cctv-request" element={<ProtectedRoute><CCTVRequestForm /></ProtectedRoute>} />
                <Route path="/resources" element={<ProtectedRoute><ResourceTracking /></ProtectedRoute>} />
                <Route path="/resources/new" element={<ProtectedRoute><ResourceForm /></ProtectedRoute>} />
                <Route path="/archives" element={<ProtectedRoute><ResolvedCases /></ProtectedRoute>} />
                <Route path="/restricted" element={<ProtectedRoute><RestrictedPersons /></ProtectedRoute>} />
                {/* REMOVED requiredRole="supervisor" to allow operators to see Roster */}
                <Route path="/users" element={<ProtectedRoute><UserManagement /></ProtectedRoute>} />
                <Route path="/audit-logs" element={<ProtectedRoute requiredRole="supervisor"><AuditLogs /></ProtectedRoute>} />
                <Route path="/settings" element={<ProtectedRoute requiredRole="supervisor"><Settings /></ProtectedRoute>} />
                <Route path="/update-password" element={<UpdatePasswordPage />} />
                <Route path="*" element={<Navigate to="/" />} />
                </Routes>
            </div>
            </main>
        </div>
    );
}

const App: React.FC = () => {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <ToastProvider>
          <AuthProvider>
              <Router>
                  <AppContent />
              </Router>
          </AuthProvider>
        </ToastProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
};

export default App;
