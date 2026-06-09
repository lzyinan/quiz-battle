import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useSocket } from '../hooks/useSocket';
import { useAuth } from '../contexts/AuthContext';
import { getMistakes } from '../utils/mistakes';
import { getFavorites } from '../utils/favorites';

const STORAGE_KEY = 'quizpk_room';

interface SavedRoom {
  roomId: string;
  playerIndex: number;
}

function getSavedRoom(): SavedRoom | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function clearSavedRoom() {
  localStorage.removeItem(STORAGE_KEY);
}

export default function HomePage() {
  const { user, logout } = useAuth();
  const { connected, on, emit } = useSocket();
  const navigate = useNavigate();
  const [joining, setJoining] = useState(false);
  const [roomId, setRoomId] = useState('');
  const [error, setError] = useState('');
  const [savedRoom, setSavedRoom] = useState<SavedRoom | null>(null);
  const [reconnecting, setReconnecting] = useState(false);
  const [mistakeCount, setMistakeCount] = useState(() => getMistakes().length);
  const [favoriteCount, setFavoriteCount] = useState(() => getFavorites().length);

  useEffect(() => {
    const saved = getSavedRoom();
    if (saved) setSavedRoom(saved);
  }, []);

  useEffect(() => {
    const refresh = () => {
      setMistakeCount(getMistakes().length);
      setFavoriteCount(getFavorites().length);
    };
    refresh();
    window.addEventListener('focus', refresh);
    return () => window.removeEventListener('focus', refresh);
  }, []);

  const handleCreate = () => {
    const cleanup = on('room-created', (data) => {
      cleanup();
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ roomId: data.roomId, playerIndex: data.playerIndex }));
      navigate(`/game/${data.roomId}`, {
        state: {
          creator: true,
          playerIndex: data.playerIndex,
          players: data.players,
          roomState: data.state,
        },
      });
    });
    emit('create-room');
  };

  const handleJoin = () => {
    const trimmed = roomId.trim();
    if (trimmed.length !== 4 || !/^\d{4}$/.test(trimmed)) {
      setError('请输入4位数字房间号');
      return;
    }
    setError('');
    setJoining(true);

    const cleanupJoined = on('room-joined', (data) => {
      cleanupJoined();
      cleanupError();
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ roomId: data.roomId, playerIndex: data.playerIndex }));
      navigate(`/game/${data.roomId}`, {
        state: {
          joined: true,
          playerIndex: data.playerIndex,
          players: data.players,
          roomState: data.state,
        },
      });
    });

    const cleanupError = on('room-error', (msg) => {
      cleanupError();
      cleanupJoined();
      setError(msg);
      setJoining(false);
    });

    emit('join-room', { roomId: trimmed });
  };

  const handleReconnect = () => {
    if (!savedRoom) return;
    setReconnecting(true);
    setError('');

    const cleanupReconnected = on('reconnected', (data) => {
      cleanupReconnected();
      cleanupError();
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ roomId: data.roomId, playerIndex: data.playerIndex }));
      navigate(`/game/${data.roomId}`, {
        state: {
          reconnected: true,
          playerIndex: data.playerIndex,
          players: data.players,
          roomState: data.state,
          phase: data.phase,
        },
      });
    });

    const cleanupError = on('room-error', (msg) => {
      cleanupError();
      cleanupReconnected();
      clearSavedRoom();
      setSavedRoom(null);
      setError(msg);
      setReconnecting(false);
    });

    emit('reconnect-room', { roomId: savedRoom.roomId, playerIndex: savedRoom.playerIndex });
  };

  const handleDismissSaved = () => {
    clearSavedRoom();
    setSavedRoom(null);
  };

  const handleMistakePractice = () => {
    if (mistakeCount === 0) return;
    navigate('/mistakes', { state: { start: true } });
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      <div className="text-center mb-10">
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-black bg-gradient-to-r from-purple-600 via-pink-500 to-indigo-600 bg-clip-text text-transparent mb-3">
          🧠 知识PK大作战
        </h1>
        <p className="text-base sm:text-lg text-gray-500">两人对战，抢答PK，谁才是知识之王？</p>
        <p className="text-sm text-purple-400 mt-1">👋 {user?.nickname}</p>
      </div>

      {!connected && (
        <div className="mb-8 px-4 py-2 bg-yellow-100 text-yellow-700 rounded-full text-sm">
          正在连接服务器...
        </div>
      )}

      {savedRoom && (
        <div className="mb-6 w-full max-w-xs bg-purple-50 border-2 border-purple-200 rounded-2xl p-4 text-center">
          <p className="text-sm text-purple-700 mb-3">你有一局未完成的游戏</p>
          <div className="flex gap-2 justify-center">
            <button
              onClick={handleReconnect}
              disabled={!connected || reconnecting}
              className="px-5 py-2 bg-gradient-to-r from-purple-500 to-indigo-600 text-white font-bold rounded-xl hover:scale-105 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              {reconnecting ? '⏳ 重连中...' : '🔄 回到房间'}
            </button>
            <button
              onClick={handleDismissSaved}
              className="px-5 py-2 bg-gray-100 text-gray-600 font-bold rounded-xl hover:bg-gray-200 transition-colors text-sm"
            >
              放弃
            </button>
          </div>
        </div>
      )}

      <div className="flex flex-col items-center gap-5">
        <div className="w-full max-w-xs bg-white rounded-2xl shadow-sm border border-gray-100 p-3">
          <div className="flex items-center justify-between gap-2">
            <Link
              to="/mistakes"
              className="flex-1 min-w-0 px-4 py-2.5 bg-gray-50 text-gray-700 font-bold rounded-xl hover:bg-purple-50 hover:text-purple-600 transition-colors"
            >
              错题回顾
              <span className="ml-2 text-xs text-gray-400">{mistakeCount}题</span>
            </Link>
            <button
              onClick={handleMistakePractice}
              disabled={mistakeCount === 0}
              className="px-4 py-2.5 bg-gradient-to-r from-purple-500 to-indigo-600 text-white font-bold rounded-xl hover:scale-105 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
            >
              错题考试
            </button>
          </div>
        </div>

        <Link
          to="/favorites"
          className="w-full max-w-xs px-8 py-4 bg-gradient-to-r from-yellow-400 to-orange-500 text-white text-xl font-bold rounded-2xl shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200 block text-center"
        >
          ⭐ 我的收藏
          <span className="ml-2 text-sm opacity-80">{favoriteCount}题</span>
        </Link>

        <div className="w-full max-w-xs flex gap-3">
          <Link
            to="/solo"
            className="flex-1 px-6 py-3.5 bg-gradient-to-r from-teal-500 to-cyan-600 text-white text-lg font-bold rounded-2xl shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200 block text-center"
          >
            📝 单人答题
          </Link>
          <Link
            to="/history"
            className="flex-1 px-6 py-3.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-lg font-bold rounded-2xl shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200 block text-center"
          >
            📊 战绩
          </Link>
        </div>

        <button
          onClick={handleCreate}
          disabled={!connected}
          className="w-full max-w-xs px-8 py-4 bg-gradient-to-r from-purple-500 to-indigo-600 text-white text-xl font-bold rounded-2xl shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          🎮 创建房间
        </button>

        <div className="text-gray-400 text-sm">— 或者 —</div>

        <div className="w-full max-w-xs">
          <div className="flex gap-2">
            <input
              type="text"
              value={roomId}
              onChange={(e) => {
                setRoomId(e.target.value.replace(/\D/g, '').slice(0, 4));
                setError('');
              }}
              placeholder="输入4位房间号"
              maxLength={4}
              className="flex-1 min-w-0 px-3 sm:px-4 py-3 text-center text-xl sm:text-2xl font-mono tracking-[0.3em] sm:tracking-[0.5em] border-2 border-purple-200 rounded-xl focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-200"
            />
            <button
              onClick={handleJoin}
              disabled={joining || roomId.length !== 4}
              className="px-4 sm:px-6 py-3 bg-gradient-to-r from-pink-500 to-rose-600 text-white text-base sm:text-lg font-bold rounded-xl shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
            >
              {joining ? '⏳' : '🚪 加入'}
            </button>
          </div>
          {error && <p className="mt-2 text-sm text-red-500 text-center">{error}</p>}
        </div>
      </div>

      <div className="mt-10 flex items-center gap-4">
        <Link
          to="/admin"
          className="text-gray-400 hover:text-purple-500 transition-colors text-sm flex items-center gap-1"
        >
          ⚙️ 题库管理
        </Link>
        <button
          onClick={logout}
          className="text-gray-400 hover:text-red-500 transition-colors text-sm flex items-center gap-1"
        >
          🚪 退出
        </button>
      </div>
    </div>
  );
}
