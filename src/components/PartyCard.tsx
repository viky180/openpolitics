import Link from 'next/link';
import type { Party } from '@/types/database';
import { calculatePartyLevel } from '@/types/database';

interface PartyCardProps {
    party: Party;
    memberCount?: number;
    showStats?: boolean;
    mergedInto?: string | null; // Parent party issue text if merged
}

export function PartyCard({ party, memberCount = 0, showStats = true, mergedInto }: PartyCardProps) {
    const level = calculatePartyLevel(memberCount);

    const levelStyles: Record<number, string> = {
        1: 'bg-slate-400/20 text-slate-500 border-slate-400',
        2: 'bg-blue-400/20 text-blue-500 border-blue-400',
        3: 'bg-violet-400/20 text-violet-500 border-violet-400',
        4: 'bg-amber-400/20 text-amber-500 border-amber-400',
    };

    const levelLabels: Record<number, string> = {
        1: 'Level 1 (Local)',
        2: 'Level 2 (District)',
        3: 'Level 3 (Regional)',
        4: 'Level 4 (State+)',
    };

    return (
        <Link
            href={`/party/${party.id}`}
            className="card group block no-underline transition-all hover:shadow-lg"
        >
            {/* Header with Level Badge */}
            <div className="flex justify-between items-start mb-3">
                <span className={`badge ${levelStyles[level] || levelStyles[1]}`}>
                    {levelLabels[level]}
                </span>
                {showStats && (
                    <span className="text-xs text-text-muted flex items-center gap-1 bg-bg-tertiary px-2 py-1 rounded-md">
                        👥 {memberCount}
                    </span>
                )}
            </div>

            {/* Issue Text */}
            <p className="text-[15px] leading-relaxed text-text-primary mb-4 line-clamp-3 font-medium group-hover:text-primary transition-colors">
                {party.issue_text}
            </p>

            {/* Pincodes */}
            <div className="flex flex-wrap gap-1.5">
                {party.pincodes.slice(0, 3).map((pincode, idx) => (
                    <span key={idx} className="pincode-tag">
                        📍 {pincode}
                    </span>
                ))}
                {party.pincodes.length > 3 && (
                    <span className="inline-flex items-center px-2 py-1 bg-bg-tertiary rounded text-xs text-text-muted font-medium">
                        +{party.pincodes.length - 3} more
                    </span>
                )}
            </div>

            {/* Merged Status */}
            {mergedInto && (
                <div className="mt-3 pt-3 border-t border-border-primary">
                    <span className="text-xs text-indigo-400 flex items-center gap-1">
                        🔗 Merged into: {mergedInto.slice(0, 40)}...
                    </span>
                </div>
            )}
        </Link>
    );
}
