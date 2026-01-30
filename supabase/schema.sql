-- Open Politics MVP - Database Schema
-- Decentralized, issue-based political coordination platform

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- PROFILES (extends Supabase auth.users)
-- ============================================
CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    display_name TEXT,
    pincode TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- PARTIES (Issue-Parties)
-- Each party represents ONE issue tied to pincodes
-- ============================================
CREATE TABLE parties (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    issue_text TEXT NOT NULL CHECK (char_length(issue_text) <= 280),
    pincodes TEXT[] NOT NULL DEFAULT '{}',
    created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Profiles remain without primary affiliation fields

-- ============================================
-- MEMBERSHIPS
-- Join/leave freely, no penalties
-- ============================================
CREATE TABLE memberships (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    party_id UUID NOT NULL REFERENCES parties(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    joined_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    left_at TIMESTAMPTZ,
    leave_feedback TEXT,
    UNIQUE(party_id, user_id)
);

-- ============================================
-- TRUST VOTES
-- Each member can give ONE vote per party
-- Auto-expires (default 90 days)
-- ============================================
CREATE TABLE trust_votes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    party_id UUID NOT NULL REFERENCES parties(id) ON DELETE CASCADE,
    from_user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    to_user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '90 days') NOT NULL,
    UNIQUE(party_id, from_user_id)
);

-- ============================================
-- PARTY LIKES (non-exclusive user -> party signal)
-- Any signed-in user can like/unlike any party
-- ============================================
CREATE TABLE party_likes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    party_id UUID NOT NULL REFERENCES parties(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    UNIQUE(party_id, user_id)
);

-- ============================================
-- QUESTIONS (Q&A Board)
-- Public, cannot be deleted
-- ============================================
CREATE TABLE questions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    party_id UUID NOT NULL REFERENCES parties(id) ON DELETE CASCADE,
    asked_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    question_text TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ============================================
-- ANSWERS
-- ============================================
CREATE TABLE answers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
    answered_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    answer_text TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ============================================
-- ALLIANCES
-- Multi-party alliances (3+ parties supported)
-- Non-binding visibility links
-- ============================================
CREATE TABLE alliances (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT,  -- optional alliance name
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    disbanded_at TIMESTAMPTZ
);

-- ALLIANCE_MEMBERS (junction table)
-- Links parties to alliances
-- Each party can only be in ONE active alliance
CREATE TABLE alliance_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    alliance_id UUID NOT NULL REFERENCES alliances(id) ON DELETE CASCADE,
    party_id UUID NOT NULL REFERENCES parties(id) ON DELETE CASCADE,
    joined_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    left_at TIMESTAMPTZ
);

-- ============================================
-- PARTY SUPPORTS
-- Explicit: Direct support
-- Implicit: Through alliance chain
-- ============================================
CREATE TABLE party_supports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    from_party_id UUID NOT NULL REFERENCES parties(id) ON DELETE CASCADE,
    to_party_id UUID NOT NULL REFERENCES parties(id) ON DELETE CASCADE,
    support_type TEXT NOT NULL CHECK (support_type IN ('explicit', 'implicit')),
    target_type TEXT NOT NULL CHECK (target_type IN ('issue', 'question')),
    target_id UUID, -- References either party.id (issue) or questions.id
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 days'),
    UNIQUE(from_party_id, to_party_id, target_type, target_id)
);

-- ============================================
-- REVOCATIONS
-- Public, timestamped
-- ============================================
CREATE TABLE revocations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    party_id UUID NOT NULL REFERENCES parties(id) ON DELETE CASCADE,
    revoking_party_id UUID NOT NULL REFERENCES parties(id) ON DELETE CASCADE,
    target_type TEXT NOT NULL CHECK (target_type IN ('issue', 'question')),
    target_id UUID NOT NULL,
    reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ============================================
