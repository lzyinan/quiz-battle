import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useSocket } from '../hooks/useSocket';

const STORAGE_KEY = 'quizpk_room';
const NAME_KEY = 'quizpk_name';

interface SavedRoom {
  roomId: string;
  playerIndex: number;
  playerName: string;
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
  const { connected, on, emit } = useSocket();
  const navigate = useNavigate();
  const [joining, setJoining] = useState(false);
  const [roomId, setRoomId] = useState('');
  const [error, setError] = useState('');
  const [playerName, setPlayerName] = useState(() => localStorage.getItem(NAME_KEY) || '');
  const [savedRoom, setSavedRoom] = useState<SavedRoom | null>(null);
  const [reconnecting, setReconnecting] = useState(false);

  // Check for saved room on mount
  useEffect(() => {
    const saved = getSavedRoom();
    if (saved) {
      setSavedRoom(saved);
    }
  }, []);

  // Save name to localStorage on change
  useEffect(() => {
    localStorage.setItem(NAME_KEY, playerName);
  }, [playerName]);

  const handleCreate = () => {
    const cleanup = on('room-created', (data) => {
      cleanup();
      // Save room info for reconnection
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        roomId: data.roomId,
        playerIndex: data.playerIndex,
        playerName: playerName || '玩家A',
      }));
      navigate(`/game/${data.roomId}`, {
        state: {
          creator: true,
          playerIndex: data.playerIndex,
          players: data.players,
          playerName: playerName || '玩家A',
        },
      });
    });
    emit('create-room', { playerName: playerName || '玩家A' });
  };

  const handleJoin = () => {
    const trimmed = roomId.trim();
    if (trimmed.length !== 4 || !/^\d{4}$/.test(trimmed)) {
      setError('请输入4位数字房间号');
      return;
    }
    setError('');
    setJoining(true);

    const nameToUse = playerName || '玩家B';

    const cleanupJoined = on('room-joined', (data) => {
      cleanupJoined();
      cleanupError();
      // Save room info for reconnection
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        roomId: data.roomId,
        playerIndex: data.playerIndex,
        playerName: nameToUse,
      }));
      navigate(`/game/${data.roomId}`, {
        state: {
          joined: true,
          playerIndex: data.playerIndex,
          players: data.players,
          playerName: nameToUse,
        },
      });
    });

    const cleanupError = on('room-error', (msg) => {
      cleanupError();
      cleanupJoined();
      setError(msg);
      setJoining(false);
    });

    emit('join-room', { roomId: trimmed, playerName: nameToUse });
  };

  const handleReconnect = () => {
    if (!savedRoom) return;
    setReconnecting(true);
    setError('');

    const cleanupReconnected = on('reconnected', (data) => {
      cleanupReconnected();
      cleanupError();
      // Update saved room with fresh data
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        roomId: data.roomId,
        playerIndex: data.playerIndex,
        playerName: savedRoom.playerName,
      }));
      navigate(`/game/${data.roomId}`, {
        state: {
          reconnected: true,
          playerIndex: data.playerIndex,
          players: data.players,
          phase: data.phase,
          playerName: savedRoom.playerName,
        },
      });
    });

    const cleanupError = on('room-error', (msg) => {
      cleanupError();
      cleanupReconnected();
      // Room is gone, clear saved data and show normal UI
      clearSavedRoom();
      setSavedRoom(null);
      setError(msg);
      setReconnecting(false);
    });

    emit('reconnect-room', {
      roomId: savedRoom.roomId,
      playerIndex: savedRoom.playerIndex,
      playerName: savedRoom.playerName,
    });
  };

  const handleDismissSaved = () => {
    clearSavedRoom();
    setSavedRoom(null);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      <div className="text-center mb-12">
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-black bg-gradient-to-r from-purple-600 via-pink-500 to-indigo-600 bg-clip-text text-transparent mb-4">
          🧠 知识PK大作战
        </h1>
        <p className="text-base sm:text-lg text-gray-500">两人对战，抢答PK，谁才是知识之王？</p>
      </div>

      {!connected && (
        <div className="mb-8 px-4 py-2 bg-yellow-100 text-yellow-700 rounded-full text-sm">
          正在连接服务器...
        </div>
      )}

      {/* Reconnection banner */}
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

      <div className="flex flex-col items-center gap-6">
        {/* Player name input */}
        <div className="w-full max-w-xs">
          <input
            type="text"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value.slice(0, 10))}
            placeholder="输入你的名字"
            maxLength={10}
            className="w-full px-4 py-3 text-center text-lg border-2 border-gray-200 rounded-xl focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-100"
          />
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

      <Link
        to="/admin"
        className="mt-12 sm:mt-16 text-gray-400 hover:text-purple-500 transition-colors text-sm flex items-center gap-1"
      >
        ⚙️ 题库管理后台
      </Link>
    </div>
  );
}
