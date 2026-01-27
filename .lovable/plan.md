

# Micro-Mentor Dispatch - Full Implementation Plan

## Overview
A professional, glacier-themed instant mentorship platform connecting coding/dev experts with learners. Features AI-powered matching, real-time chat, video calls, and seamless payments.

---

## 🎨 Design System: "Glacier Professional"

### Visual Identity
- **Light base**: Clean whites (#FAFBFC) with subtle glacier blue tints
- **Primary accent**: Deep glacier blue (#0EA5E9 to #0284C7)
- **Success**: Mint green (#10B981) for positive actions
- **Premium touches**: Subtle gradients, frosted glass effects, soft shadows
- **Typography**: Inter for UI, JetBrains Mono for code snippets
- **Animations**: Smooth, professional transitions - no flashy effects

### Key UI Elements
- Frosted glass cards with subtle backdrop blur
- Status indicators (green dot = online, blue = busy, gray = offline)
- Progress rings for goals and session timers
- Clean iconography with Lucide icons

---

## 📱 Core Pages & Navigation

### 1. Landing Page (Conversion-Optimized)
- Hero section with value proposition: "Get Expert Dev Help in 60 Seconds"
- Live stats ticker (mentors online, sessions today, devs helped)
- Quick help form above fold: Category selector + issue description + "Find Mentors"
- How it works: 4-step visual flow
- Category showcase grid (50+ dev & gaming categories)
- Testimonials carousel with real developer quotes
- Pricing explainer ($1.99 chat sessions, $4.99 video calls)
- Top online mentors spotlight
- Newsletter signup + "Become a Mentor" CTA

### 2. Authentication
- Unified signup/login modal with email or magic link
- Role selection with smooth toggle (I want help / I can help / Both)
- Profile onboarding wizard:
  - Skills matrix selector (multi-select with search)
  - Goals builder with templates
  - Availability calendar
  - Profile photo & bio (AI bio generator using Lovable AI)

### 3. Dashboard (Role-Adaptive)
**Mentee View:**
- Goal tracker (kanban-style: To Do → In Progress → Done)
- Session history with outcomes
- AI insights: "You're 60% toward mastering React hooks"
- Wallet balance with quick top-up

**Mentor View:**
- Earnings graph (daily/weekly/monthly)
- Live request queue with accept/decline
- Availability heatmap editor
- Client history & repeat clients

**Admin View (role-gated):**
- Global stats (users, sessions, revenue)
- Moderation queue
- User management & bans
- Category CRUD

### 4. Quick Help / Search
- Category chips (click to filter)
- Issue description textarea with AI auto-complete
- Image/code snippet upload (drag-drop)
- Filters: Price range, Rating 4+, Online Now, Response time
- Infinite scroll mentor cards with live status
- AI matching powered by Lovable AI (scores top mentors for the query)

### 5. Mentor Profile Pages
- Public profile with expertise, ratings, reviews
- Skills badges and certifications
- Availability calendar view
- Session pricing and stats
- "Request Session" CTA

### 6. Chat Interface
- Real-time messaging via Supabase Realtime
- Code blocks with syntax highlighting
- Image/file sharing with drag-drop
- Emoji picker
- Session timer with extend option (+5min for $1)
- "Start Video Call" button
- Side panel: Session info, AI-suggested resources
- End session flow: Rating + goal progress update

### 7. Video Calling (Twilio)
- Pre-call check (camera/mic test)
- P2P video room with screen sharing
- Chat sidebar during call
- Recording opt-in (stored in Supabase Storage)
- Post-call: AI-generated transcript summary
- Rating prompt

### 8. Wallet & Payments
- Balance display with top-up options (€5, €10, €50 with bonuses)
- Transaction history
- Mentor payouts (min €20, weekly SEPA)
- Stripe Checkout integration
- Dynamic pricing (peak hours +20%)

### 9. Notifications
- Real-time push (new match, message, session end)
- In-app notification center with bell icon
- Email digests (configurable)

### 10. Profile & Settings
- Edit profile (bio, skills, goals)
- AI bio polish using Lovable AI
- Calendar sync (availability)
- Notification preferences
- Account settings (email, password, 2FA placeholder)

---

## 🗄️ Database Schema (Supabase)

### Tables
1. **profiles** - Extended user data (name, bio, location, timezone, skills[], goals[], rating_avg, total_sessions, wallet_balance, is_online, stripe_customer_id)

2. **user_roles** - Role management (user_id, role: mentee/mentor/admin)

3. **sessions** - Mentorship sessions (mentee_id, mentor_id, categories[], issue_description, status, start_time, duration, price, rating, notes, recording_url)

4. **messages** - Chat messages (session_id, sender_id, content, image_urls[], is_read, created_at)

5. **matches** - AI match results (mentee_id, mentor_id, score, status)

6. **categories** - Pre-populated 50+ categories with icons (name, icon, parent_category, description)

7. **notifications** - User notifications (user_id, type, data, is_read)

8. **transactions** - Wallet transactions (user_id, type, amount, stripe_payment_id, status)

9. **availability** - Mentor availability slots (user_id, day_of_week, start_time, end_time)

10. **reviews** - Session reviews (session_id, reviewer_id, rating, comment)

### Security
- Row Level Security (RLS) on all tables
- Role-based access via security definer functions
- Separate user_roles table (not on profiles - security best practice)

---

## 🤖 AI Features (Lovable AI)

### Mentor Matching
- Score mentors based on skills match, issue keywords, availability, and ratings
- Real-time suggestions as user types issue

### Session Summaries
- Auto-generate key takeaways after each session
- Store in session notes

### Goal Coach
- Analyze user's sessions and goals
- Provide personalized next-step recommendations

### Bio Generator
- Polish user bios for better matching
- Suggest skill keywords

---

## 💳 Payments (Stripe)

### Session Payments
- Pre-pay from wallet or direct card charge
- Base: $1.99/10min chat, $4.99/15min video
- Dynamic pricing: +20% peak, -10% slow periods

### Wallet System
- Top-up with bonuses (10% on $50+)
- Automatic deduction for sessions
- Refund handling

### Mentor Payouts
- 80% mentor / 20% platform split
- Weekly automatic payouts (Stripe Connect)
- Minimum $20 for withdrawal

---

## 📹 Video Calls (Twilio)

### Integration
- Edge function to generate Twilio access tokens
- P2P video rooms for low latency
- Screen sharing capability
- Recording with cloud storage

### UX Flow
- Pre-call device check
- In-call controls (mute, camera, screen share, end)
- Post-call summary and rating

---

## 🎮 Categories (50+ Pre-Populated)

**Coding:**
Java, React, Next.js, Python, JavaScript, TypeScript, Node.js, Express, Supabase, Firebase, PostgreSQL, APIs, Webhooks, Git, CI/CD, Docker, AWS, Testing

**Gaming:**
Valorant, CS:GO, Apex Legends, Fortnite, Minecraft (plugins, economy), Roblox, Discord bots

**Business:**
Skin arbitrage, Marketplace building, Content creation, SEO

**DevOps:**
VPS setup, GitHub Actions, Deployment, Database optimization

---

## 🔔 Notifications System
- Supabase Realtime for instant in-app notifications
- Email via Resend for digests
- Types: new_match, new_message, session_start, session_end, payment_received

---

## 📊 Analytics Dashboard (Admin)
- Real-time user count
- Session funnel (search → match → session → complete)
- Revenue tracking
- Top categories and mentors

---

## 🌍 Global Features
- Multi-currency (USD, EUR, GBP)
- Timezone-aware scheduling
- English interface (i18n-ready structure for future expansion)

---

## 🚀 Technical Implementation

### Backend: Lovable Cloud + Supabase
- Supabase Auth for authentication
- Supabase Postgres for data
- Supabase Realtime for chat and presence
- Supabase Storage for images and recordings
- Edge Functions for Stripe webhooks, Twilio tokens, AI calls

### Frontend: React + Tailwind
- shadcn/ui component library
- React Query for data fetching
- React Router for navigation
- Responsive design (mobile-first)

### Integrations
- Stripe (payments, Connect for payouts)
- Twilio (video calls)
- Lovable AI (matching, summaries)

---

## 📱 Mobile Experience
- Responsive design throughout
- Bottom navigation on mobile
- Touch-optimized interactions
- PWA-ready structure

---

This plan delivers a comprehensive, production-ready mentorship platform with all the features you requested, using a clean glacier aesthetic and leveraging Lovable's built-in capabilities for rapid development.

