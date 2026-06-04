import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useSocket } from '../hooks/useSocket';

export default function HomePage() {
  const { connected, on, emit } = useSocket();
  const navigate = useNavigate();
  const [joining, setJoining] = useState(false);
  const [roomId, setRoomId] = useState('');
  const [error, setError] = useState('');

  const handleCreate = () => {
    const cleanup = on('room-created', (data) => {
      cleanup();
      navigate(`/game/${data.roomId}`, { state: { creator: true, playerIndex: 0 } });
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
      navigate(`/game/${data.roomId}`, { state: { joined: true, playerIndex: data.playerIndex, players: data.players } });
    });

    const cleanupError = on('room-error', (msg) => {
      cleanupError();
      cleanupJoined();
      setError(msg);
      setJoining(false);
    });

    emit('join-room', trimmed);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      <div className="text-center mb-12">
        <h1 className="text-5xl md:text-6xl font-black bg-gradient-to-r from-purple-600 via-pink-500 to-indigo-600 bg-clip-text text-transparent mb-4">
          🧠 知识PK大作战
        </h1>
        <p className="text-lg text-gray-500">两人对战，抢答PK，谁才是知识之王？</p>
      </div>

      {!connected && (
        <div className="mb-8 px-4 py-2 bg-yellow-100 text-yellow-700 rounded-full text-sm">
          正在连接服务器...
        </div>
      )}

      <div className="flex flex-col items-center gap-6">
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
              className="flex-1 px-4 py-3 text-center text-2xl font-mono tracking-[0.5em] border-2 border-purple-200 rounded-xl focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-200"
            />
            <button
              onClick={handleJoin}
              disabled={joining || roomId.length !== 4}
              className="px-6 py-3 bg-gradient-to-r from-pink-500 to-rose-600 text-white text-lg font-bold rounded-xl shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {joining ? '⏳' : '🚪 加入'}
            </button>
          </div>
          {error && <p className="mt-2 text-sm text-red-500 text-center">{error}</p>}
        </div>
      </div>

      <Link
        to="/admin"
        className="mt-16 text-gray-400 hover:text-purple-500 transition-colors text-sm flex items-center gap-1"
      >
        ⚙️ 题库管理后台
      </Link>
    </div>
  );
}
