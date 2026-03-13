# Project Specification: TigerLens

**Role:** You are a Principal Full Stack Engineer.
**Goal:** Build a Next.js 15 application that generates "Discovery Capture Sheets" (DCS) from sales transcripts using a Multi-Agent AI architecture.

## 1. Tech Stack & Constraints
- **Framework:** Next.js 15 (App Router, Server Actions).
- **Database:** MongoDB Atlas (via Mongoose). **Store raw transcript text directly in MongoDB (No S3).**
- **AI:** Vercel AI SDK (`ai` package).
  - Provider: `@ai-sdk/google`.
  - Model String: `google('models/gemini-2.5-pro')` (Supports 2M context).
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
- `userEmail`: String (Owner's email)
- `sharedWith`: [String] (Array of email addresses with access)
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

## 2.1. Sharing & Collaboration

### Architecture
**Ownership Model:**
- Each account has ONE owner (identified by `userEmail`)
- Owner can share with multiple users via email (stored in `sharedWith` array)
- All changes are immediately visible to owner and all shared users

### Access Control
**Owner Permissions:**
- View account and all DCS data
- Upload transcripts
- Generate/regenerate DCS
- Share/unshare with other users
- Delete account

**Shared User Permissions:**
- View account and all DCS data
- Upload transcripts
- Generate/regenerate DCS
- **Cannot** share with others
- **Cannot** delete account

### Server Actions
1. **shareAccount(accountId, emailToShareWith, currentUserEmail)**
   - Validates that current user is the owner
   - Prevents sharing with self
   - Checks for duplicate shares
   - Adds email to `sharedWith` array
   - Revalidates paths

2. **unshareAccount(accountId, emailToRemove, currentUserEmail)**
   - Validates that current user is the owner
   - Removes email from `sharedWith` array
   - Revalidates paths

3. **getAccounts(userEmail)**
   - Returns accounts where `userEmail === account.userEmail` (owned accounts)
   - **ALSO** returns accounts where `userEmail` is in `account.sharedWith` array (shared accounts)
   - Each account includes `isOwner` flag for UI rendering

4. **getAccountDetails(accountId, userEmail)**
   - Checks if user has access: `account.userEmail === userEmail` OR `userEmail in account.sharedWith`
   - Returns null if no access
   - Returns account with access metadata

### UI Components
1. **ShareAccountModal**
   - Shows owner email (read-only)
   - Email input field for sharing
   - List of current shares with remove button (owner only)
   - Share/Unshare actions with error handling

2. **Account List (Dashboard)**
   - Owned accounts: Full card with standard styling
   - Shared accounts: Badge showing "Shared" + owner cannot be deleted
   - Both types clickable to view/edit

3. **Account Detail Page**
   - Owner sees: Share button in header
   - Shared user sees: "Shared with you by [owner]" badge
   - Both can upload transcripts and generate DCS
   - Delete button only visible to owner

### Real-time Sync
- Uses Next.js revalidatePath() to invalidate cache
- Shared users see updates on next page load/navigation
- No WebSocket required for MVP (eventual consistency is acceptable)

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
- **Goal:** Remove all text unrelated to the specific workload AND identify the speakers..
- **Prompt:**
  > "You are a Context Filter. Read the transcript below.
  > Identify who is the 'Customer' and who is the 'MongoDB Seller/SA'.
  > REWRITE the transcript to include ONLY the dialogue, facts, and context relevant to the workload: '${opp.workloadName}'.
  > Retain the speaker labels (e.g., Customer vs. MongoDB) for every line.
  > REMOVE all discussion about other projects.
  > IF a metric (e.g. '5TB data') is not explicitly linked to this workload, DELETE IT.
  > RETURN only the filtered text with clear speaker labels."
- **Output:** `sanitizedContext` (String)

**Step 2b: The Scoped Extraction Chain**
Run the **3-Agent Chain** (Technical, Commercial, Strategy) in parallel using the `sanitizedContext` (NOT the full text).

#### Agent 1: The Technical Architect
**Focus:** Hardware, Topology, Latency, Version numbers, Use Cases, Data Flow.
**System Prompt:**
> "You are a Principal Architect. Extract ONLY technical evidence: specific instance types (e.g. m5.large), database versions, topology (Replica Set vs Sharded), and metrics (latency, throughput). Ignore sales politics.
> "CRITICAL GROUNDING RULE: You must extract information strictly from the CUSTOMER'S perspective. 
> - If the MongoDB Rep suggests a feature (e.g., 'You should use Time Series'), DO NOT add it to 'Future State' unless the Customer explicitly agrees or asks for it.
> - Current State and Pain Points must be facts stated by the Customer, not assumptions made by the Rep."
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
>   - **Outcomes:** Measurable success metrics.
>
> **C. USE CASE SUMMARY**
> - **Detailed Use Case:** Provide a comprehensive 2-3 paragraph summary describing:
>   - What the application does and who the end users are
>   - The business problem it solves
>   - Key workflows and user interactions
>   - Data patterns (read-heavy, write-heavy, real-time requirements)
>   - Scale and performance characteristics
>
> **D. DATA FLOW DIAGRAM**
> - **Component Description:** Extract a list of all system components in the data flow:
>   - Client/User Interface layers (Web, Mobile, API consumers)
>   - Application/Service layers (Microservices, APIs, Backend services)
>   - Data layer (Current database, MongoDB Atlas target, caching layers)
>   - External integrations (Third-party APIs, Cloud services, Message queues)
> - **Flow Description:** Describe the data flow between components:
>   - How data enters the system (user actions, APIs, events)
>   - Processing and transformation steps
>   - Storage and retrieval patterns
>   - Output/consumption of data
> - **Volume & Velocity:** Key metrics for each flow (requests per second, data volume, latency requirements)"

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
**Focus:** Logic mapping (Sales Motion, Value Drivers), Next Steps.
> "CRITICAL GROUNDING RULE: The '3 Whys' and 'Value Drivers' must represent the CUSTOMER'S actual internal motivations, NOT the MongoDB Rep's sales pitch. 
> - If the Rep says, 'MongoDB will save you money,' but the Customer never validates it, DO NOT list 'Save Money'. Mark it as MISSING.
> - Only extract Challenges, Objectives, and Compelling Events that the CUSTOMER explicitly stated or firmly agreed to."
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
>     - *If found:* Extract specific pains (e.g., 'Crashes every Friday') and objectives (e.g., 'Scale to 1M users').
>     - *If partial:* You see a pain but no clear objective, or vice versa. Mark status as PARTIAL and note what's missing.
>     - *Did customer admitted this is a pain they need to solve?* If they said "We can live with this" or "This is just a nice-to-have", mark as MISSING and note what's missing.
>     - *If missing:* Mark status as MISSING and note what's missing.
> 2. **Why MongoDB?** (Differentiation): Why us? Why not Postgres or DynamoDB or any other database?
>     - *If found:* Map features to pains (e.g., 'Relational Migrator reduces risk') and note differentiators.
>     - *If partial:* You see a reason why they want to change but no clear link to MongoDB's strengths. Mark status as PARTIAL and note what's missing.
>     - *Did customer admitted MongoDB is the best solution?* If they said "We are also considering Postgres/DynamoDB/DocumentDB or any other database", mark as PARTIAL and note what's missing. If they said "We don't see a difference between MongoDB and competitors", mark as MISSING and note what's missing.
>     - *If missing:* Mark status as MISSING and note what's missing.
> 3. **Why Now?** (Urgency): Is there a Compelling Event?
>     - *If found:* Extract the Date and the Event (e.g., 'Audit on Nov 1st'). 'Q4' is not specific enough.
>     - *If partial:* You see a date but no compelling event, or an event but no date. Mark status as PARTIAL and note what's missing.
>     - *Did customer admit there is a real urgency?* If they said "We have a long runway" or "This is not urgent", mark as MISSING and note what's missing and note what's missing.
>     - *If missing:* Mark status as MISSING. Note what's needed.
>
> **E. GAP ANALYSIS (The Coach)**
> based *strictly* on what is MISSING in the 3 Whys above, generate 3-5 Discovery Questions for the Sales Rep.
> - **Bad Question:** 'Why do you want to move now?'
> - **Good Question:** 'You mentioned the Oracle license expires in Q4—what is the specific date, and what is the financial penalty if we miss that window?'
> - **Good Question:** 'You mentioned latency is an issue—how is that specifically impacting your mobile users' cart abandonment rate?'"
>
> **F. NEXT STEPS**
> Based on the deal stage, timeline, and gaps identified, provide 3-7 concrete, actionable next steps for the sales team:
> - **Technical Actions:** PoC requirements, architecture review sessions, migration planning workshops
> - **Commercial Actions:** Executive briefings, pricing discussions, contract negotiations
> - **Enablement:** Documentation needed, training sessions, customer success planning
> - **Qualification:** Information gathering tasks based on gaps in the 3 Whys
> - **Timeline:** Associate each action with a suggested timeframe (e.g., 'Week 1', 'Before PoC', 'Q1 2026')
> - **Owner:** Suggest who should drive each action (Sales Rep, SE, Account Executive, Partner)"

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
  }),
  useCaseSummary: z.object({
    applicationPurpose: z.string().describe("What the application does and who the end users are"),
    businessProblem: z.string().describe("The business problem this application solves"),
    keyWorkflows: z.array(z.string()).describe("Key workflows and user interactions"),
    dataPatterns: z.string().describe("Read-heavy, write-heavy, real-time requirements, etc."),
    scaleCharacteristics: z.string().describe("Scale and performance characteristics")
  }),
  dataFlowDiagram: z.object({
    components: z.array(z.object({
      name: z.string().describe("Component name"),
      type: z.enum(['Client', 'Service', 'Database', 'Integration', 'Other']).describe("Component type"),
      description: z.string().describe("Brief description of the component's role")
    })).describe("All system components in the data flow"),
    flows: z.array(z.object({
      from: z.string().describe("Source component"),
      to: z.string().describe("Target component"),
      description: z.string().describe("What data flows and how"),
      metrics: z.string().optional().describe("Volume, velocity, latency for this flow")
    })).describe("Data flows between components")
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
  }),
  
  // Next Steps
  nextSteps: z.array(z.object({
    action: z.string().describe("Specific action to take"),
    category: z.enum(['Technical', 'Commercial', 'Enablement', 'Qualification']).describe("Type of action"),
    owner: z.string().describe("Who should drive this (Sales Rep, SE, AE, Partner, etc.)"),
    timeline: z.string().describe("Suggested timeframe (e.g. 'Week 1', 'Before PoC', 'Q1 2026')"),
    priority: z.enum(['High', 'Medium', 'Low']).describe("Urgency of this action")
  })).describe("3-7 concrete next steps for the sales team")
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

