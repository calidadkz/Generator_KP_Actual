import { useState, useEffect, useCallback } from 'react';
import { fetchMonthlyUsage, aggregateCosts, getCurrentYearMonth, CostSummary, ApiUsageEntry } from '../lib/apiUsageLog';

export function useApiCosts(yearMonth?: string) {
  const ym = yearMonth ?? getCurrentYearMonth();
  const [summary, setSummary] = useState<CostSummary | null>(null);
  const [entries, setEntries] = useState<ApiUsageEntry[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchMonthlyUsage(ym);
      setEntries(data);
      setSummary(aggregateCosts(data));
    } finally {
      setLoading(false);
    }
  }, [ym]);

  useEffect(() => { load(); }, [load]);

  return { summary, entries, loading, refresh: load };
}
