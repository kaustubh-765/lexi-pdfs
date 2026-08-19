'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getSession } from 'next-auth/react';

/**
 * Catches the one case a server-side redirect can't: the browser restoring
 * this page from bfcache (e.g. pressing Back after logging in) without any
 * server round-trip. Re-checks the session on a persisted pageshow event and
 * bounces to the dashboard if it turns out the user is still authenticated.
 */
export function useRedirectIfAuthenticated(): void {
  const router = useRouter();

  useEffect(() => {
    function handlePageShow(e: PageTransitionEvent) {
      if (!e.persisted) return;
      getSession().then((session) => {
        if (session?.user?.id) {
          router.replace('/dashboard');
        }
      });
    }

    window.addEventListener('pageshow', handlePageShow);
    return () => window.removeEventListener('pageshow', handlePageShow);
  }, [router]);
}
