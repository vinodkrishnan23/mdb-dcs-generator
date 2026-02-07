# Project Specification: MongoDB DCS Generator

**Role:** You are a Principal Full Stack Engineer.
**Goal:** Build a Next.js 15 application that generates "Discovery Capture Sheets" (DCS) from sales transcripts using a Multi-Agent AI architecture.

## 1. Tech Stack & Constraints
- **Framework:** Next.js 15 (App Router, Server Actions).
- **Database:** MongoDB Atlas (via Mongoose). **Store raw transcript text directly in MongoDB (No S3).**
- **AI:** Vercel AI SDK (`ai` package).
  - Provider: `@ai-sdk/google`.
  - Model String: `google('models/gemini-3-pro-preview')` (Supports 2M context).
- **Validation:** Zod (Strict output schemas).
- **Styling:** Tailwind CSS + Lucide React.

## 1.1 Clarifications & Logic Rules
### 1. Workload ID Generation
- **Decision:** Use `crypto.randomUUID()` to generate a unique string ID for every detected workload.
- *Why:* Relying on `workloadName` is risky if the AI generates slightly different names on re-runs.

### 2. Token Usage & Cost
- **Decision:** Track token usage as the **SUM** of all passes (Router + Slicer + Extraction Agents).

### 3. Status Updates (UI Feedback)
- **Decision:** Keep it simple.
  - `IDLE`: No action yet.
  - `PROCESSING`: Global loading state.
  - `COMPLETED`: Data is ready.
- *Implementation:* Show a spinner saying "Analyzing Transcripts..." during `PROCESSING`.

### 4. Confidence Threshold Logic
- **Decision:** **FILTER OUT** workloads with `< 0.6` confidence.
- *Logic:* In `actions/generate.ts`, filter the array returned by the Router Agent *before* entering the extraction loop.

### 5. Data Migration (Handling Old Data)
- **Decision:** **Fresh Start (Destructive Update).**
- *Logic:* When `generateDCS(accountId)` is called, **OVERWRITE** the existing `dcsData` array completely.

---

## 2. Database Schema (Mongoose)

### `models/Account.ts`
- `name`: String
- `industryContext`: String (e.g., "FinTech")
- `transcriptIds`: [ObjectId ref 'Transcript']
- `dcsData`: **Array** of Objects
  - Schema: `[{ workloadId: String, workloadName: String, ...FullDCS_Object }]`
- `status`: String ('IDLE', 'PROCESSING', 'COMPLETED')
- `totalTokensUsed`: Number (Optional, for tracking)

### `models/Transcript.ts`
- `accountId`: ObjectId (index: true)
- `filename`: String
- `fullText`: String (Max 16MB document limit is fine for text)
- `uploadedAt`: Date

---

## 3. The "Brain" Architecture (Critical)

### The "Router + Fan-Out" Architecture
Implement `actions/generate.ts` using a **Two-Pass Strategy**:

#### Pass 1: The Router Agent
- **Goal:** Identify distinct workloads.
- **Prompt:** "Identify distinct software projects/workloads discussed. Return a list. Ignore minor features."
- **Schema:** `routerSchema`

#### Pass 2: The Slicer & Extraction Loop (Updated)
Iterate through each valid opportunity (`confidence > 0.6`). Do NOT pass the raw transcript to the extraction agents.

**Step 2a: The Slicer Agent (The Firewall)**
For each opportunity, run a specialized AI call to generate a **Sanitized Context**.
- **Goal:** Remove all text unrelated to the specific workload.
- **Prompt:**
  > "You are a Context Filter. Read the transcript below.
  > REWRITE the transcript to include ONLY the dialogue, facts, and context relevant to the workload: '${opp.workloadName}'.
  > REMOVE all discussion about other projects.
  > IF a metric (e.g. '5TB data') is not explicitly linked to this workload, DELETE IT.
  > RETURN only the filtered text."
- **Output:** `sanitizedContext` (String)

**Step 2b: The Scoped Extraction Chain**
Run the **3-Agent Chain** (Technical, Commercial, Strategy) in parallel using the `sanitizedContext` (NOT the full text).

