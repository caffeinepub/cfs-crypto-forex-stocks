import { useState } from "react";

const STORAGE_KEY = "cfs_favorites";

function loadFavorites(): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const arr = JSON.parse(raw) as string[];
      return new Set(arr);
    }
  } catch {
    // ignore
  }
  return new Set();
}

function saveFavorites(set: Set<string>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(set)));
}

export function useFavorites() {
  const [favorites, setFavorites] = useState<Set<string>>(() =>
    loadFavorites(),
  );

  const isFavorite = (name: string) => favorites.has(name);

  const toggleFavorite = (name: string) => {
    setFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(name)) {
        next.delete(name);
      } else {
        next.add(name);
      }
      saveFavorites(next);
      return next;
    });
  };

  return { isFavorite, toggleFavorite, favoritesCount: favorites.size };
}
