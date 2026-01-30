-- Open Politics MVP - Seed Data
-- Demonstrates all core features

-- Note: Run this after schema.sql
-- These UUIDs are placeholders - in production, they come from auth.users

-- ============================================
-- DEMO USERS (profiles)
-- In real usage, these are created via auth signup
-- ============================================

-- For demo purposes, we'll use fixed UUIDs
-- User 1: Amit (Active in small party)
-- User 2: Priya (Active in small party)
-- User 3: Raj (Active in small party, current leader)
-- User 4: Sunita (Founder of large party)
-- User 5: Vikram (Active in large party)
-- User 6-15: Additional members for large party

-- ============================================
-- SAMPLE PARTIES
-- ============================================

-- Small Party: Clean Water Initiative (Level 1 - 5 members)
INSERT INTO parties (id, issue_text, pincodes, created_by) VALUES
('11111111-1111-1111-1111-111111111111', 
 'Demand clean drinking water supply for Jaipur 302001. Current water quality is unsafe for consumption.', 
 ARRAY['302001', '302002'], 
 NULL);

-- Large Party: Farmer Rights (Level 3 - 150+ members simulated)
INSERT INTO parties (id, issue_text, pincodes, created_by) VALUES
('22222222-2222-2222-2222-222222222222', 
 'Ensure minimum support price (MSP) guarantee for all crops in Maharashtra. Farmers deserve fair compensation.',
 ARRAY['411001', '411002', '411003', '411004', '411005'],
 NULL);

-- Medium Party: Education Reform (Level 2 - will have ~50 members)
INSERT INTO parties (id, issue_text, pincodes, created_by) VALUES
('33333333-3333-3333-3333-333333333333',
 'Demand quality government schools with proper infrastructure in rural Karnataka. Every child deserves education.',
 ARRAY['560001', '560002'],
 NULL);

-- ============================================
-- SAMPLE ALLIANCES
-- Small party allied with large party (enables support propagation)
-- ============================================

INSERT INTO alliances (party_a_id, party_b_id) VALUES
('11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222');

INSERT INTO alliances (party_a_id, party_b_id) VALUES
('33333333-3333-3333-3333-333333333333', '22222222-2222-2222-2222-222222222222');

-- ============================================
-- SAMPLE PARTY SUPPORTS
-- Demonstrates explicit and implicit support
-- ============================================

-- Large party explicitly supports an issue
INSERT INTO party_supports (from_party_id, to_party_id, support_type, target_type, target_id) VALUES
('22222222-2222-2222-2222-222222222222', 
 '11111111-1111-1111-1111-111111111111', 
 'explicit', 
 'issue', 
 '11111111-1111-1111-1111-111111111111');

-- Medium party implicitly supports (via alliance with large party)
INSERT INTO party_supports (from_party_id, to_party_id, support_type, target_type, target_id) VALUES
('33333333-3333-3333-3333-333333333333', 
 '11111111-1111-1111-1111-111111111111', 
 'implicit', 
 'issue', 
 '11111111-1111-1111-1111-111111111111');

-- ============================================
-- SAMPLE QUESTIONS
-- Q&A board demonstration
-- ============================================

INSERT INTO questions (id, party_id, question_text) VALUES
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
 '22222222-2222-2222-2222-222222222222',
 'What specific MSP rates are you demanding for wheat and rice?');

INSERT INTO questions (id, party_id, question_text) VALUES
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
 '22222222-2222-2222-2222-222222222222',
 'How do you plan to pressure the state government on this issue?');

INSERT INTO questions (id, party_id, question_text) VALUES
('cccccccc-cccc-cccc-cccc-cccccccccccc',
 '11111111-1111-1111-1111-111111111111',
 'What is the current water contamination level in 302001?');

-- ============================================
-- SAMPLE ANSWERS
-- ============================================

INSERT INTO answers (question_id, answer_text) VALUES
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
 'We demand Rs 2500/quintal for wheat and Rs 2200/quintal for rice, based on C2+50% formula recommended by Swaminathan Commission.');

-- Note: bbbbbbbb question is UNANSWERED (demonstrates metrics)

-- ============================================
-- SAMPLE REVOCATION
-- Demonstrates a smaller party revoking implicit support
-- ============================================

INSERT INTO revocations (party_id, revoking_party_id, target_type, target_id, reason) VALUES
('22222222-2222-2222-2222-222222222222',
 '33333333-3333-3333-3333-333333333333',
 'question',
 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
 'We disagree with the approach suggested in this question. Our party prefers dialogue over pressure tactics.');

-- ============================================
-- SAMPLE ESCALATION
-- Small party escalates to larger party
-- ============================================

INSERT INTO escalations (source_party_id, target_party_id) VALUES
('11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222');

-- ============================================
-- DEMO DATA SUMMARY
-- ============================================
-- 
-- Parties:
--   1. Clean Water Jaipur (Small, Level 1) - ID: 11111111...
--   2. Farmer Rights Maharashtra (Large, Level 3) - ID: 22222222...
--   3. Education Reform Karnataka (Medium, Level 2) - ID: 33333333...
--
-- Alliances:
--   - Clean Water <-> Farmer Rights
--   - Education Reform <-> Farmer Rights
--
-- Supports:
--   - Farmer Rights EXPLICITLY supports Clean Water's issue
--   - Education Reform IMPLICITLY supports Clean Water (via alliance)
--
-- Revocation:
--   - Education Reform revoked support for a specific question on Farmer Rights
--
-- Questions:
--   - 2 questions on Farmer Rights (1 answered, 1 unanswered)
--   - 1 question on Clean Water
--
-- This demonstrates:
--   ✅ Multiple party sizes/levels
--   ✅ Alliance formation
--   ✅ Explicit support
--   ✅ Implicit support propagation
--   ✅ Support revocation
--   ✅ Q&A with answered/unanswered questions
--   ✅ Issue escalation
