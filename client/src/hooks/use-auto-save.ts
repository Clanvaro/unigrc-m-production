import { useEffect, useRef, useCallback } from "react";

interface AutoSaveOptions<T> {
  data: T;
  key: string;
  enabled?: boolean;
  debounceMs?: number;
  onSave?: (data: T) => void;
}

export function useAutoSave<T>({
  data,
  key,
  enabled = true,
  debounceMs = 1000,
  onSave,
}: AutoSaveOptions<T>) {
  const timeoutRef = useRef<NodeJS.Timeout>();
  const previousDataRef = useRef<string>();

  const saveData = useCallback(() => {
    try {
      const serialized = JSON.stringify(data);
      
      // Only save if data has actually changed
      if (serialized !== previousDataRef.current) {
        localStorage.setItem(key, serialized);
        previousDataRef.current = serialized;
        onSave?.(data);
      }
    } catch (error) {
      console.error("Error saving to localStorage:", error);
    }
  }, [data, key, onSave]);

  useEffect(() => {
    if (!enabled) return;

    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Set new timeout for debounced save
    timeoutRef.current = setTimeout(() => {
      saveData();
    }, debounceMs);

    // Cleanup
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [data, enabled, debounceMs, saveData]);

  const clearSaved = useCallback(() => {
    try {
      localStorage.removeItem(key);
      previousDataRef.current = undefined;
    } catch (error) {
      console.error("Error clearing localStorage:", error);
    }
  }, [key]);

  const loadSaved = useCallback((): T | null => {
    try {
      const saved = localStorage.getItem(key);
      if (saved) {
        return JSON.parse(saved) as T;
      }
    } catch (error) {
      console.error("Error loading from localStorage:", error);
    }
    return null;
  }, [key]);

  return { clearSaved, loadSaved };
}
