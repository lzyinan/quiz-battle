import { useState, useEffect } from 'react';
import type { Quiz, Question, QuestionType } from '../../../shared/types';
import { API_BASE } from '../utils/api';

interface QuizWithCount extends Quiz {
  questionCount: number;
}

const EMPTY_QUESTION = { type: 'single' as QuestionType, content: '', options: ['', '', '', ''], answer: 0 };

export default function AdminPage() {
  const [quizzes, setQuizzes] = useState<QuizWithCount[]>([]);
  const [selectedQuiz, setSelectedQuiz] = useState<number | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [showAddQuiz, setShowAddQuiz] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [editing, setEditing] = useState<{ id?: number; type: QuestionType; content: string; options: string[]; answer: number }>({ ...EMPTY_QUESTION });
  const [showForm, setShowForm] = useState(false);
  // Mobile tab: 'quizzes' shows quiz list, 'questions' shows question editor
  const [mobileTab, setMobileTab] = useState<'quizzes' | 'questions'>('quizzes');

  const loadQuizzes = async () => {
    const res = await fetch(`${API_BASE}/quizzes`);
    setQuizzes(await res.json());
  };

  const loadQuestions = async (quizId: number) => {
    const res = await fetch(`${API_BASE}/quizzes/${quizId}/questions`);
    setQuestions(await res.json());
  };

  useEffect(() => { loadQuizzes(); }, []);

  useEffect(() => {
    if (selectedQuiz) loadQuestions(selectedQuiz);
    else setQuestions([]);
  }, [selectedQuiz]);

  const handleSelectQuiz = (id: number) => {
    setSelectedQuiz(id);
    setMobileTab('questions');
  };

  const handleBackToQuizzes = () => {
    setMobileTab('quizzes');
  };

  const handleAddQuiz = async () => {
    if (!newName.trim()) return;
    await fetch(`${API_BASE}/quizzes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName, description: newDesc }),
    });
    setNewName(''); setNewDesc(''); setShowAddQuiz(false);
    loadQuizzes();
  };

  const handleDeleteQuiz = async (id: number) => {
    if (!confirm('确定删除该题库及其所有题目？')) return;
    await fetch(`${API_BASE}/quizzes/${id}`, { method: 'DELETE' });
    if (selectedQuiz === id) setSelectedQuiz(null);
    loadQuizzes();
  };

  const handleTypeChange = (type: QuestionType) => {
    setEditing(prev => ({ ...prev, type, options: type === 'judge' ? ['正确', '错误'] : ['', '', '', ''], answer: 0 }));
  };

  const handleSaveQuestion = async () => {
    const { id, ...input } = editing;
    const filteredOptions = input.options.filter(o => o.trim());
    if (!editing.content.trim() || filteredOptions.length < 2) { alert('请填写题目内容和至少2个选项'); return; }
    const payload = { ...input, options: filteredOptions };

    if (id) {
      await fetch(`${API_BASE}/questions/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    } else if (selectedQuiz) {
      await fetch(`${API_BASE}/quizzes/${selectedQuiz}/questions`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    }
    setEditing({ ...EMPTY_QUESTION });
    setShowForm(false);
    if (selectedQuiz) loadQuestions(selectedQuiz);
  };

  const handleEditQuestion = (q: Question) => {
    setEditing({ id: q.id, type: q.type, content: q.content, options: [...q.options], answer: q.answer });
    setShowForm(true);
  };

  const handleDeleteQuestion = async (id: number) => {
    if (!confirm('确定删除这道题目？')) return;
    await fetch(`${API_BASE}/questions/${id}`, { method: 'DELETE' });
    if (selectedQuiz) loadQuestions(selectedQuiz);
  };

  const selectedQuizData = quizzes.find(q => q.id === selectedQuiz);

  // Quiz list panel (shared between mobile & desktop)
  const quizListPanel = (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-bold text-gray-600 text-sm sm:text-base">题库列表</h2>
        <button onClick={() => setShowAddQuiz(true)} className="text-sm text-purple-500 hover:text-purple-700 font-medium">+ 新建</button>
      </div>

      {showAddQuiz && (
        <div className="bg-white rounded-xl p-3 sm:p-4 shadow-md mb-3">
          <input type="text" value={newName} onChange={e => setNewName(e.target.value)} placeholder="题库名称" className="w-full p-2 border rounded-lg mb-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300" autoFocus />
          <textarea value={newDesc} onChange={e => setNewDesc(e.target.value)} placeholder="描述（可选）" className="w-full p-2 border rounded-lg mb-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300 resize-none h-16" />
          <div className="flex gap-2">
            <button onClick={handleAddQuiz} className="flex-1 py-2 bg-purple-500 text-white rounded-lg text-sm font-medium hover:bg-purple-600">创建</button>
            <button onClick={() => setShowAddQuiz(false)} className="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg text-sm">取消</button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {quizzes.map(quiz => (
          <div key={quiz.id} className={`bg-white rounded-xl p-3 sm:p-4 shadow-sm cursor-pointer transition-all ${selectedQuiz === quiz.id ? 'ring-2 ring-purple-500 shadow-md' : 'hover:shadow-md'}`} onClick={() => handleSelectQuiz(quiz.id)}>
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <h3 className="font-bold text-gray-800 text-sm sm:text-base truncate">{quiz.name}</h3>
                <p className="text-xs text-gray-400">{quiz.questionCount ?? 0} 道题</p>
              </div>
              <button onClick={(e) => { e.stopPropagation(); handleDeleteQuiz(quiz.id); }} className="text-red-400 hover:text-red-600 text-xs sm:text-sm px-2 py-1 ml-2">删除</button>
            </div>
          </div>
        ))}
        {quizzes.length === 0 && <p className="text-gray-400 text-center py-8 text-sm">暂无题库</p>}
      </div>
    </div>
  );

  // Question editor panel (shared between mobile & desktop)
  const questionPanel = selectedQuiz ? (
    <>
      <h2 className="font-bold text-gray-600 mb-3 text-sm sm:text-base">{selectedQuizData?.name} — 题目管理</h2>

      <div className="space-y-2 mb-6">
        {questions.length === 0 && <p className="text-gray-400 text-center py-8 text-sm">暂无题目</p>}
        {questions.map((q, idx) => (
          <div key={q.id} className="bg-white rounded-xl p-3 sm:p-4 shadow-sm">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${q.type === 'judge' ? 'bg-blue-100 text-blue-600' : 'bg-purple-100 text-purple-600'}`}>
                    {q.type === 'judge' ? '判断' : '单选'}
                  </span>
                  <span className="text-xs text-gray-400">Q{idx + 1}</span>
                </div>
                <p className="text-gray-800 font-medium text-sm sm:text-base break-words">{q.content}</p>
                <div className="flex flex-wrap gap-1 mt-1">
                  {q.options.map((opt, oi) => (
                    <span key={oi} className={`text-xs px-2 py-1 rounded ${oi === q.answer ? 'bg-green-100 text-green-700 font-medium' : 'bg-gray-50 text-gray-500'}`}>{opt}</span>
                  ))}
                </div>
              </div>
              <div className="flex gap-1 flex-shrink-0">
                <button onClick={() => handleEditQuestion(q)} className="text-xs sm:text-sm text-purple-500 hover:text-purple-700 px-2 py-1">编辑</button>
                <button onClick={() => handleDeleteQuestion(q.id)} className="text-xs sm:text-sm text-red-400 hover:text-red-600 px-2 py-1">删除</button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {!showForm ? (
        <button onClick={() => { setEditing({ ...EMPTY_QUESTION }); setShowForm(true); }} className="w-full py-3 border-2 border-dashed border-purple-200 text-purple-400 rounded-xl hover:border-purple-400 hover:text-purple-600 transition-colors text-sm sm:text-base">
          + 添加题目
        </button>
      ) : (
        <div className="bg-white rounded-xl p-3 sm:p-4 shadow-md">
          <h4 className="font-bold mb-4 text-sm sm:text-base">{editing.id ? '编辑题目' : '添加题目'}</h4>
          <div className="flex gap-2 mb-4">
            <button onClick={() => handleTypeChange('single')} className={`px-4 py-2 rounded-lg text-sm font-medium ${editing.type === 'single' ? 'bg-purple-500 text-white' : 'bg-gray-100 text-gray-600'}`}>单选题</button>
            <button onClick={() => handleTypeChange('judge')} className={`px-4 py-2 rounded-lg text-sm font-medium ${editing.type === 'judge' ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-600'}`}>判断题</button>
          </div>
          <textarea value={editing.content} onChange={e => setEditing(prev => ({ ...prev, content: e.target.value }))} placeholder="输入题目内容..." className="w-full p-3 border rounded-xl mb-4 focus:outline-none focus:ring-2 focus:ring-purple-300 resize-none h-20 text-sm sm:text-base" />
          <div className="space-y-2 mb-4">
            {editing.options.map((opt, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <input type="radio" name="correct-answer" checked={editing.answer === idx} onChange={() => setEditing(prev => ({ ...prev, answer: idx }))} className="accent-green-500 flex-shrink-0" />
                <input type="text" value={opt} onChange={e => { const newOptions = [...editing.options]; newOptions[idx] = e.target.value; setEditing(prev => ({ ...prev, options: newOptions })); }} placeholder={`选项 ${idx + 1}`} disabled={editing.type === 'judge'} className="flex-1 min-w-0 p-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-300 disabled:bg-gray-50" />
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-400 mb-4">⬆ 点击单选按钮标记正确答案</p>
          <div className="flex gap-2">
            <button onClick={handleSaveQuestion} className="flex-1 py-2 bg-purple-500 text-white rounded-lg font-medium hover:bg-purple-600 transition-colors text-sm">{editing.id ? '保存修改' : '添加题目'}</button>
            <button onClick={() => setShowForm(false)} className="px-4 sm:px-6 py-2 bg-gray-100 text-gray-600 rounded-lg font-medium hover:bg-gray-200 transition-colors text-sm">取消</button>
          </div>
        </div>
      )}
    </>
  ) : (
    <div className="text-center py-12 sm:py-20 text-gray-400">
      <div className="text-4xl mb-4 md:hidden">📋</div>
      <div className="text-4xl mb-4 hidden md:block">👈</div>
      <p className="text-sm sm:text-base">{quizzes.length > 0 ? '请从上方选择题库' : '请先创建题库'}</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-purple-50">
      <div className="max-w-4xl mx-auto p-3 sm:p-4">
        <div className="flex items-center justify-between mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-black text-gray-800">📝 题库管理</h1>
          <a href="/" className="text-purple-500 hover:text-purple-700 text-sm font-medium">← 返回游戏</a>
        </div>

        {/* Mobile: tab switcher */}
        <div className="md:hidden mb-4">
          <div className="flex bg-white rounded-xl shadow-sm p-1">
            <button
              onClick={() => setMobileTab('quizzes')}
              className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${mobileTab === 'quizzes' ? 'bg-purple-500 text-white' : 'text-gray-500'}`}
            >
              题库列表
            </button>
            <button
              onClick={() => setMobileTab('questions')}
              className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${mobileTab === 'questions' ? 'bg-purple-500 text-white' : 'text-gray-500'}`}
            >
              题目管理
            </button>
          </div>
          {selectedQuiz && mobileTab === 'questions' && (
            <button onClick={handleBackToQuizzes} className="mt-2 text-sm text-purple-500 hover:text-purple-700 font-medium">
              ← 返回题库列表
            </button>
          )}
        </div>

        {/* Mobile: show active tab */}
        <div className="md:hidden">
          {mobileTab === 'quizzes' ? quizListPanel : questionPanel}
        </div>

        {/* Desktop: side-by-side layout */}
        <div className="hidden md:grid md:grid-cols-[300px_1fr] gap-6">
          {quizListPanel}
          <div>{questionPanel}</div>
        </div>
      </div>
    </div>
  );
}
