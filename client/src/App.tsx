import { Routes, Route } from 'react-router-dom';
import { lazy, Suspense } from 'react';

const HomePage = lazy(() => import('./pages/HomePage'));
const GamePage = lazy(() => import('./pages/GamePage'));
const AdminPage = lazy(() => import('./pages/AdminPage'));
const MistakePracticePage = lazy(() => import('./pages/MistakePracticePage'));
const SoloGamePage = lazy(() => import('./pages/SoloGamePage'));

function Loading() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-2xl text-purple-600 animate-bounce">加载中...</div>
    </div>
  );
}

export default function App() {
  return (
    <Suspense fallback={<Loading />}>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/game/:roomId" element={<GamePage />} />
        <Route path="/mistakes" element={<MistakePracticePage />} />
        <Route path="/solo" element={<SoloGamePage />} />
        <Route path="/admin" element={<AdminPage />} />
      </Routes>
    </Suspense>
  );
}
