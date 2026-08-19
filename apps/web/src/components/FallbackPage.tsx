import { Link } from 'react-router-dom';
import { ArrowLeft, ShieldAlert } from 'lucide-react';
import { WebMessages } from '../lib/messages';
import { AppRoutes } from '../routes/app-routes';

type FallbackPageProps = {
  title: string;
  message: string;
};

/** Safe exit screen for unavailable shared resources and broken navigation. */
export function FallbackPage({ title, message }: FallbackPageProps) {
  return (
    <main className="grid min-h-screen place-items-center p-6">
      <section className="w-full max-w-md rounded-xl border bg-white p-8 text-center shadow-card">
        <div className="mx-auto grid h-11 w-11 place-items-center rounded-xl bg-red-50 text-red-600">
          <ShieldAlert size={22} />
        </div>
        <h1 className="mt-5 text-xl font-semibold">{title}</h1>
        <p className="mt-2 text-sm leading-6 text-slate-500">{message}</p>
        <Link
          to={AppRoutes.dashboard}
          className="mt-6 inline-flex items-center gap-1.5 rounded-lg bg-brand px-3.5 py-2 text-sm font-medium text-white hover:bg-brand/90"
        >
          <ArrowLeft size={16} />
          Back to dashboard
        </Link>
      </section>
    </main>
  );
}

export function NotFoundPage() {
  return <FallbackPage title="Page not found" message={WebMessages.navigation.notFound} />;
}