#### Agent 1: The Technical Architect
**Focus:** Hardware, Topology, Latency, Version numbers.
**System Prompt:**
> "You are a Principal Architect. Extract ONLY technical evidence: specific instance types (e.g. m5.large), database versions, topology (Replica Set vs Sharded), and metrics (latency, throughput). Ignore sales politics.
>
> **A. ACCOUNT & WORKLOAD**
> - **Workload Name:** Format: "App Name / Project Name".
> - **Industry Context:** What do they sell? Who do they serve?
>
> **B. TECHNICAL DEEP DIVE (Current vs. Future)**
> - **Current State Description:** Provide a detailed explanation of the current solution and architecture.
> - **Current Architecture:** Topology, Hardware, Data Flow, Metrics.
> - **Negative Consequences:** Link Technical Root Cause -> Business Impact.
> - **Future State:**
>   - **Proposed Solution:** detailed explanation of the proposed MongoDB Atlas solution, implementation, migration strategy.
>   - **Specific Features:** Time Series, Search, Vector, Online Archive.
>   - **Outcomes:** Measurable success metrics."

#### Agent 2: The Commercial Manager
**Focus:** Stakeholders, Timeline, Partners.
**System Prompt:**
> "You are a Sales Manager. Extract ONLY: Stakeholders (Buyer vs Champion), Partner ecosystem (Cloud/SI), and Timelines.
>
> **A. STAKEHOLDERS (The "Political Map")**
> - **Who reports to whom?**
> - **Psychographics:** Confidence, Scars, Motivation.
> - **Sentiment Analysis:** Capture sentiment for non-MongoDB attendees (e.g., 'Skeptical about migration', 'Enthusiastic').
> - **Role:** Economic Buyer vs Technical Champion.
>
> **B. PARTNERS & EVALUATION**
> - **Cloud:** AWS/Azure/GCP? Committed Spend?
> - **SIs:** Accenture/TCS? Design vs Delivery?
> - **Process:** PoC -> Security -> Procurement -> Sign-off.
>
> **C. TIMELINE & URGENCY**
> - **No Date, No Deal:** Exact launch date.
> - **Compelling Event:** What happens if they miss it?
> - **Consequence of Delay:** Financial/Business impact.
> - **All Dates Discussed:** Capture ALL dates mentioned (e.g., 'March 15 - PoC deadline') with context."

#### Agent 3: The Deal Strategist
**Focus:** Logic mapping (Sales Motion, Value Drivers).
**System Prompt:**
> "You are a Deal Strategist. Determine the Sales Motion based on strict definitions. Map pain points to Value Drivers.
>
> **A. VALUE DRIVERS**
> Map every pain point to: Compete, Save Money, Reduce Risk, or Dev Velocity.
>
> **B. SALES MOTION LOGIC**
> - **Migrate:** From Mongo Community/DocDB/Cosmos.
> - **Replace:** From RDBMS/Cassandra.
> - **Launch:** New application.
> - **Select:** New app, already selected Mongo.
>
> **C. TIGER SALES ROUTE**
> - **Classic:** Complex, competitive.
> - **Sprint:** Urgent, single decision maker.
> - **Fast:** Decision made, execution focus."
> **D. THE 3 WHYS (Strict Qualification)**
> 1. **Why Anything?** (Pain & Objective): Look for 'Bleeding Neck' issues. Why can't they stay on the current system? 
>    - *If found:* Extract specific pains (e.g., 'Crashes every Friday').
>    - *If missing:* Mark as MISSING.
> 2. **Why MongoDB?** (Differentiation): Why us? Why not Postgres or DynamoDB or any otehr database?
>    - *If found:* Map features to pains (e.g., 'Relational Migrator reduces risk').
>    - *If missing:* Mark as MISSING.
> 3. **Why Now?** (Urgency): Is there a Compelling Event?
>    - *If found:* Extract the Date and the Event.
>    - *If missing:* Mark as MISSING. 'Q4' is not a compelling event; 'Audit on Nov 1st' is.
>
> **E. GAP ANALYSIS (The Coach)**
> based *strictly* on what is MISSING in the 3 Whys above, generate 3-5 Discovery Questions for the Sales Rep.
> - **Bad Question:** 'Why do you want to move now?'
> - **Good Question:** 'You mentioned the Oracle license expires in Q4—what is the specific date, and what is the financial penalty if we miss that window?'
> - **Good Question:** 'You mentioned latency is an issue—how is that specifically impacting your mobile users' cart abandonment rate?'"