**Section: Use Case Summary**
- Render a dedicated card/section showing the detailed use case:
  - Application Purpose
  - Business Problem Solved
  - Key Workflows (as bullet list)
  - Data Patterns
  - Scale Characteristics
- Use icons like FileText or Target from lucide-react

**Section: Data Flow Diagram**
- Render a visual representation of the data flow:
  - **Components:** Display as cards/boxes organized by type (Client, Service, Database, Integration)
  - **Flows:** Show arrows/connections between components with flow descriptions
  - **Metrics:** Display volume/velocity information for each flow
  - Use Network or Workflow icons from lucide-react
- Consider using a simple left-to-right or top-to-bottom layout for clarity

**Section: The "3 Whys" Qualification Card**
- Render a 3-column Grid (Why Anything, Why MongoDB, Why Now).
- **Visual Status:**
  - If `status === 'FOUND'`: Show Green Checkmark + Content.
  - If `status === 'MISSING'`: Show Red Warning Icon + "Data Missing".
- **Discovery Coach:**
  - Below the grid, render a "Suggested Discovery Questions" box.
  - Display the `gapAnalysis.discoveryQuestions` list.
  - Style this distinctively (e.g., a yellow/gold border) to alert the Rep that these are their next steps.

**Section: Next Steps**
- Render an actionable task list showing next steps:
  - Group by category (Technical, Commercial, Enablement, Qualification)
  - Show priority with visual indicators (High=Red, Medium=Yellow, Low=Green)
  - Display owner and timeline for each action
  - Use CheckSquare or ListTodo icons from lucide-react
  - Consider sortable/filterable view for larger lists

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