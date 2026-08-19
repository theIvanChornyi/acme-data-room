import { useState, type FormEvent } from 'react';
import { ShieldCheck } from 'lucide-react';
import { messageFrom, WebMessages } from '../../lib/messages';
import { supabase } from '../../lib/supabase';

export function LoginPage() {
  const [mode, setMode] = useState<'sign-in' | 'sign-up'>('sign-in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const switchMode = (nextMode: 'sign-in' | 'sign-up') => {
    setMode(nextMode);
    setPassword('');
    setConfirmation('');
    setError('');
    setNotice('');
  };

  const signInWithGoogle = async () => {
    if (!supabase) return setError(WebMessages.auth.missingConfiguration);
    setError('');
    const { error: authError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    });
    if (authError) setError(authError.message);
  };

  const submitEmailPassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!supabase) return setError(WebMessages.auth.missingConfiguration);
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) return setError(WebMessages.auth.emailRequired);
    if (password.length < 8) return setError(WebMessages.auth.passwordTooShort);
    if (mode === 'sign-up' && password !== confirmation) {
      return setError(WebMessages.auth.passwordsDoNotMatch);
    }

    setSubmitting(true);
    setError('');
    setNotice('');
    try {
      if (mode === 'sign-up') {
        const { data, error: authError } = await supabase.auth.signUp({
          email: normalizedEmail,
          password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (authError) throw authError;
        if (!data.session) setNotice(WebMessages.auth.confirmEmail);
      } else {
        const { error: authError } = await supabase.auth.signInWithPassword({
          email: normalizedEmail,
          password,
        });
        if (authError) throw authError;
      }
    } catch (cause) {
      setError(messageFrom(cause, WebMessages.auth.failed));
    } finally {
      setSubmitting(false);
    }
  };

  const isSignUp = mode === 'sign-up';
  return (
    <main className="grid min-h-screen place-items-center p-6">
      <section className="w-full max-w-md rounded-2xl border bg-white p-8 shadow-card">
        <div className="mb-8 flex items-center gap-3">
          <div className="rounded-xl bg-brand p-2 text-white">
            <ShieldCheck size={22} />
          </div>
          <span className="font-semibold">Acme Data Room</span>
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">
          {isSignUp ? 'Create your account' : 'Due diligence, organized.'}
        </h1>
        <p className="mt-3 text-sm leading-6 text-slate-500">
          {isSignUp
            ? 'Create an account to securely manage your Data Rooms.'
            : 'Securely collect, organize, and share the documents your deal team needs.'}
        </p>
        <form className="mt-7 space-y-4" onSubmit={(event) => void submitEmailPassword(event)}>
          <label className="block text-sm font-medium text-slate-700">
            Email
            <input
              required
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@company.com"
              className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2.5 font-normal outline-none placeholder:text-slate-400 focus:border-brand focus:ring-2 focus:ring-brand/15"
            />
          </label>
          <label className="block text-sm font-medium text-slate-700">
            Password
            <input
              required
              type="password"
              minLength={8}
              autoComplete={isSignUp ? 'new-password' : 'current-password'}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="At least 8 characters"
              className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2.5 font-normal outline-none placeholder:text-slate-400 focus:border-brand focus:ring-2 focus:ring-brand/15"
            />
          </label>
          {isSignUp && (
            <label className="block text-sm font-medium text-slate-700">
              Confirm password
              <input
                required
                type="password"
                minLength={8}
                autoComplete="new-password"
                value={confirmation}
                onChange={(event) => setConfirmation(event.target.value)}
                placeholder="Repeat your password"
                className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2.5 font-normal outline-none placeholder:text-slate-400 focus:border-brand focus:ring-2 focus:ring-brand/15"
              />
            </label>
          )}
          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-lg bg-brand py-2.5 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? 'Please wait…' : isSignUp ? 'Create account' : 'Sign in'}
          </button>
        </form>
        {notice && (
          <p className="mt-4 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700" role="status">
            {notice}
          </p>
        )}
        {error && (
          <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700" role="alert">
            {error}
          </p>
        )}
        <div className="my-6 flex items-center gap-3 text-xs text-slate-400">
          <span className="h-px flex-1 bg-slate-200" />
          or
          <span className="h-px flex-1 bg-slate-200" />
        </div>
        <button
          onClick={() => void signInWithGoogle()}
          className="flex w-full items-center justify-center gap-3 rounded-lg border bg-white py-2.5 text-sm font-medium shadow-sm hover:bg-slate-50"
        >
          <span className="font-bold text-blue-500">G</span>Continue with Google
        </button>
        <p className="mt-6 text-center text-sm text-slate-500">
          {isSignUp ? 'Already have an account?' : 'New to Acme Data Room?'}{' '}
          <button
            type="button"
            onClick={() => switchMode(isSignUp ? 'sign-in' : 'sign-up')}
            className="font-medium text-brand hover:underline"
          >
            {isSignUp ? 'Sign in' : 'Create an account'}
          </button>
        </p>
        <p className="mt-5 text-center text-xs text-slate-400">
          Read-only sharing keeps your sensitive materials controlled.
        </p>
      </section>
    </main>
  );
}
