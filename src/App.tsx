import React, { useState, useEffect } from 'react';
import { Analytics } from '@vercel/analytics/react';
import { AuthScreen } from './components/AuthScreen';
import { LoadingScreen } from './components/LoadingScreen';
import { MainApp } from './components/MainApp';
import { supabase, SupabaseUser } from './lib/supabase';

const App: React.FC = () => {
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Auth state management
  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setAuthLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  if (authLoading) return (
    <>
      <LoadingScreen />
      <Analytics />
    </>
  );
  if (!user) return (
    <>
      <AuthScreen />
      <Analytics />
    </>
  );
  return (
    <>
      <MainApp user={user} />
      <Analytics />
    </>
  );
};

export default App;
