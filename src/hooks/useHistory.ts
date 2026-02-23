import { useState, useEffect, useCallback } from 'react';
import { HistoryEntry } from '../types';
import { getHistory, clearHistory as clearAll } from '../services/telemetry';

export function useHistory() {
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const data = await getHistory();
      setEntries(data);
    } catch {
      setEntries([]);
    }
  }, []);

  useEffect(() => {
    refresh().finally(() => setLoading(false));
  }, [refresh]);

  const clearHistory = useCallback(async () => {
    await clearAll();
    setEntries([]);
  }, []);

  return { entries, loading, refresh, clearHistory };
}
