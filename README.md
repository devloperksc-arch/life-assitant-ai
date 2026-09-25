# TADASHI — Autonomous Life Operating System (LifeOS)

> A proactive, modular, unified life-intelligence assistant designed to manage schedules, tasks, fitness, finances, habits, knowledge, and daily decision-making with high-agency autonomous replanning.

---

## 🌟 Highlights & Core Capabilities

- **Unified Intelligence**: Interconnected personal life management across 22 distinct life domains.
- **Proactive AI Assistant**: Interactive TADASHI Chat with real-time autonomous replanning, "What-If" scenario simulations, morning briefings, and actionable card interfaces (Approve / Edit / Reject).
- **Zero Dependencies / Zero Build Step**: Runs directly in any modern browser via pure vanilla HTML5, modern CSS3 (glassmorphism design system), and modular JavaScript.
- **Global Command Bar**: Instant quick-actions and search with `Ctrl + K`.
- **Sliding Context Drawer**: Real-time context inspection and system state monitoring.

---

## 📱 Modules Overview

| Domain | Features |
|---|---|
| **Home Dashboard** | Daily briefing, live stats, schedule timeline, urgent actions, active priorities |
| **TADASHI AI** | Conversational life agent, proactive plan proposals, conflict resolution, what-if simulator |
| **Schedule & Calendar** | Multi-view calendar, event collision detection, energy-based time blocking |
| **Tasks & Projects** | Task pipeline, priority filters, project hierarchies, instant status toggling |
| **Goals & OKRs** | Key results tracking, milestone progress, visual completion rings |
| **Study & Skills** | OS exam countdown, formula drills, spaced retention deck |
| **Heavy · Fitness & Workout** | Modeled after Heavy / Hevy: live workout sets × reps × kg logger, active rest timer countdown, Big 4 PRs & 1RM calculator, routine splits, and muscle heatmap |
| **Nutrition & Diet** | Calorie & macro tracking, meal planning, hydration logger |
| **Finance & Wealth** | Monthly budgets, expense categorization, net worth projection |
| **Shopping & Inventory** | Smart pantry list, price watches, purchase prioritizer |
| **Relationships** | Contact cadence, important date reminders, interaction notes |
| **Home Management** | Maintenance checklists, chore rotation, utility trackers |
| **Vehicle Care** | Service logs, mileage tracker, maintenance schedule |
| **Travel & Trips** | Itinerary planner, packing checklist, reservations organizer |
| **Document Vault** | Categorized document storage, expiry alerts, tag search |
| **Knowledge Base** | Second-brain notes, reference bookmarks, concept graph |
| **Routines & Habits** | Habit streaks, morning/evening checklist protocols |
| **Wellbeing & Mood** | Sleep analysis, mood journals, energy trends |
| **Digital Life** | Subscription auditor, backup statuses, digital asset management |
| **Entertainment** | Reading lists, media backlogs, game & movie queues |
| **System Analytics** | Holistic life score, weekly progress reports, optimization insights |
| **Settings & Security** | Data export/import JSON, safety pre-reset snapshot restore, Gemini API key configuration |

---

## 🔒 Security & Data Safety

- **No Hardcoded Secrets**: Gemini API keys are never stored in source code. Users can configure their personal key directly in the Settings & Security domain panel, stored securely in browser `localStorage`.
- **Destructive Action Confirmation**: All permanent deletes (tasks, heavy workout sets) and database resets require explicit user confirmation.
- **Safety Snapshots & Data Backups**:
  - **Export JSON**: Download a complete, full-fidelity JSON backup of all 22 domains.
  - **Import JSON**: Restore a previous JSON backup with validation and automatic pre-import safety snapshots.
  - **Pre-Reset Safety Snapshot**: Every database reset automatically preserves a pre-reset backup in `localStorage`, allowing one-click rollback if reset was triggered accidentally.

---

## 🚀 Getting Started

Simply open `index.html` in any modern web browser:

```bash
# Clone the repository
git clone https://github.com/devloperksc-arch/life-assitant-ai.git

# Navigate into directory
cd life-assitant-ai

# Open directly in browser (or serve with any static server)
# On Windows:
start index.html
```

---

## 🎨 Design System

- **Theme**: Obsidian Dark Glassmorphism
- **Accents**: Cyber Cyan (`#00f0ff`) & Neon Violet (`#7000ff`)
- **Typography**: Inter & JetBrains Mono with tabular figures
- **Interactions**: Smooth transitions, backdrop-filter blurs, micro-animations, keyboard shortcuts (`Ctrl+K`)
- **Architecture**: Clean, modular structure (`js/data.js`, `js/db.js`, `js/domain-pages.js`, `js/utils.js`, `js/lib/ai.js`, `js/lib/voice.js`) with legacy references preserved in `archive/`.