-- ESCALATIONS
-- Issue trail - immutable history
-- ============================================
CREATE TABLE escalations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    source_party_id UUID NOT NULL REFERENCES parties(id) ON DELETE CASCADE,
    target_party_id UUID NOT NULL REFERENCES parties(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ============================================
-- INDEXES for performance
-- ============================================
CREATE INDEX idx_memberships_party ON memberships(party_id) WHERE left_at IS NULL;
CREATE INDEX idx_memberships_user ON memberships(user_id) WHERE left_at IS NULL;
CREATE UNIQUE INDEX idx_memberships_user_active ON memberships(user_id) WHERE left_at IS NULL;
CREATE INDEX idx_trust_votes_party ON trust_votes(party_id, expires_at);
CREATE INDEX idx_trust_votes_to_user ON trust_votes(to_user_id, expires_at);
CREATE INDEX idx_questions_party ON questions(party_id);
CREATE INDEX idx_party_supports_to ON party_supports(to_party_id);
CREATE INDEX idx_alliances_active ON alliances(id) WHERE disbanded_at IS NULL;
CREATE UNIQUE INDEX idx_alliance_members_party_active ON alliance_members(party_id) WHERE left_at IS NULL;
CREATE INDEX idx_alliance_members_alliance ON alliance_members(alliance_id) WHERE left_at IS NULL;
CREATE INDEX idx_party_likes_party ON party_likes(party_id);
CREATE INDEX idx_party_likes_user ON party_likes(user_id);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE parties ENABLE ROW LEVEL SECURITY;
ALTER TABLE memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE trust_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE party_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE alliances ENABLE ROW LEVEL SECURITY;
ALTER TABLE alliance_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE party_supports ENABLE ROW LEVEL SECURITY;
ALTER TABLE revocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE escalations ENABLE ROW LEVEL SECURITY;

-- Profiles: Users can read all, update own
CREATE POLICY "Profiles are viewable by everyone" ON profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Parties: Public read, authenticated create
CREATE POLICY "Parties are viewable by everyone" ON parties FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create parties" ON parties FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Creators can update their parties" ON parties FOR UPDATE USING (auth.uid() = created_by);

-- Memberships: Public read, members manage own
CREATE POLICY "Memberships are viewable by everyone" ON memberships FOR SELECT USING (true);
CREATE POLICY "Users can join parties" ON memberships FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can leave parties" ON memberships FOR UPDATE USING (auth.uid() = user_id);

-- Trust Votes: Public read, voters manage own
CREATE POLICY "Trust votes are viewable by everyone" ON trust_votes FOR SELECT USING (true);
CREATE POLICY "Members can give trust votes" ON trust_votes FOR INSERT WITH CHECK (auth.uid() = from_user_id);
CREATE POLICY "Voters can withdraw votes" ON trust_votes FOR DELETE USING (auth.uid() = from_user_id);

-- Party Likes: Public read, users manage own
CREATE POLICY "Party likes are viewable by everyone" ON party_likes FOR SELECT USING (true);
CREATE POLICY "Users can like parties" ON party_likes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can unlike parties" ON party_likes FOR DELETE USING (auth.uid() = user_id);

-- Questions: Public read, anyone can ask
CREATE POLICY "Questions are viewable by everyone" ON questions FOR SELECT USING (true);
CREATE POLICY "Anyone can ask questions" ON questions FOR INSERT WITH CHECK (true);

-- Answers: Public read, members can answer
CREATE POLICY "Answers are viewable by everyone" ON answers FOR SELECT USING (true);
CREATE POLICY "Members can answer questions" ON answers FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Alliances: Public read, authenticated manage
CREATE POLICY "Alliances are viewable by everyone" ON alliances FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create alliances" ON alliances FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can update alliances" ON alliances FOR UPDATE USING (auth.uid() IS NOT NULL);

-- Alliance Members: Public read, authenticated manage
CREATE POLICY "Alliance members are viewable by everyone" ON alliance_members FOR SELECT USING (true);
CREATE POLICY "Authenticated users can join alliances" ON alliance_members FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can leave alliances" ON alliance_members FOR UPDATE USING (auth.uid() IS NOT NULL);

-- Party Supports: Public read, party members manage
CREATE POLICY "Supports are viewable by everyone" ON party_supports FOR SELECT USING (true);
CREATE POLICY "Parties can add support" ON party_supports FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Revocations: Public read/write
CREATE POLICY "Revocations are viewable by everyone" ON revocations FOR SELECT USING (true);
CREATE POLICY "Parties can revoke support" ON revocations FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Escalations: Public read, parties can escalate
CREATE POLICY "Escalations are viewable by everyone" ON escalations FOR SELECT USING (true);
CREATE POLICY "Parties can escalate issues" ON escalations FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- ============================================
-- FUNCTIONS
-- ============================================

-- Function to get active member count for a party
CREATE OR REPLACE FUNCTION get_party_member_count(p_party_id UUID)
RETURNS INTEGER AS $$
BEGIN
    RETURN (
        SELECT COUNT(*)::INTEGER
        FROM memberships
        WHERE party_id = p_party_id AND left_at IS NULL
    );
END;
$$ LANGUAGE plpgsql;

-- Function to get party level based on member count
CREATE OR REPLACE FUNCTION get_party_level(p_party_id UUID)
RETURNS INTEGER AS $$
DECLARE
    member_count INTEGER;
BEGIN
    member_count := get_party_member_count(p_party_id);
    IF member_count <= 10 THEN RETURN 1;
    ELSIF member_count <= 100 THEN RETURN 2;
    ELSIF member_count <= 1000 THEN RETURN 3;
    ELSE RETURN 4;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Function to get current leader of a party
CREATE OR REPLACE FUNCTION get_party_leader(p_party_id UUID)
RETURNS UUID AS $$
BEGIN
    RETURN (
        SELECT to_user_id
        FROM trust_votes
        WHERE party_id = p_party_id AND expires_at > NOW()
        GROUP BY to_user_id
        ORDER BY COUNT(*) DESC
        LIMIT 1
    );
END;
$$ LANGUAGE plpgsql;

-- Function to get trust vote count for a user in a party
CREATE OR REPLACE FUNCTION get_user_trust_votes(p_party_id UUID, p_user_id UUID)
RETURNS INTEGER AS $$
BEGIN
    RETURN (
        SELECT COUNT(*)::INTEGER
        FROM trust_votes
        WHERE party_id = p_party_id 
            AND to_user_id = p_user_id 
            AND expires_at > NOW()
    );
END;
$$ LANGUAGE plpgsql;

-- Trigger to create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, display_name)
    VALUES (
        NEW.id,
        COALESCE(
            NEW.raw_user_meta_data->>'full_name',
            NEW.raw_user_meta_data->>'name',
            NEW.raw_user_meta_data->>'display_name'
        )
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
