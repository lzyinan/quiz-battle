import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import type { GameRecordItem, UserStats } from '../../../shared/types';

const TOKEN_KEY = 'quizpk_token';

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem(TOKEN_KEY);
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export default function HistoryPage() {
  const [stats, setStats] = useState<UserStats | null>(null);
  const [records, setRecords] = useState<GameRecordItem[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/pk/api/me/stats', { headers: authHeaders() })
      .then(res => res.json())
      .then(setStats)
      .catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    fetch(`/pk/api/me/history?page=${page}`, { headers: authHeaders() })
      .then(res => res.json())
      .then(data => {
        setRecords(prev => page === 1 ? data.records : [...prev, ...data.records]);
        setTotal(data.total);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [page]);

  const hasMore = records.length < total;

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-50">
      <div className="max-w-lg mx-auto p-4">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-black text-gray-800">📊 我的战绩</h1>
          <Link to="/" className="text-purple-500 hover:text-purple-700 text-sm font-medium">← 返回首页</Link>
        </div>

        {stats && (
          <div className="grid grid-cols-3 gap-3 mb-6">
            <div className="bg-white rounded-xl p-3 shadow-sm text-center">
              <div className="text-2xl font-black text-purple-600">{stats.totalGames}</div>
              <div className="text-xs text-gray-400">总场次</div>
            </div>
            <div className="bg-white rounded-xl p-3 shadow-sm text-center">
              <div className="text-2xl font-black text-green-600">{stats.winRate}%</div>
              <div className="text-xs text-gray-400">胜率</div>
            </div>
            <div className="bg-white rounded-xl p-3 shadow-sm text-center">
              <div className="text-2xl font-black text-blue-600">{stats.avgScore}</div>
              <div className="text-xs text-gray-400">场均得分</div>
            </div>
          </div>
        )}

        <div className="space-y-3">
          {records.map(r => (
            <div key={r.id} className="bg-white rounded-xl p-4 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                    r.result === 'win' ? 'bg-green-100 text-green-600' :
                    r.result === 'lose' ? 'bg-red-100 text-red-600' :
                    'bg-gray-100 text-gray-600'
                  }`}>
                    {r.result === 'win' ? '胜利' : r.result === 'lose' ? '失败' : '平局'}
                  </span>
                  <span className="text-sm text-gray-500">VS {r.opponentName}</span>
                </div>
                <span className="text-xs text-gray-400">
                  {new Date(r.createdAt).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="text-lg font-black">
                  <span className={r.myScore > r.opponentScore ? 'text-green-600' : 'text-gray-700'}>{r.myScore}</span>
                  <span className="text-gray-300 mx-2">:</span>
                  <span className={r.opponentScore > r.myScore ? 'text-red-500' : 'text-gray-700'}>{r.opponentScore}</span>
                </div>
                <div className="text-xs text-gray-400">
                  {r.questionCount} 题 · {Math.floor(r.durationSeconds / 60)}分{r.durationSeconds % 60}秒
                </div>
              </div>
            </div>
          ))}

          {records.length === 0 && !loading && (
            <div className="text-center py-16">
              <div className="text-5xl mb-4">🎮</div>
              <p className="text-gray-400">还没有对战记录</p>
              <Link to="/" className="text-purple-500 hover:text-purple-700 text-sm mt-2 inline-block">去对战一局 →</Link>
            </div>
          )}
        </div>

        {hasMore && (
          <button
            onClick={() => setPage(p => p + 1)}
            disabled={loading}
            className="w-full mt-4 py-3 bg-white text-gray-600 rounded-xl shadow-sm font-medium hover:bg-gray-50 disabled:opacity-50"
          >
            {loading ? '加载中...' : '加载更多'}
          </button>
        )}
      </div>
    </div>
  );
}
