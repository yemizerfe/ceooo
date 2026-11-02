"use client";
// hooks/useAdminData.ts

import { useCallback, useEffect, useState } from "react";
import { adminRequest, AdminError } from "@/lib/adminApi";

export interface UseAdminDataState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Generic data hook for admin pages. Fetches via the authenticated admin API.
 */
export function useAdminData<T>(path: string): UseAdminDataState<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await adminRequest<T>(path);
      setData(result);
    } catch (e) {
      const err = e as AdminError;
      setError(err.message || "Failed to load data");
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { data, loading, error, refetch: fetch };
}