**Aggregation:**
- Wait for all Promises to resolve.
- Construct the final array: `[{ workloadId, workloadName, ...tech, ...comm, ...strat }, ...]`
- Save to `Account.dcsData`.

---

## 4. Zod Schemas (`lib/schemas.ts`)

```typescript
import { z } from 'zod';

// 0. Router Schema
export const routerSchema = z.object({
  opportunities: z.array(z.object({
    workloadName: z.string().describe("Name of the app/project"),
    contextDescription: z.string().describe("1-sentence summary used to filter context"),
    confidenceScore: z.number().describe("0-1 score. Ignore if < 0.6")
  }))
});

// 1. Technical Schema
export const technicalSchema = z.object({
  currentState: z.object({
    currentStateDescription: z.string().describe("Detailed explanation of current solution/architecture"),
    architecture: z.object({
      topology: z.string().describe("Standalone, Replica Set, or Sharded"),
      infrastructure: z.string().describe("Hosting details (e.g. AWS EC2 r5.xlarge)"),
      databaseVersion: z.string().optional()
    }),
    metrics: z.object({
      dataSize: z.string().optional().describe("GB/TB"),
      latency: z.string().optional().describe("ms"),
      throughput: z.string().optional().describe("RPS/QPS")
    }),
    painPoints: z.array(z.object({
      currentStateDescription: z.string().optional(),
      technicalRootCause: z.string().describe("Specific cause (e.g. No Compression)"),
      businessImpact: z.string().describe("Impact (e.g. High Storage Cost)")
    }))
  }),
  futureState: z.object({
    futureStateDescription: z.string().optional(),
    proposedArchitecture: z.string(),
    proposedSolution: z.string().describe("Detailed explanation of proposed solution & migration strategy"),
    positiveBusinessOutcome: z.string(),
    requiredCapabilities: z.array(z.string()).describe("Shopping List (e.g. Time Series)"),
    successMetrics: z.array(z.string()).describe("Success measures (e.g. latency < 10ms)")
  })
});

// 2. Commercial Schema
export const commercialSchema = z.object({
  accountInfo: z.object({
    accountName: z.string(),
    workloadName: z.string()
  }),
  stakeholders: z.array(z.object({
    name: z.string(),
    role: z.enum(['Economic Buyer', 'Technical Champion', 'User', 'Influencer', 'Unknown']),
    notes: z.string().describe("Psychographics, sentiment analysis (skeptical/enthusiastic), and political stance")
  })),
  partners: z.object({
    cloudProvider: z.string(),
    systemIntegrators: z.array(z.string()),
    hasCommittedSpend: z.boolean().optional()
  }),
  timeline: z.object({
    targetGoLiveDate: z.string().optional(),
    compellingEvent: z.string().describe("External pressure (e.g. Diwali)"),
    consequenceOfDelay: z.string(),
    allDatesDiscussed: z.array(z.object({
      date: z.string().describe("Date mentioned"),
      description: z.string().describe("Significance of this date")
    })).describe("List of all dates mentioned with context")
  })
});

// 3. Strategy Schema
export const strategySchema = z.object({
  salesMotion: z.enum(['Migrate', 'Replace', 'Launch', 'Select']),
  tigerSalesRoute: z.enum(['Tiger Classic', 'Tiger Sprint', 'Tiger Fast']),
  valueDrivers: z.array(z.object({
    category: z.enum(['Compete / Revenue', 'Save Money', 'Reduce Risk', 'Dev Velocity']),
    justification: z.string().describe("Evidence from text")
  })),
  // The "3 Whys" Framework
  threeWhys: z.object({
    whyAnything: z.object({
      status: z.enum(['FOUND', 'PARTIAL', 'MISSING']),
      challenges: z.array(z.string()).describe("Pain points making current state untenable (e.g. 'Downtime costs $10k/hr')"),
      objectives: z.array(z.string()).describe("Future goals (e.g. 'Scale to 1M users')"),
      missingInfo: z.string().optional().describe("What specific details are missing?")
    }),
    whyMongoDB: z.object({
      status: z.enum(['FOUND', 'PARTIAL', 'MISSING']),
      keyCapabilities: z.array(z.string()).describe("MongoDB features mapped to objectives (e.g. 'Time Series for IoT data')"),
      differentiators: z.array(z.string()).describe("Why not the competitor? (e.g. 'DocDB lacks compression')"),
      missingInfo: z.string().optional().describe("What specific details are missing?")
    }),
    whyNow: z.object({
      status: z.enum(['FOUND', 'PARTIAL', 'MISSING']),
      compellingEvent: z.string().optional().describe("The hard deadline or event (e.g. 'License renewal on Oct 1st')"),
      businessImpactOfDelay: z.string().optional().describe("What happens if they do nothing now?"),
      missingInfo: z.string().optional().describe("What specific details are missing?")
    })
    }),

  // Contextual Discovery Questions (Gap Analysis)
  gapAnalysis: z.object({
    discoveryQuestions: z.array(z.string()).describe("3-5 hyper-specific, open-ended questions the Rep should ask next time to fill the missing 'Why' information.")
  })
});

UI:

app/page.tsx: Dashboard of accounts.

app/account/[id]/page.tsx:

Left Col: Upload component.

### Right Column: The DCS Display
- **Check:** If `account.dcsData` is an array with length > 1:
  - Render a **Tab Bar** at the top: `[ Workload A ] [ Workload B ]`.
  - Default to the first tab.
- **Render:** The DCS Table for the selected workload.
- **Features:**
  - Group "Current State" and "Future State" side-by-side.
  - Use `lucide-react` icons for sections (User icon for People, Server icon for Tech).
**New Section: The "3 Whys" Qualification Card**
- Render a 3-column Grid (Why Anything, Why MongoDB, Why Now).
- **Visual Status:**
  - If `status === 'FOUND'`: Show Green Checkmark + Content.
  - If `status === 'MISSING'`: Show Red Warning Icon + "Data Missing".
- **Discovery Coach:**
  - Below the grid, render a "Suggested Discovery Questions" box.
  - Display the `gapAnalysis.discoveryQuestions` list.
  - Style this distinctively (e.g., a yellow/gold border) to alert the Rep that these are their next steps.

Execute this plan. Start by generating the Mongoose models.

## 1.1 Clarifications & Logic Rules

### 1. Workload ID Generation
- **Decision:** Use `crypto.randomUUID()` to generate a unique string ID for every detected workload.
- *Why:* Relying on `workloadName` is risky if the AI generates slightly different names on re-runs (e.g., "Ticketing App" vs "Ticketing System").

### 2. Token Usage & Cost
- **Decision:** track token usage for now as sum all passes

### 3. Status Updates (UI Feedback)
- **Decision:** Keep it simple.
  - `IDLE`: No action yet.
  - `PROCESSING`: The global loading state (whether routing or extracting).
  - `COMPLETED`: Data is ready.
- *Implementation:* The UI should simply show a spinner saying "Analyzing Transcripts..." when in `PROCESSING` state. We don't need granular "Step 1 of 3" updates for MVP.

### 4. Confidence Threshold Logic
- **Decision:** **FILTER OUT** workloads with `< 0.6` confidence.
- *Why:* We don't want to show "ghost" workloads or "General Chatter" as a sales opportunity. If the AI isn't sure, don't show it.
- *Logic:* In `actions/generate.ts`, filter the array returned by the Router Agent *before* entering the extraction loop.

### 5. Data Migration (Handling Old Data)
- **Decision:** **Fresh Start (Destructive Update).**
- *Logic:* When `generateDCS(accountId)` is called, **OVERWRITE** the existing `dcsData` array completely.
- *Why:* Sales context changes. If a user uploads a new transcript, they want the *current* truth based on *all* available data. We re-process everything from scratch on every Generate click.