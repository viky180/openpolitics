// Database types for Open Politics MVP
// Auto-generated from schema - keep in sync

export type Profile = {
  id: string;
  created_at: string;
  display_name: string | null;
  pincode: string | null;
  updated_at: string | null;
};

export type Party = {
  id: string;
  created_at: string;
  issue_text: string;
  pincodes: string[];
  created_by: string | null;
  updated_at: string | null;
};

export type PartyWithStats = Party & {
  member_count: number;
  level: 1 | 2 | 3 | 4;
  leader_id: string | null;
  leader_name: string | null;
  unanswered_questions: number;
};

export type Membership = {
  id: string;
  party_id: string;
  user_id: string;
  joined_at: string;
  left_at: string | null;
  leave_feedback: string | null;
};

export type MemberWithVotes = {
  user_id: string;
  display_name: string | null;
  joined_at: string;
  trust_votes: number;
  is_leader: boolean;
};

export type TrustVote = {
  id: string;
  party_id: string;
  from_user_id: string;
  to_user_id: string;
  created_at: string;
  expires_at: string;
};

export type PartyLike = {
  id: string;
  party_id: string;
  user_id: string;
  created_at: string;
};

export type Question = {
  id: string;
  party_id: string;
  asked_by: string | null;
  question_text: string;
  created_at: string;
  asker_name?: string | null;
};

export type QuestionWithAnswers = Question & {
  answers: Answer[];
  response_time_hours: number | null;
};

export type Answer = {
  id: string;
  question_id: string;
  answered_by: string | null;
  answer_text: string;
  created_at: string;
  answerer_name?: string | null;
};

export type Alliance = {
  id: string;
  name: string | null;
  created_at: string;
  disbanded_at: string | null;
};

export type AllianceMember = {
  id: string;
  alliance_id: string;
  party_id: string;
  joined_at: string;
  left_at: string | null;
};

export type AllianceMemberWithParty = AllianceMember & {
  party: Party;
};

export type AllianceWithMembers = Alliance & {
  members: AllianceMemberWithParty[];
};

// Legacy type alias for compatibility
export type AllianceWithParties = AllianceWithMembers;

export type SupportType = 'explicit' | 'implicit';
export type TargetType = 'issue' | 'question';

export type PartySupport = {
  id: string;
  from_party_id: string;
  to_party_id: string;
  support_type: SupportType;
  target_type: TargetType;
  target_id: string | null;
  created_at: string;
  expires_at: string | null;
};

export type SupportWithParty = PartySupport & {
  from_party: Party;
  is_revoked: boolean;
};

export type Revocation = {
  id: string;
  party_id: string;
  revoking_party_id: string;
  target_type: TargetType;
  target_id: string;
  reason: string | null;
  created_at: string;
};

export type Escalation = {
  id: string;
  source_party_id: string;
  target_party_id: string;
  created_at: string;
};

export type EscalationWithParties = Escalation & {
  source_party: Party;
  target_party: Party;
};

// Party Merge types
export type PartyMerge = {
  id: string;
  child_party_id: string;
  parent_party_id: string;
  merged_at: string;
  merged_by: string | null;
  demerged_at: string | null;
  demerged_by: string | null;
};

export type PartyMergeWithParent = PartyMerge & {
  parent_party: Party;
};

export type PartyMergeWithChild = PartyMerge & {
  child_party: Party;
};

export type MemberBreakdown = {
  party_id: string;
  issue_text: string;
  member_count: number;
  is_self: boolean;
};

// Party level calculation (deterministic)
export function calculatePartyLevel(memberCount: number): 1 | 2 | 3 | 4 {
  if (memberCount <= 10) return 1;
  if (memberCount <= 100) return 2;
  if (memberCount <= 1000) return 3;
  return 4;
}

// Q&A metrics
export type QAMetrics = {
  total_questions: number;
  unanswered_questions: number;
  avg_response_time_hours: number | null;
};

// Database schema type for Supabase client
export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: Omit<Profile, 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Profile, 'id' | 'created_at'>>;
      };
      parties: {
        Row: Party;
        Insert: Omit<Party, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Party, 'id' | 'created_at'>>;
      };
      memberships: {
        Row: Membership;
        Insert: Omit<Membership, 'id' | 'joined_at'>;
        Update: Partial<Omit<Membership, 'id' | 'party_id' | 'user_id' | 'joined_at'>>;
      };
      trust_votes: {
        Row: TrustVote;
        Insert: Omit<TrustVote, 'id' | 'created_at' | 'expires_at'>;
        Update: never;
      };
      party_likes: {
        Row: PartyLike;
        Insert: Omit<PartyLike, 'id' | 'created_at'>;
        Update: never;
      };
      questions: {
        Row: Question;
        Insert: Omit<Question, 'id' | 'created_at'>;
        Update: never;
      };
      answers: {
        Row: Answer;
        Insert: Omit<Answer, 'id' | 'created_at'>;
        Update: never;
      };
      alliances: {
        Row: Alliance;
        Insert: Omit<Alliance, 'id' | 'created_at' | 'disbanded_at'>;
        Update: Pick<Alliance, 'disbanded_at' | 'name'>;
      };
      alliance_members: {
        Row: AllianceMember;
        Insert: Omit<AllianceMember, 'id' | 'joined_at' | 'left_at'>;
        Update: Pick<AllianceMember, 'left_at'>;
      };
      party_supports: {
        Row: PartySupport;
        Insert: Omit<PartySupport, 'id' | 'created_at' | 'expires_at'>;
        Update: never;
      };
      revocations: {
        Row: Revocation;
        Insert: Omit<Revocation, 'id' | 'created_at'>;
        Update: never;
      };
      escalations: {
        Row: Escalation;
        Insert: Omit<Escalation, 'id' | 'created_at'>;
        Update: never;
      };
      party_merges: {
        Row: PartyMerge;
        Insert: Omit<PartyMerge, 'id' | 'merged_at' | 'demerged_at' | 'demerged_by'>;
        Update: Pick<PartyMerge, 'demerged_at' | 'demerged_by'>;
      };
    };
    Functions: {
      get_party_member_count: {
        Args: { p_party_id: string };
        Returns: number;
      };
      get_party_level: {
        Args: { p_party_id: string };
        Returns: number;
      };
      get_party_leader: {
        Args: { p_party_id: string };
        Returns: string | null;
      };
      get_user_trust_votes: {
        Args: { p_party_id: string; p_user_id: string };
        Returns: number;
      };
      get_party_total_members: {
        Args: { p_party_id: string };
        Returns: number;
      };
      get_party_member_breakdown: {
        Args: { p_party_id: string };
        Returns: MemberBreakdown[];
      };
      check_merge_cycle: {
        Args: { child_id: string; parent_id: string };
        Returns: boolean;
      };
    };
  };
};
