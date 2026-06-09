import { useState, useRef } from 'react';
import Papa from 'papaparse';

interface ParsedQuestion {
  type: string;
  content: string;
  options: string[];
  answer: number;
}

interface ParsedRow {
  index: number;
  question: ParsedQuestion | null;
  error: string | null;
}

interface ImportPreviewModalProps {
  onImport: (questions: ParsedQuestion[]) => Promise<void>;
  onClose: () => void;
}

export default function ImportPreviewModal({ onImport, onClose }: ImportPreviewModalProps) {
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{ success: number; failed: number } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const validRows = rows.filter(r => r.question);
  const invalidRows = rows.filter(r => r.error);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      encoding: 'UTF-8',
      complete(results) {
        const parsed: ParsedRow[] = (results.data as Record<string, string>[]).map((row, i) => {
          const content = row['题目内容']?.trim();
          const optA = row['选项A']?.trim();
          const optB = row['选项B']?.trim();
          const optC = row['选项C']?.trim();
          const optD = row['选项D']?.trim();
          const answerStr = row['正确答案']?.trim();
          const type = row['类型']?.trim();

          if (!content) return { index: i + 1, question: null, error: '题目内容为空' };
          if (!optA || !optB) return { index: i + 1, question: null, error: '至少需要选项A和选项B' };

          const options = [optA, optB];
          if (optC) options.push(optC);
          if (optD) options.push(optD);

          const answer = parseInt(answerStr, 10);
          if (isNaN(answer) || answer < 0 || answer >= options.length) return { index: i + 1, question: null, error: `正确答案必须是 0-${options.length - 1}` };
          if (type !== 'single' && type !== 'judge') return { index: i + 1, question: null, error: '类型必须是 single 或 judge' };

          return { index: i + 1, question: { type, content, options, answer }, error: null };
        });
        setRows(parsed);
        setResult(null);
      },
    });
  };

  const handleImport = async () => {
    const questions = validRows.map(r => r.question!);
    setImporting(true);
    try {
      await onImport(questions);
      setResult({ success: questions.length, failed: invalidRows.length });
    } catch {
      setResult({ success: 0, failed: questions.length });
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-bold text-lg">📥 批量导入题目</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
        </div>

        <div className="p-4 overflow-y-auto flex-1">
          {rows.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-gray-500 mb-4">请选择 CSV 文件（UTF-8 编码）</p>
              <p className="text-xs text-gray-400 mb-4">格式：题目内容,选项A,选项B,选项C,选项D,正确答案,类型</p>
              <input ref={fileRef} type="file" accept=".csv" onChange={handleFile} className="hidden" />
              <button onClick={() => fileRef.current?.click()} className="px-6 py-2 bg-purple-500 text-white rounded-lg font-medium hover:bg-purple-600">
                选择文件
              </button>
            </div>
          ) : result ? (
            <div className="text-center py-10">
              <div className="text-5xl mb-4">✅</div>
              <p className="text-lg font-medium">导入完成</p>
              <p className="text-gray-500">成功 {result.success} 题{result.failed > 0 ? `，失败 ${result.failed} 题` : ''}</p>
              <button onClick={onClose} className="mt-4 px-6 py-2 bg-purple-500 text-white rounded-lg font-medium hover:bg-purple-600">
                关闭
              </button>
            </div>
          ) : (
            <div>
              <div className="flex items-center gap-4 mb-3 text-sm">
                <span className="text-green-600">✅ 有效 {validRows.length} 题</span>
                {invalidRows.length > 0 && <span className="text-red-500">❌ 无效 {invalidRows.length} 题</span>}
              </div>
              <div className="border rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left">#</th>
                      <th className="px-3 py-2 text-left">题目</th>
                      <th className="px-3 py-2 text-left">选项数</th>
                      <th className="px-3 py-2 text-left">类型</th>
                      <th className="px-3 py-2 text-left">状态</th>
                    </tr>
                  </thead>
                  <tbody className="max-h-64 overflow-y-auto">
                    {rows.map(row => (
                      <tr key={row.index} className={row.error ? 'bg-red-50' : 'bg-green-50/50'}>
                        <td className="px-3 py-2 text-gray-400">{row.index}</td>
                        <td className="px-3 py-2 max-w-[200px] truncate">{row.question?.content || '-'}</td>
                        <td className="px-3 py-2">{row.question?.options.length ?? '-'}</td>
                        <td className="px-3 py-2">{row.question?.type ?? '-'}</td>
                        <td className="px-3 py-2">
                          {row.error ? <span className="text-red-500 text-xs">{row.error}</span> : <span className="text-green-600">✓</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {rows.length > 0 && !result && (
          <div className="p-4 border-t flex justify-end gap-2">
            <button onClick={() => { setRows([]); }} className="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg font-medium hover:bg-gray-200">
              重新选择
            </button>
            <button
              onClick={handleImport}
              disabled={importing || validRows.length === 0}
              className="px-6 py-2 bg-purple-500 text-white rounded-lg font-medium hover:bg-purple-600 disabled:opacity-50"
            >
              {importing ? '⏳ 导入中...' : `确认导入 ${validRows.length} 题`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
