import { useState, useEffect } from 'react';
import { collection, getDocs, query, limit } from 'firebase/firestore';
import { db } from '../lib/firebase';

export type DBStatus = 'checking' | 'connected' | 'error';

/**
 * Hook to check Firestore connection by doing a lightweight query to processed_scripts.
 * Runs once on mount, returns status: checking → connected | error
 */
export function useDBStatus(): DBStatus {
  const [status, setStatus] = useState<DBStatus>('checking');

  useEffect(() => {
    let isMounted = true;

    const checkConnection = async () => {
      try {
        // Lightweight query: just check if collection is accessible, limit to 1 doc
        const q = query(collection(db, 'processed_scripts'), limit(1));

        // Race against 8 second timeout
        const checkPromise = getDocs(q);
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('timeout')), 8000)
        );

        await Promise.race([checkPromise, timeoutPromise]);

        // Success
        if (isMounted) setStatus('connected');
      } catch (err) {
        if (isMounted) setStatus('error');
        console.error('DB connection check failed:', err);
      }
    };

    checkConnection();

    return () => {
      isMounted = false;
    };
  }, []);

  return status;
}
