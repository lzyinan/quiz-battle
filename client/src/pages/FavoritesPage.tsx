import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  getFavorites,
  removeFavorite,
  clearFavorites,
  encodeChallengeToken,
  getChallengeUrl,
} from '../utils/favorites';

export default function FavoritesPage() {
  const navigate = useNavigate();
  const [favorites, setFavorites] = useState(getFavorites());
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [showLink, setShowLink] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setFavorites(getFavorites());
  }, []);

  const handleRemove = (questionId: number) => {
    const next = removeFavorite(questionId);
    setFavorites(next);
    setSelected(prev => {
      const s = new Set(prev);
      s.delete(questionId);
      return s;
    });
  };

  const handleClear = () => {
    if (!confirm('确定清空所有收藏？')) return;
    clearFavorites();
    setFavorites([]);
    setSelected(new Set());
  };

  const toggleSelect = (id: number) => {
    setSelected(prev => {
      const s = new Set(prev);
      if (s.has(id)) s.delete(id);
      else s.add(id);
      return s;
    });
  };

  const handleGenerateLink = () => {
    if (selected.size === 0) return;
    const ids = Array.from(selected);
    const token = encodeChallengeToken(ids);
    setShowLink(getChallengeUrl(token));
    setCopied(false);
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(showLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const input = document.createElement('input');
      input.value = showLink;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handlePractice = () => {
    navigate('/favorites/practice');
  };

  return (
    <div className="min-h-screen p-4">
      <div className="max-w-lg mx-auto">
        <div className="flex items-center justify-between mb-6 pt-4">
          <button onClick={() => navigate('/')} className="text-gray-400 hover:text-gray-600 transition-colors">
            ← 返回
          </button>
          <h1 className="text-xl font-black text-gray-800">⭐ 我的收藏</h1>
          <span className="text-sm text-gray-400">{favorites.length}题</span>
        </div>

        {favorites.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-5xl mb-4">📭</div>
            <p className="text-gray-400">还没有收藏任何题目</p>
            <p className="text-sm text-gray-300 mt-1">答题时点击 ⭐ 即可收藏</p>
            <button
              onClick={() => navigate('/solo')}
              className="mt-6 px-6 py-3 bg-gradient-to-r from-teal-500 to-cyan-600 text-white font-bold rounded-xl hover:scale-105 transition-all duration-200"
            >
              去答题
            </button>
          </div>
        ) : (
          <>
            <div className="flex gap-2 mb-4 flex-wrap">
              <button
                onClick={handlePractice}
                className="px-4 py-2 bg-gradient-to-r from-yellow-400 to-orange-500 text-white font-bold rounded-xl hover:scale-105 transition-all duration-200 text-sm"
              >
                📝 练习收藏
              </button>
              <button
                onClick={handleGenerateLink}
                disabled={selected.size === 0}
                className="px-4 py-2 bg-gradient-to-r from-purple-500 to-indigo-600 text-white font-bold rounded-xl hover:scale-105 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              >
                🔗 生成挑战 ({selected.size})
              </button>
              <button
                onClick={handleClear}
                className="px-4 py-2 bg-gray-100 text-gray-500 font-bold rounded-xl hover:bg-red-50 hover:text-red-500 transition-colors text-sm ml-auto"
              >
                清空
              </button>
            </div>

            {showLink && (
              <div className="bg-purple-50 border border-purple-200 rounded-xl p-3 mb-4 flex items-center gap-2">
                <input
                  readOnly
                  value={showLink}
                  className="flex-1 text-sm bg-transparent outline-none text-purple-700 min-w-0"
                />
                <button
                  onClick={handleCopy}
                  className="px-3 py-1 bg-purple-500 text-white text-sm font-bold rounded-lg hover:bg-purple-600 transition-colors whitespace-nowrap"
                >
                  {copied ? '✓ 已复制' : '复制'}
                </button>
              </div>
            )}

            <div className="space-y-3">
              {favorites.map(record => (
                <div key={record.question.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-2 bg-gray-50 border-b border-gray-100">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selected.has(record.question.id)}
                        onChange={() => toggleSelect(record.question.id)}
                        className="w-4 h-4 accent-purple-500"
                      />
                      <span className="text-xs text-gray-400">
                        {record.question.type === 'judge' ? '✅ 判断' : '📝 选择'}
                      </span>
                    </label>
                    <button
                      onClick={() => handleRemove(record.question.id)}
                      className="text-gray-300 hover:text-red-400 transition-colors text-sm"
                    >
                      ✕
                    </button>
                  </div>
                  <div className="px-4 py-3">
                    <p className="text-sm font-medium text-gray-800">{record.question.content}</p>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
