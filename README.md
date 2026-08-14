# FitTracker: Enterprise-Grade Local-First Resistance Training Architecture

FitTracker is a high-performance, local-first mobile application engineered for resistance training tracking, progressive overload automation, and strength analytics. Built with React Native (SDK 54), TypeScript, and an embedded SQLite relational database engine, FitTracker delivers deterministic session tracking, 1RM estimation, and autoregulated workload recommendations without reliance on cloud services or external network infrastructure.

---

## Technical Overview

FitTracker addresses common failure modes in conventional workout applications—specifically server latency, network dependence, subscription paywalls, and privacy degradation—by adopting a strict Local-First software architecture. All data operations, time-series aggregations, and mathematical model evaluations execute synchronously against a local SQLite database on the mobile device.

The platform combines an Apple Fitness-inspired OLED pitch-black design language with custom 3D minimal avatar identities (FitMojis), background stopwatch telemetry, and dual-language localization (Spanish and English).

---

## Architectural Principles

### 1. Local-First Data Sovereignty
Data persistence is anchored in a local SQLite engine configured with Write-Ahead Logging (WAL) and ACID transactional boundaries. The application operates with zero external network calls, ensuring complete offline functionality, sub-30ms database write latencies, and total user privacy.

### 2. Clean Feature-First Domain Isolation
The codebase is structured according to Clean Architecture guidelines, strictly decoupling business logic from UI frameworks:
* **Domain Layer**: Pure TypeScript entities, mathematical formulas, and strength classification rules.
* **Use Cases Layer**: Orchestrators for set registration, session finalization, and recommendation retrieval.
* **Infrastructure / Data Layer**: SQLite client, DDL schemas, migrations, and repository adapters.
* **Presentation Layer**: React Native components organized into modular feature domains (`workout`, `progression`, `profile`).

### 3. Autoregulated Progressive Overload Engine
Upon completion of working sets, the internal overload engine evaluates historical performance data alongside subjective exertion metrics (Rating of Perceived Exertion / Repetitions in Reserve) to compute recommended target loads and repetition ranges for upcoming sessions.

---

## Core Capabilities

* **Exercise Catalog Management**: Searchable catalog of over 1,500 exercises structured by target muscle group, execution category, and equipment type, with support for custom exercise creation.
* **Predefined & Custom Routine Builder**: Pre-configured basic routines (Push, Pull, Legs) alongside custom multi-day routine creation tools.
* **Real-Time Set Logging & Tagging**: Live set recording supporting load ($kg$), repetitions ($r$), and RPE/RIR ($6.0 - 10.0$), with explicit set classification into Warmup (`[Calent.]`) or Effective (`[Efectiva]`).
* **Background Workout Telemetry**: Integration with background notification services to maintain live session duration stopwatches and rest timers when the application is minimized.
* **Native Line Chart Analytics**: Real-time 2D matrix rendering engine for 1RM and volume progression charting without third-party graphics dependencies.
* **Consistency Streak Buffer**: Rest-tolerant algorithm allowing up to a 3-day buffer between workouts before resetting the active consistency streak counter.
* **Data Portability**: Complete database export capability in serialized JSON format for user backups.

---

## Standalone APK & Beta Distribution Package

A compiled Android Package (APK) and Hermes bytecode bundle are pre-packaged in the workspace for direct device testing:

* **APK Package Location:** `builds/FitTracker-v1.0.0.apk`
* **Production Bundle:** `builds/bundle/`
* **Package Instructions:** `builds/README.md`

### Beta Tester Installation Guide (Android)
1. Share `builds/FitTracker-v1.0.0.apk` with beta testers via WhatsApp, Telegram, or Google Drive.
2. Open the `.apk` file on any Android mobile device.
3. Grant temporary permission to **"Install from unknown sources"** when prompted by Android OS.
4. Tap **Install** and launch FitTracker immediately.

---

## Technical Stack

* **Core Framework**: React Native (Expo SDK 54)
* **Programming Language**: TypeScript (Strict Type Checking)
* **Database Engine**: Expo SQLite (Embedded Relational SQLite Database)
* **UI & Theme Tokens**: Custom Vanilla CSS Tokens, Glassmorphism, OLED Pitch Black Base (`#000000`)
* **Typography**: Outfit (Telemetry & Numerics) and Plus Jakarta Sans (Body & UI Labels)
* **Background Notifications**: Expo Notifications Service
* **Testing Framework**: Jest with TypeScript Support
* **Documentation**: Formal LaTeX IEEE 830 Technical Specification (`docs/latex/main.pdf`)

---

## Database Architecture and Schema

The embedded SQLite database enforces strict referential integrity via foreign key constraints and cascade rules.

```sql
-- Exercises Table
CREATE TABLE exercises (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    type TEXT NOT NULL,
    equipment TEXT NOT NULL,
    gif_url TEXT,
    instructions TEXT
);

-- Workout Sessions Table
CREATE TABLE workout_sessions (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    date INTEGER NOT NULL,
    notes TEXT
);

-- Logged Exercise Sets Table
CREATE TABLE exercise_sets (
    id TEXT PRIMARY KEY NOT NULL,
    session_id TEXT NOT NULL,
    exercise_id TEXT NOT NULL,
    set_order INTEGER NOT NULL,
    weight_kg REAL NOT NULL,
    reps INTEGER NOT NULL,
    rpe REAL NOT NULL,
    is_warmup INTEGER NOT NULL DEFAULT 0,
    estimated_1rm REAL NOT NULL,
    rest_seconds INTEGER NOT NULL DEFAULT 0,
    FOREIGN KEY (session_id) REFERENCES workout_sessions (id) ON DELETE CASCADE,
    FOREIGN KEY (exercise_id) REFERENCES exercises (id) ON DELETE CASCADE
);

-- Athlete User Profile Table
CREATE TABLE user_profile (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    age INTEGER NOT NULL,
    sex TEXT NOT NULL,
    height_cm REAL NOT NULL,
    body_weight_kg REAL NOT NULL,
    experience_level TEXT NOT NULL,
    language TEXT NOT NULL DEFAULT 'es',
    avatar_key TEXT
);
```

