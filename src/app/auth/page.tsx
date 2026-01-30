'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthContext';

export default function AuthPage() {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [displayName, setDisplayName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const router = useRouter();
    const { signIn, signInWithPassword, signUpWithPassword, user } = useAuth();
    const isDev = process.env.NODE_ENV === 'development';

    // Redirect if already signed in
    useEffect(() => {
        if (user) {
            router.push('/');
        }
    }, [user, router]);

    // Show nothing while redirecting
    if (user) {
        return null;
    }

    const handleGoogleSignIn = async () => {
        setLoading(true);
        setError(null);

        try {
            await signIn();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to sign in with Google');
        } finally {
            setLoading(false);
        }
    };

    const handlePasswordSignIn = async () => {
        setLoading(true);
        setError(null);

        try {
            await signInWithPassword(email, password);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to sign in with email/password');
        } finally {
            setLoading(false);
        }
    };

    const handlePasswordSignUp = async () => {
        setLoading(true);
        setError(null);

        try {
            await signUpWithPassword(email, password, displayName);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to sign up with email/password');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="container mx-auto px-4 py-10 sm:py-14 max-w-md">
            <div className="card-glass animate-fade-in">
                {/* Header */}
                <div className="text-center mb-8">
                    <span className="text-4xl">🏛️</span>
                    <h1 className="text-2xl font-bold mt-2 bg-gradient-to-br from-primary-light to-accent bg-clip-text text-transparent">
                        Open Politics
                    </h1>
                    <p className="text-text-muted text-sm mt-2">
                        Sign in to continue
                    </p>
                </div>

                {/* Error Display */}
                {error && (
                    <div className="rounded-xl border border-danger/40 bg-danger/10 px-4 py-3 text-danger text-sm mb-4">
                        {error}
                    </div>
                )}

                {/* Google Sign-In Button */}
                <button
                    onClick={handleGoogleSignIn}
                    disabled={loading}
                    className="w-full rounded-xl border border-border-primary bg-bg-secondary px-6 py-3 text-base font-medium text-text-primary transition-all duration-200 flex items-center justify-center gap-3 hover:bg-bg-tertiary hover:border-primary disabled:opacity-70 disabled:cursor-not-allowed"
                >
                    {/* Google Icon */}
                    <svg width="20" height="20" viewBox="0 0 24 24">
                        <path
                            fill="#4285F4"
                            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        />
                        <path
                            fill="#34A853"
                            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        />
                        <path
                            fill="#FBBC05"
                            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                        />
                        <path
                            fill="#EA4335"
                            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                        />
                    </svg>
                    {loading ? 'Signing in...' : 'Continue with Google'}
                </button>

                {isDev && (
                    <div className="mt-6 border-t border-border-primary pt-6">
                        <p className="text-xs uppercase tracking-widest text-text-muted mb-3">
                            Dev only: email/password
                        </p>
                        <div className="space-y-3">
                            <input
                                type="text"
                                placeholder="Display name (e.g. Test User)"
                                value={displayName}
                                onChange={(event) => setDisplayName(event.target.value)}
                                className="w-full rounded-xl border border-border-primary bg-bg-secondary px-4 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary/40"
                            />
                            <input
                                type="email"
                                placeholder="you@example.com"
                                value={email}
                                onChange={(event) => setEmail(event.target.value)}
                                className="w-full rounded-xl border border-border-primary bg-bg-secondary px-4 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary/40"
                            />
                            <input
                                type="password"
                                placeholder="password"
                                value={password}
                                onChange={(event) => setPassword(event.target.value)}
                                className="w-full rounded-xl border border-border-primary bg-bg-secondary px-4 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary/40"
                            />
                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    onClick={handlePasswordSignIn}
                                    disabled={loading || !email || !password}
                                    className="rounded-xl border border-border-primary bg-bg-secondary px-4 py-2 text-sm font-medium text-text-primary transition-all duration-200 hover:bg-bg-tertiary hover:border-primary disabled:opacity-70 disabled:cursor-not-allowed"
                                >
                                    Sign in
                                </button>
                                <button
                                    onClick={handlePasswordSignUp}
                                    disabled={loading || !displayName || !email || !password}
                                    className="rounded-xl border border-primary bg-primary/20 px-4 py-2 text-sm font-medium text-primary transition-all duration-200 hover:bg-primary/30 disabled:opacity-70 disabled:cursor-not-allowed"
                                >
                                    Sign up
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Philosophy Note */}
                <div className="mt-8 rounded-xl bg-bg-tertiary px-4 py-3 text-center">
                    <p className="text-text-muted text-xs">
                        🔓 No gatekeeping. Join freely. Leave freely.
                    </p>
                </div>
            </div>
        </div>
    );
}
