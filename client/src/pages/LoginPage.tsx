import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

export default function LoginPage() {
  const { login } = useAuth();
  const [nickname, setNickname] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleLogin = async () => {
    if (!nickname.trim()) { setError('请输入昵称'); return; }
    setError('');
    setSubmitting(true);
    try {
      await login(nickname);
    } catch (err: any) {
      setError(err.message || '登录失败');
    } finally {
      setSubmitting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleLogin();
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      <div className="text-center mb-10">
        <h1 className="text-4xl sm:text-5xl font-black bg-gradient-to-r from-purple-600 via-pink-500 to-indigo-600 bg-clip-text text-transparent mb-4">
          🧠 知识PK大作战
        </h1>
        <p className="text-base text-gray-500">输入昵称，开始答题之旅</p>
      </div>

      <div className="w-full max-w-xs">
        <input
          type="text"
          value={nickname}
          onChange={(e) => { setNickname(e.target.value.slice(0, 10)); setError(''); }}
          onKeyDown={handleKeyDown}
          placeholder="你的昵称"
          maxLength={10}
          autoFocus
          className="w-full px-4 py-3 text-center text-lg border-2 border-purple-200 rounded-xl focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-100 mb-4"
        />
        {error && <p className="text-sm text-red-500 text-center mb-3">{error}</p>}
        <button
          onClick={handleLogin}
          disabled={submitting || !nickname.trim()}
          className="w-full px-8 py-3 bg-gradient-to-r from-purple-500 to-indigo-600 text-white text-lg font-bold rounded-xl shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting ? '⏳ 进入中...' : '🚀 进入游戏'}
        </button>
      </div>
    </div>
  );
}