---

## Mathematical Models and Algorithms

### 1RM Estimation Formulations

The platform evaluates peak session performance using validated mathematical models:

* **Epley Formula** (Primary 1RM Model):
  $$\text{1RM}_{Epley} = w \cdot \left(1 + \frac{r}{30}\right)$$

* **Brzycki Formula** (Secondary Validation Model):
  $$\text{1RM}_{Brzycki} = w \cdot \frac{36}{37 - r}$$

Where $w$ represents the weight lifted in kilograms and $r$ denotes completed repetitions ($r \le 10$).

### Progressive Overload Recommendation Matrix

The progressive overload engine evaluates completed effective sets against target repetition ranges and RIR boundaries:

$$\text{RIR} = 10.0 - \text{RPE}$$

* **Target Overload**: If average $\text{RIR} \ge 2.0$ and completed reps reach upper target boundary ($r \ge r_{max}$), the system recommends a load increment:
  $$\Delta w = +2.5\text{ kg (Compound)} \quad \text{or} \quad \Delta w = +1.25\text{ kg (Isolation)}$$
* **Maintenance**: If $0.5 \le \text{RIR} < 2.0$, load is maintained ($w_{rec} = w$).
* **Deload**: If $\text{RIR} < 0.5$ across consecutive sessions, a 10% load reduction is recommended ($w_{rec} = w \cdot 0.90$).

---

## Project Structure

```
fit-tracker/
├── assets/                       # Static branding and FitMojis image assets
├── docs/
│   └── latex/                    # Formal IEEE 830 LaTeX documentation
│       ├── main.tex              # Main LaTeX specification document
│       ├── references.bib        # BibTeX bibliography citations
│       └── sections/             # Modular document sections (01 to 09)
├── src/
│   ├── components/               # Shared reusable UI widgets and layout containers
│   ├── core/
│   │   └── theme/                # Design tokens, color palettes, and typography
│   ├── database/
│   │   ├── client.ts             # SQLite connection initialization
│   │   └── seeds/                # Seed script for catalog and initial routines
│   ├── domain/                   # Domain entities, value objects, and math formulas
│   └── features/
│       ├── profile/              # Athlete profile onboarding and FitMojis state
│       ├── progression/          # Progression analytics, 1RM, and line charts
│       └── workout/              # Active workout tracking, timer, and catalog
├── App.tsx                       # Main application entry point and root layout
├── jest.config.js                # Jest test runner configuration
└── package.json                  # Dependencies and script definitions
```

---

## Installation and Execution Setup

### Prerequisites

* Node.js (v18.0.0 or higher)
* npm (v9.0.0 or higher)
* Expo Go app installed on target mobile device (Android / iOS)

### Installation Steps

1. Clone the repository:
   ```bash
   git clone https://github.com/jxliian/irrgartenugrjxli.git
   cd fit-tracker
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the Expo development server:
   ```bash
   npm start
   ```

4. Validate TypeScript static typing:
   ```bash
   npx tsc --noEmit
   ```

---

## Automated Testing Suite

The codebase maintains full test coverage over core domain mathematical calculators, strength rank classifications, and database use case orchestrators.

To execute the automated test suite:

```bash
npm test
```

### Test Suite Execution Coverage

```
PASS src/features/workout/use-cases/__tests__/finish-workout-session.test.ts
PASS src/features/progression/domain/__tests__/strength-ranks.test.ts
PASS src/features/progression/use-cases/__tests__/get-exercise-history.test.ts
PASS src/domain/__tests__/streak.test.ts
PASS src/features/workout/use-cases/__tests__/create-workout-session.test.ts
PASS src/features/workout/use-cases/__tests__/search-exercises.test.ts
PASS src/features/progression/domain/__tests__/calculators.test.ts
PASS src/features/workout/use-cases/__tests__/register-set.test.ts
PASS src/features/progression/use-cases/__tests__/get-progression-recommendation.test.ts

Test Suites: 9 passed, 9 total
Tests:       33 passed, 33 total
```

---

## Formal Technical Documentation (LaTeX)

The formal academic software engineering specification is located in `docs/latex/`. To compile the complete 19-page IEEE 830 technical specification PDF:

```bash
cd docs/latex
pdflatex main.tex
bibtex main
pdflatex main.tex
pdflatex main.tex
```

The output file `docs/latex/main.pdf` contains the full SRS specification, UML diagrams, mathematical proofs, and database DDL schemas.

---

## Data Privacy and Security

FitTracker guarantees 100% data privacy:
* Zero analytics trackers or third-party telemetry.
* Zero remote network requests or server synchronization.
* Device-isolated local storage within the operating system app container.

---

## Third-Party Dataset Acknowledgments

We formally credit **Hasan Yıldırım** for the open-source [exercises-dataset](https://github.com/hasaneyldrm/exercises-dataset), which provides the initial dataset of exercise names, muscle group metadata, and equipment classifications powering the offline exercise catalog.
