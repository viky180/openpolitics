# Open Politics MVP

> 🏛️ A decentralized, issue-based political coordination platform for India

**Guiding Principle: Exit must always be easier than control.**

## 🎯 Core Philosophy

This platform enables grassroots political coordination without central authority:

- **No elections** - Leadership emerges through trust votes
- **No ideology** - Each party represents exactly ONE issue  
- **No moderation** - Algorithmic transparency, not human gatekeeping
- **No permanence** - All trust expires, all alliances are revocable

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- A Supabase project ([create one free](https://supabase.com))

### Setup

1. **Clone and install:**
```bash
cd openpolitics
npm install
```

2. **Configure Supabase:**
```bash
# Copy environment template
cp .env.local.example .env.local

# Edit with your Supabase credentials
# Get these from: Supabase Dashboard → Settings → API
```

3. **Set up database:**
   - Go to Supabase Dashboard → SQL Editor
   - Run `supabase/schema.sql` to create tables
   - Run `supabase/seed.sql` for demo data (optional)

4. **Run locally:**
```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000)

## 📊 System Architecture

### Party Levels (Automatic)
| Members | Level | Scope |
|---------|-------|-------|
| 1-10 | Level 1 | Local |
| 11-100 | Level 2 | District |
| 101-1000 | Level 3 | Regional |
| 1000+ | Level 4 | State+ |

### Trust Vote System
- Each member gives **ONE** trust vote per party
- Leader = member with highest active votes
- Votes **auto-expire in 90 days**
- Votes can be withdrawn anytime

### Support Propagation

```
┌─────────────────────────────────────────────────────┐
│                  SUPPORT FLOW                        │
├─────────────────────────────────────────────────────┤
│                                                      │
│   Large Party (L3)                                  │
│        │                                            │
│        │ ← EXPLICIT support to Small Party          │
│        ▼                                            │
│   Small Party (L1)                                  │
│        │                                            │
│        │ ← IMPLICIT support via alliance chain      │
│        ▼                                            │
│   Allied Parties automatically included             │
│                                                      │
│   ⚠️ Any party can REVOKE for specific issue        │
│   ⏱️ Implicit support expires in 30 days            │
│                                                      │
└─────────────────────────────────────────────────────┘
```

### Q&A Accountability
- Anyone can ask questions (public)
- Questions **can NEVER be deleted**
- Visible metrics:
  - Total questions
  - Unanswered count
  - Average response time

## 🗂️ Database Schema

```
profiles        → User profiles (extends Supabase auth)
parties         → Issue-parties (max 280 chars, pincodes[])
memberships     → Join/leave records with feedback
trust_votes     → Votes with auto-expiry (90 days)
questions       → Public Q&A (immutable)
answers         → Responses to questions
alliances       → Non-binding party links
party_supports  → Explicit/implicit support records
revocations     → Public support revocation log
escalations     → Issue escalation trail
```

## 📱 MVP Screens

| Screen | Route | Description |
|--------|-------|-------------|
| Home | `/` | Party discovery, stats, how-it-works |
| Auth | `/auth` | Sign up/sign in |
| Create Party | `/party/create` | Issue + pincodes form |
| Party Detail | `/party/[id]` | Members, Q&A, support tabs |
| Alliances | `/alliances` | All active alliances |
| Escalation | `/escalation/[id]` | Issue trail visualization |

## 🔒 Anti-Power Rules

### ❌ NOT Allowed
- Featured/trending content
- Manual promotion
- Admin political decisions
- Recommendation algorithms

### ✅ Allowed
- Filters (location, issue, size)
- Deterministic sorting only
- Transparent, documented logic

## 🧪 Demo Data

The seed data demonstrates:

1. **Small Party** (Level 1, 5 members)
   - "Clean Water for Jaipur 302001"
   
2. **Large Party** (Level 3, 150 members)
   - "Farmer Rights Maharashtra"

3. **Alliance** between small and large parties

4. **Explicit Support** 
   - Large party supports small party's issue

5. **Implicit Support**
   - Medium party implicitly supports via alliance

6. **Revocation**
   - Medium party revoked support for specific question

7. **Q&A**
   - 2 questions on large party (1 answered, 1 pending)
   - 1 question on small party

## 🛠️ Tech Stack

- **Frontend:** Next.js 14 (App Router), TypeScript
- **Styling:** Tailwind CSS (custom dark theme)
- **Backend:** Supabase (Auth + PostgreSQL + RLS)
- **Deployment:** Vercel-ready

## 📁 Project Structure

```
openpolitics/
├── src/
│   ├── app/              # Next.js App Router pages
│   ├── components/       # React components
│   ├── lib/             # Supabase clients
│   └── types/           # TypeScript types
├── supabase/
│   ├── schema.sql       # Database schema + RLS
│   └── seed.sql         # Demo data
└── .env.local.example   # Environment template
```

## 🔐 Environment Variables

```env
NEXT_PUBLIC_SUPABASE_URL=your_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

## 📜 License

Open source. No central authority over the code either.

---

*"The only way to deal with an unfree world is to become so absolutely free that your very existence is an act of rebellion."* — Albert Camus
