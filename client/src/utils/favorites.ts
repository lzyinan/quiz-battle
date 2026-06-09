import type { Question } from '../../../shared/types';

export const FAVORITES_STORAGE_KEY = 'quizpk_favorites';

export interface FavoriteRecord {
  question: Question;
  addedAt: string;
}

function parseFavorites(raw: string | null): FavoriteRecord[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(record => record?.question?.id && Array.isArray(record.question.options));
  } catch {
    return [];
  }
}

export function getFavorites(): FavoriteRecord[] {
  return parseFavorites(localStorage.getItem(FAVORITES_STORAGE_KEY));
}

export function saveFavorites(records: FavoriteRecord[]): void {
  localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(records));
}

export function isFavorite(questionId: number): boolean {
  return getFavorites().some(r => r.question.id === questionId);
}

export function toggleFavorite(question: Question): FavoriteRecord[] {
  const records = getFavorites();
  const existingIndex = records.findIndex(r => r.question.id === question.id);

  if (existingIndex >= 0) {
    records.splice(existingIndex, 1);
  } else {
    records.unshift({ question, addedAt: new Date().toISOString() });
  }

  saveFavorites(records);
  return records;
}

export function removeFavorite(questionId: number): FavoriteRecord[] {
  const next = getFavorites().filter(r => r.question.id !== questionId);
  saveFavorites(next);
  return next;
}

export function clearFavorites(): void {
  localStorage.removeItem(FAVORITES_STORAGE_KEY);
}

export function encodeChallengeToken(questionIds: number[]): string {
  return btoa(JSON.stringify(questionIds));
}

export function decodeChallengeToken(token: string): number[] {
  try {
    const ids = JSON.parse(atob(token));
    if (Array.isArray(ids)) return ids.filter((id: any) => typeof id === 'number');
    return [];
  } catch {
    return [];
  }
}

export function getChallengeUrl(token: string): string {
  return `${window.location.origin}/challenge/${token}`;
}
