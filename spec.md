# Project Specification: MongoDB DCS Generator
Role: You are a Principal Full Stack Engineer. Goal: Build a Next.js 15 application that generates "Discovery Capture Sheets" (DCS) from sales transcripts using a Multi-Agent AI architecture.

## 1. Tech Stack & Constraints
<b>Framework</b> -  Next.js 15 (App Router, Server Actions).

<b>Database</b> - MongoDB Atlas (via Mongoose). Store raw transcript text directly in MongoDB (No S3).

<b>AI</b> - Vercel AI SDK (ai package) + Google Gemini Provider (@ai-sdk/google).

<b>Validation</b> - Zod (Strict output schemas).

<b>Styling</b> - Tailwind CSS + Lucide React.

## 2. Database Schema (Mongoose)
models/Account.ts
- name: String
- industryContext: String (e.g., "FinTech")
- transcriptIds: [ObjectId ref 'Transcript']
- `dcsData`: **Array** of Objects
  - Schema: `[{ workloadId: String, workloadName: String, ...FullDCS_Object }]`
  - *Note: This allows storing multiple DCS documents for a single Account.*
- status: String ('IDLE', 'PROCESSING', 'COMPLETED')


models/Transcript.ts
- accountId: ObjectId (index: true)
- filename: String
- fullText: String (Max 16MB document limit is fine for text)
- uploadedAt: Date

## 3. The "Brain" Architecture (Critical)

### The "Router + Fan-Out" Architecture
Implement `actions/generate.ts` using a **Two-Pass Strategy**:

#### Pass 1: The Router Agent
- **Goal:** Identify distinct workloads.
- **Prompt:** "Identify distinct software projects/workloads discussed. Return a list. Ignore minor features."
- **Schema:** `routerSchema`

#### Pass 2: The Scoped Extraction Loop
Iterate through each valid opportunity (`confidence > 0.6`) and run the **3-Agent Chain** (Technical, Commercial, Strategy) in parallel.

To avoid hallucination, we use a 3-Agent Parallel Architecture. Create a file actions/generate.ts that runs 3 separate AI calls in parallel using Promise.all.

#### Agent 1: The Technical Architect
<b> Focus</b> : Hardware, Topology, Latency, Version numbers.

<b> System Prompt</b> : "You are a Principal Architect. Extract ONLY technical evidence: specific instance types (e.g. m5.large), database versions, topology (Replica Set vs Sharded), and metrics (latency, throughput). Ignore sales politics.

**A. ACCOUNT & WORKLOAD**
- **Workload Name:** Not just "Database". format: "App Name / Project Name" (e.g., "Ticketing System for US Market").
- **Industry Context:** What do they sell? Who do they serve?

**B. TECHNICAL DEEP DIVE (Current vs. Future)**
- **Current State Description:** Provide a detailed explanation of the current solution and architecture, including how the system works today, what technologies are in use, and the overall technical landscape.
- **Current Architecture:**
  - **Topology:** Standalone? Replica Set? Sharded?
  - **Hardware:** Instance types (e.g., r5.large), RAM, CPU.
  - **Data Flow:** Ingest -> Process -> Store -> Consume.
  - **Metrics:** Data Size (GB/TB), Latency (ms), Throughput (RPS).
- **Negative Consequences:**
  - Link **Technical Root Cause** (e.g., "Collection Level Locking") -> **Business Impact** (e.g., "User Checkout Failure").
- **Future State:**
  - **Proposed Solution:** Provide a detailed explanation of the proposed MongoDB Atlas solution, including implementation approach, migration strategy, configuration recommendations, deployment plan, and step-by-step approach.
  - **Specific Features:** Time Series, Atlas Search, Vector Search, Online Archive.
  - **Outcomes:** Measurable success metrics (e.g., "P99 < 10ms")."

#### Agent 2: The Commercial Manager
<b> Focus</b>: Stakeholders, Timeline, Partners.

<b> System Prompt</b>: "You are a Sales Manager. Extract ONLY: Stakeholders (Buyer vs Champion), Partner ecosystem (Cloud/SI), and Timelines (Compelling Events). Ignore technical logs.

**A. STAKEHOLDERS (The "Political Map")**
- Identify **Who reports to whom?** (e.g., "Engineering Manager reports to CTO").
- Identify **Psychographics:** What gives them confidence? What are their "scars" (past failures)?
- **Sentiment Analysis:** For non-MongoDB attendees, capture their sentiment and attitude (e.g., "Skeptical about migration", "Enthusiastic about new features", "Concerned about costs", "Supportive but needs proof").
- **Role:** Distinguish between the "Economic Buyer" (Signer) and "Technical Champion" (User).

**B. PARTNERS & EVALUATION**
- **Cloud:** AWS/Azure/GCP? Do they have a **Committed Spend** contract?
- **SIs:** Are Accenture, TCS, or Infosys involved? Are they doing design or just delivery?
- **Process:** What is the sequence? (PoC -> Security Review -> Procurement -> Sign-off)."

**C. TIMELINE & URGENCY**
- **"No Date, No Deal":** Find the exact launch date.
- **Compelling Event:** What happens if they miss it? (e.g., "Diwali Peak", "Black Friday", "Audit").
- **Consequence of Delay:** "If we don't fix this by Oct 1st, we lose $50k/day."
- **All Dates Discussed:** Capture ALL dates mentioned in the call with their context (e.g., "March 15 - PoC completion deadline", "April 1 - Security review", "Q2 - Budget approval cycle", "June 30 - Current license expiration").

