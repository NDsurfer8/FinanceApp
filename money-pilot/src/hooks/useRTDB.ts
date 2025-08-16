// src/hooks/useRTDB.ts
import {
  onValue,
  ref,
  off,
  set,
  push,
  update,
  DatabaseReference,
} from "firebase/database";
import { useEffect, useMemo, useState } from "react";
import { db } from "../services/firebase";

export function r(path: string): DatabaseReference {
  return ref(db, path);
}

export function useRTDB<T = any>(path?: string) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(!!path);
  const [error, setError] = useState<Error | null>(null);
  const node = useMemo(() => (path ? r(path) : null), [path]);

  useEffect(() => {
    if (!node) return;
    const unsub = onValue(
      node,
      (snap) => {
        setData((snap.val() ?? null) as T);
        setLoading(false);
      },
      (e) => {
        setError(e as Error);
        setLoading(false);
      }
    );
    return () => {
      off(node);
      unsub();
    };
  }, [node]);

  return { data, loading, error };
}

export const dbSet = (path: string, value: unknown) => set(r(path), value);
export const dbPush = (path: string, value: unknown) => push(r(path), value);
export const dbUpdate = (path: string, value: object) => update(r(path), value);
