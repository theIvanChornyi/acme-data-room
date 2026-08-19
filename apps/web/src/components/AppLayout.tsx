import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { LogOut, ShieldCheck } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { AppRoutes } from '../routes/app-routes';

type AppLayoutProps = {
  children: ReactNode;
  workspace?: boolean;
};

/** Shared authenticated application shell. */
export function AppLayout({ children, workspace = false }: AppLayoutProps) {
  return (
    <div className={workspace ? 'flex min-h-screen flex-col' : undefined}>
      <header className="shrink-0 border-b bg-white">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5">
          <Link to={AppRoutes.dashboard} className="flex items-center gap-2 font-semibold">
            <span className="rounded-lg bg-brand p-1.5 text-white">
              <ShieldCheck size={17} />
            </span>
            Acme Data Room
          </Link>
          <button
            onClick={() => void supabase?.auth.signOut()}
            className="text-sm text-slate-500 hover:text-ink"
          >
            <LogOut className="mr-1 inline" size={16} />
            Sign out
          </button>
        </div>
      </header>
      <main
        className={
          workspace
            ? 'mx-auto flex min-h-0 w-full max-w-7xl flex-1 flex-col px-5 py-5'
            : 'mx-auto max-w-7xl px-5 py-10'
        }
      >
        {children}
      </main>
    </div>
  );
}
