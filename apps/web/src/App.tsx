import { useEffect, useState } from 'react';
import { GlobalActivityBar } from './components/GlobalActivityBar';
import { SharedRoom } from './components/SharedRoom';
import { LoginPage } from './features/auth/LoginPage';
import { DashboardPage } from './features/dashboard/DashboardPage';
import { RoomPage } from './features/rooms/RoomPage';
import { supabase } from './lib/supabase';
import { AppRouter } from './routes/AppRouter';

/** Application composition and authentication state only. */
export default function App() {
  const [authenticated, setAuthenticated] = useState(false);
  const [ready, setReady] = useState(!supabase);

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => {
      setAuthenticated(Boolean(data.session));
      setReady(true);
    });
    const { data } = supabase.auth.onAuthStateChange((_event, session) =>
      setAuthenticated(Boolean(session)),
    );
    return () => data.subscription.unsubscribe();
  }, []);

  if (!ready) return null;

  return (
    <>
      <GlobalActivityBar />
      <AppRouter
        authenticated={Boolean(supabase && authenticated)}
        LoginScreen={LoginPage}
        DashboardScreen={DashboardPage}
        RoomScreen={RoomPage}
        SharedRoomScreen={SharedRoom}
      />
    </>
  );
}