#### Agent 3: The Deal Strategist
<b> Focus</b>: Logic mapping (Sales Motion, Value Drivers).

<b> System Prompt</b>: "You are a Deal Strategist. Determine the Sales Motion (Migrate/Replace/Launch) based on strict definitions. Map pain points to Value Drivers (Compete, Save, Risk, Velocity).

**A. VALUE DRIVERS (The "Why Now")**
Map every pain point to one of these 4 pillars:
1. **Compete / Revenue:** Maximize competitive advantage.
2. **Save Money:** Lower TCO (Storage, Licensing, Ops hours).
3. **Reduce Risk:** Compliance, Security, Uptime (SLA).
4. **Dev Velocity:** Accelerate time-to-value (shorter release cycles).

**B. SALES MOTION LOGIC (Strict Definitions)**
- **Migrate:** User is moving TO Atlas FROM MongoDB Community, AWS DocumentDB, or Azure Cosmos DB.
- **Replace:** User is moving TO Atlas FROM RDBMS (Oracle/SQL), Cassandra, or Couchbase.
- **Launch:** New application/greenfield project. Evaluating multiple DBs.
- **Select:** New application. Has *already selected* MongoDB but needs help deploying.

**C. TIGER SALES ROUTE**
- **Classic:** Complex decision, multiple stakeholders, competitive.
- **Sprint:** Urgent, single decision maker, leaning MongoDB.
- **Fast:** Decision made, just need to close/consume.

**CRITICAL: Scoping Instruction**
You must inject this instruction into the System Prompt of every agent during the loop:
> "FOCUS ONLY on the workload named '${opp.workloadName}' (${opp.contextDescription}). IGNORE details about other apps/workloads."

**Aggregation:**
- Wait for all Promises to resolve.
- Construct the final array: `[{ workloadName: '...', ...tech, ...comm, ...strat }, ...]`
- Save to `Account.dcsData`."

## 4. Zod Schemas (lib/schemas.ts)
Define these 4 schemas exactly to force structured output:

TypeScript
import { z } from 'zod';
```
// 0. Router Schema (The "Traffic Controller")
export const routerSchema = z.object({
  opportunities: z.array(z.object({
    workloadName: z.string().describe("Name of the app/project (e.g. 'Ticketing System', 'AI Chatbot')"),
    contextDescription: z.string().describe("A 1-sentence summary of what this specific workload does, used to filter context."),
    confidenceScore: z.number().describe("0-1 score: How much detail is actually present? Ignore if < 0.6")
  })).describe("List of distinct sales opportunities found in the transcript")
});
```
```
// 1. Technical Schema
export const technicalSchema = z.object({
  currentState: z.object({
    currentStateDescription: z.string().describe("Detailed explanation of the current solution and architecture"),
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
      currentStateDescription: z.string(),
      technicalRootCause: z.string().describe("Specific cause of failure (e.g. No Compression)"),
      businessImpact: z.string().describe("Impact on Business (e.g. High Storage Cost)")
    }))
  }),
  futureState: z.object({
    futureStateDescription: z.string(),
    proposedArchitecture: z.string(),
    proposedSolution: z.string().describe("Detailed explanation of the proposed solution, implementation approach, migration strategy, and configuration recommendations"),
    positiveBusinessOutcome: z.string(),
    requiredCapabilities: z.array(z.string()).describe("Shopping List (e.g. Time Series, Vector Search)"),
    successMetrics: z.array(z.string()).describe("How they measure success (e.g. latency < 10ms)")
  })
});
```
```
// 2. Commercial Schema
export const commercialSchema = z.object({
  accountInfo: z.object({
    accountName: z.string(),
    workloadName: z.string().describe("App/Project Name")
  }),
  stakeholders: z.array(z.object({
    name: z.string(),
    role: z.enum(['Economic Buyer', 'Technical Champion', 'User', 'Influencer', 'Unknown']),
    notes: z.string().describe("Psychographics/Political stance and sentiment analysis for non-MongoDB attendees")
  })),
  partners: z.object({
    cloudProvider: z.string(),
    systemIntegrators: z.array(z.string()),
    hasCommittedSpend: z.boolean().optional()
  }),
  timeline: z.object({
    targetGoLiveDate: z.string().optional(),
    compellingEvent: z.string().describe("External pressure (e.g. Diwali, Audit)"),
    consequenceOfDelay: z.string(),
    allDatesDiscussed: z.array(z.object({
      date: z.string().describe("Date or timeframe mentioned in the call"),
      description: z.string().describe("What this date means and its significance")
    })).describe("All dates discussed in the call with their context and meaning")
  })
});
```
```
// 3. Strategy Schema
export const strategySchema = z.object({
  salesMotion: z.enum(['Migrate', 'Replace', 'Launch', 'Select']),
  tigerSalesRoute: z.enum(['Tiger Classic', 'Tiger Sprint', 'Tiger Fast']),
  valueDrivers: z.array(z.object({
    category: z.enum(['Compete / Revenue', 'Save Money', 'Reduce Risk', 'Dev Velocity']),
    justification: z.string().describe("Evidence from text")
  }))
});
```
## 5. Implementation Steps
<b>Setup </b>: Initialize Mongoose connection in lib/db.ts.

<b>Upload Action</b>: Create actions/upload.ts to receive file content string and save to Transcripts collection.

<b>Generate Action</b>: Implement actions/generate.ts.

Fetch all transcripts for the Account.

Concatenate texts.

Run Promise.all([agent1, agent2, agent3]).

Merge the 3 JSON objects.

Update Account.dcsData.

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