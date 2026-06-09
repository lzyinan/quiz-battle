import { Routes, Route, Navigate } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';

const LoginPage = lazy(() => import('./pages/LoginPage'));
const HomePage = lazy(() => import('./pages/HomePage'));
const GamePage = lazy(() => import('./pages/GamePage'));
const AdminPage = lazy(() => import('./pages/AdminPage'));
const MistakePracticePage = lazy(() => import('./pages/MistakePracticePage'));
const SoloGamePage = lazy(() => import('./pages/SoloGamePage'));
const FavoritesPage = lazy(() => import('./pages/FavoritesPage'));
const FavoritePracticePage = lazy(() => import('./pages/FavoritePracticePage'));
const ChallengePage = lazy(() => import('./pages/ChallengePage'));
const HistoryPage = lazy(() => import('./pages/HistoryPage'));

function Loading() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-2xl text-purple-600 animate-bounce">加载中...</div>
    </div>
  );
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <Loading />;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Suspense fallback={<Loading />}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={<ProtectedRoute><HomePage /></ProtectedRoute>} />
        <Route path="/game/:roomId" element={<ProtectedRoute><GamePage /></ProtectedRoute>} />
        <Route path="/mistakes" element={<ProtectedRoute><MistakePracticePage /></ProtectedRoute>} />
        <Route path="/favorites" element={<FavoritesPage />} />
        <Route path="/favorites/practice" element={<FavoritePracticePage />} />
        <Route path="/challenge/:token" element={<ChallengePage />} />
        <Route path="/solo" element={<ProtectedRoute><SoloGamePage /></ProtectedRoute>} />
        <Route path="/history" element={<ProtectedRoute><HistoryPage /></ProtectedRoute>} />
        <Route path="/admin" element={<AdminPage />} />
      </Routes>
    </Suspense>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}
