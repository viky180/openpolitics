'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from './AuthContext';

export function Header() {
    const pathname = usePathname();
    const router = useRouter();
    const { user, loading, signOut } = useAuth();

    const handleSignOut = async () => {
        await signOut();
        router.push('/');
        router.refresh();
    };

    const navLinks = [
        { href: '/', label: 'Parties' },
        { href: '/alliances', label: 'Alliances' },
    ];

    return (
        <header className="sticky top-0 z-50 bg-glass-bg backdrop-blur-md border-b border-glass-border">
            <div className="container mx-auto px-4 py-3 flex flex-col gap-3 sm:h-16 sm:flex-row sm:items-center sm:justify-between">
                {/* Logo */}
                <div className="flex items-center justify-between">
                    <Link href="/" className="flex items-center gap-2 group">
                        <span className="text-2xl transition-transform group-hover:scale-110">🏛️</span>
                        <span className="font-bold text-lg bg-gradient-to-br from-primary-light to-accent bg-clip-text text-transparent">
                            Open Politics
                        </span>
                    </Link>
                    {!loading && !user && (
                        <Link href="/auth" className="btn btn-primary btn-sm sm:hidden">
                            Sign In
                        </Link>
                    )}
                </div>

                {/* Navigation */}
                <nav className="flex flex-wrap items-center gap-2 sm:gap-3">
                    {navLinks.map(link => (
                        <Link
                            key={link.href}
                            href={link.href}
                            className={`px-3 py-2 rounded-md text-sm transition-all duration-200 ${pathname === link.href
                                ? 'bg-primary/10 text-primary-light font-medium'
                                : 'text-text-secondary hover:text-text-primary hover:bg-bg-hover'
                                }`}
                        >
                            {link.label}
                        </Link>
                    ))}

                    {!loading && (
                        <>
                            {user ? (
                                <div className="flex flex-wrap items-center gap-2 sm:gap-3 sm:ml-4 sm:pl-4 sm:border-l sm:border-border-primary">
                                    <Link href="/party/create" className="btn btn-primary btn-sm">
                                        + Create Party
                                    </Link>
                                    <Link href="/profile" className="btn btn-secondary btn-sm">
                                        Profile
                                    </Link>
                                    <div className="flex items-center gap-2">
                                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white text-xs font-bold shadow-sm">
                                            {user.user_metadata?.full_name?.[0]?.toUpperCase()
                                                || user.user_metadata?.name?.[0]?.toUpperCase()
                                                || user.email?.[0]?.toUpperCase()
                                                || 'U'}
                                        </div>
                                        <button
                                            onClick={handleSignOut}
                                            className="btn btn-secondary btn-sm"
                                        >
                                            Sign Out
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <Link href="/auth" className="btn btn-primary btn-sm hidden sm:inline-flex">
                                    Sign In
                                </Link>
                            )}
                        </>
                    )}
                </nav>
            </div>
        </header>
    );
}
