import type { Question } from '../../../shared/types';

export const MISTAKE_STORAGE_KEY = 'quizpk_mistakes';

export interface MistakeRecord {
  question: Question;
  selectedOption: number;
  correctAnswer: number;
  wrongCount: number;
  updatedAt: string;
}

function parseMistakes(raw: string | null): MistakeRecord[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(record => record?.question?.id && Array.isArray(record.question.options));
  } catch {
    return [];
  }
}

export function getMistakes(): MistakeRecord[] {
  return parseMistakes(localStorage.getItem(MISTAKE_STORAGE_KEY));
}

export function saveMistakes(records: MistakeRecord[]): void {
  localStorage.setItem(MISTAKE_STORAGE_KEY, JSON.stringify(records));
}

export function upsertMistake(question: Question, selectedOption: number, correctAnswer = question.answer): MistakeRecord[] {
  const records = getMistakes();
  const existingIndex = records.findIndex(record => record.question.id === question.id);
  const nextRecord: MistakeRecord = {
    question,
    selectedOption,
    correctAnswer,
    wrongCount: existingIndex >= 0 ? records[existingIndex].wrongCount + 1 : 1,
    updatedAt: new Date().toISOString(),
  };

  const nextRecords = existingIndex >= 0
    ? [nextRecord, ...records.filter(record => record.question.id !== question.id)]
    : [nextRecord, ...records];

  saveMistakes(nextRecords);
  return nextRecords;
}

export function removeMistake(questionId: number): MistakeRecord[] {
  const nextRecords = getMistakes().filter(record => record.question.id !== questionId);
  saveMistakes(nextRecords);
  return nextRecords;
}

export function clearMistakes(): void {
  localStorage.removeItem(MISTAKE_STORAGE_KEY);
}

export function cleanOptionLabel(option: string): string {
  return option.replace(/^[A-D][.、]\s*/, '');
}
