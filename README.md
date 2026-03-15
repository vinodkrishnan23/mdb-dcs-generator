# TigerLens - AI-Powered Discovery Capture Sheet Generator

> **Automated DCS Generation from Sales Call Transcripts using Multi-Agent AI Architecture**

TigerLens is an enterprise-grade Next.js application that transforms raw sales call transcripts into structured Discovery Capture Sheets (DCS) using an intelligent multi-agent AI system. Built specifically for MongoDB Solutions Architects, it automates the time-consuming process of extracting technical, commercial, and strategic insights from customer conversations.

---

## 🎯 Key Features

### Core Capabilities
- 🤖 **Multi-Agent AI Pipeline**: Router → Slicer → 3 Extraction Agents + MongoDB Contribution Analyst
- 📊 **Real-Time Processing Visualization**: Live agent workflow diagram with progress tracking
- 🔍 **Intelligent Workload Detection**: Automatically identifies distinct sales opportunities from transcripts
- 📝 **Comprehensive DCS Output**: Technical architecture, commercial details, and strategic insights
- 🎯 **"3 Whys" Framework**: Automated qualification (Why Anything? Why MongoDB? Why Now?)
- 💡 **Discovery Coach**: AI-generated contextual questions to fill information gaps
- 👥 **User Isolation**: Multi-user support with account-level access control
- 🔄 **Background Processing**: Non-blocking generation with polling status updates
- 📥 **Multi-File Upload**: Batch transcript processing (.txt and .vtt) from multiple call recordings
- 📄 **PDF Export**: Professional DCS documents ready for customer delivery
- 🔎 **Atlas Search**: Autocomplete (nGram substring) account search — matches anywhere in the name (e.g. "nimbus" finds "DataNimbus") with regex fallback during index provisioning
- 🗑️ **Safe Delete**: Red delete button (bottom-right of tile, owner only) with modal confirmation — hard-deletes account + all transcripts

### Enterprise Features
- 🔐 **Dual Authentication**: Kubernetes (Kanopy headers) + Local development (session cookies)
- ⏱️ **Rate Limiting**: Sequential processing with intelligent delays to prevent API throttling
- 🎨 **Modern UI/UX**: Responsive design with real-time updates and animated workflows
- 📊 **Usage Tracking**: Token consumption and cost estimation per generation
- 🔄 **Reset & Retry**: Recovery mechanism for stuck or failed generations
- 🏷️ **Workload Tabs**: Multi-workload support with tabbed interface

---

## 🏗️ Architecture

### Multi-Agent AI System

```
┌─────────────────────────────────────────────────────────────┐
│                    TRANSCRIPT INPUT                          │
└────────────────────┬────────────────────────────────────────┘
                     │
              ╔══════▼══════╗
              ║   PASS 1    ║
              ╚══════╤══════╝
                     │
           ┌─────────▼─────────┐
           │   ROUTER AGENT    │ ← Customer workloads only
           │  (Gemini 2.5 Pro) │   Filters MongoDB suggestions
           └─────────┬─────────┘
                     │  (per workload, confidence > 0.6)
              ╔══════▼══════╗
              ║   PASS 2    ║  (parallel per workload)
              ╚══════╤══════╝
                     │
           ┌─────────▼─────────┐
           │   SLICER AGENT    │ ← Two-stage filter:
           │  (Gemini 2.5 Pro) │   1) Remove MongoDB dialogue
           └─────────┬─────────┘   2) Filter by workload
                     │  (sanitized customer-only context)
        ┌────────────┴────────────┐
        │                        │
        ▼                        ▼
┌──────────────┐        ┌──────────────┐
│  TECHNICAL   │        │  COMMERCIAL  │
│    AGENT     │        │    AGENT     │
│ Architecture │        │ Stakeholders │
│ Pain Points  │        │  (Customer   │
│ Future State │        │   only)      │
└──────┬───────┘        └──────┬───────┘
       │                       │
       │     ┌─────────────┐   │
       └────►│   STRATEGY  │◄──┘
             │    AGENT    │
             │ Sales Motion│
             │   3 Whys    │
             │ Gap Analysis│
             └──────┬──────┘
                    │
              ╔═════▼═════╗
              ║  PASS 3   ║  (runs ONCE for full transcript)
              ╚═════╤═════╝
                    │
           ┌────────▼──────────┐
           │  MONGODB CONTRIB  │ ← Full raw transcript
           │  ANALYST AGENT    │   Team-level, no individual
           │  (Gemini 2.5 Pro) │   attribution
           └────────┬──────────┘
                    │  (same result shared across all workloads)
                    ▼
           ┌─────────────────────┐
           │   STRUCTURED DCS    │
           │  (per workload tab) │
           └─────────────────────┘
```

### Tech Stack

**Frontend**
- **Framework**: Next.js 15 (App Router, React 19, React Server Components)
- **Styling**: Tailwind CSS 4 + Lucide React icons
- **Language**: TypeScript 5

**Backend**
- **Runtime**: Node.js with Next.js Server Actions
- **Database**: MongoDB Atlas with Mongoose ODM
- **AI/ML**: Vercel AI SDK (`ai` v6) + Google Generative AI SDK
- **Models**: Google Gemini 2.5 Pro (via `@ai-sdk/google`)
- **Schema Validation**: Zod 4

**Authentication**
- Kubernetes: X-Kanopy-Internal-Authorization header parsing
- Local Development: HTTP-only session cookies (7-day expiration)

**Utilities**
- PDF Generation: jsPDF + html2canvas
- Real-time Updates: Client-side polling (2-second intervals)
- Error Handling: Graceful degradation with user feedback

---

## 📂 Project Structure

```
dcs-generator/
├── src/
│   ├── app/                      # Next.js App Router
│   │   ├── page.tsx              # Dashboard (Account List)
│   │   ├── layout.tsx            # Root layout with auth check
│   │   ├── actions.ts            # Server Actions (Account, Transcript, DCS Gen)
│   │   ├── login/                # Login page
│   │   ├── account/[id]/         # Account detail page
│   │   ├── dcs/[id]/             # DCS viewer page (with tabs)
│   │   └── api/
│   │       └── accounts/[id]/status/  # Status polling API
│   │
│   ├── components/               # React Components
│   │   ├── AccountList.tsx       # Dashboard account cards
   │   ├── AccountCard.tsx       # Individual account card
   │   ├── CreateAccountForm.tsx # New account form
   │   ├── TranscriptUploader.tsx # Multi-file upload
   │   ├── DCSGenerator.tsx      # Generate/Reset buttons
   │   ├── DCSPreview.tsx        # Status polling & display logic
   │   ├── AgentFlowDiagram.tsx  # Real-time workflow visualization
   │   ├── DCSDisplay.tsx        # Legacy DCS table view
   │   ├── DCSDisplayNew.tsx     # Modern DCS with 3 Whys + Agent sections
   │   ├── MongoDBContributionSection.tsx  # MongoDB team contribution panel
   │   ├── ShareAccountModal.tsx # Account sharing dialog
│   │   └── UserMenu.tsx          # User profile dropdown
│   │
│   ├── lib/                      # Utilities
│   │   ├── auth.ts               # Authentication helpers
│   │   ├── db.ts                 # MongoDB connection with caching
   │   ├── schemas.ts            # Zod schemas (Router, Technical, Commercial, Strategy, MongoDBContribution)
│   │   └── pdf-export.ts         # PDF generation utility
│   │
│   └── models/                   # Mongoose Models
│       ├── Account.ts            # Account schema with transcriptIds
│       └── Transcript.ts         # Transcript schema with fullText
│
├── .env.local                    # Environment variables
├── package.json                  # Dependencies
├── tsconfig.json                 # TypeScript config
├── tailwind.config.ts            # Tailwind CSS config
└── next.config.ts                # Next.js config
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js**: v20 or higher
- **MongoDB Atlas**: Cloud database cluster
- **Google Cloud**: Vertex AI API access with Gemini 2.5 Pro enabled
- **Git**: For version control

### 1. Clone Repository

```bash
git clone <repository-url>
cd dcs-generator
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Environment Configuration

Create a `.env.local` file in the root directory:

```bash
# MongoDB Connection
MONGODB_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/dcs-generator

# Google Vertex AI (for Gemini 2.5 Pro)
GOOGLE_VERTEX_AI_API_KEY=your-api-key-here

# Optional: Azure OpenAI (if switching providers)
# AZURE_OPENAI_API_KEY=your-azure-key
# AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com/
# AZURE_OPENAI_DEPLOYMENT=gpt-4o
# AZURE_OPENAI_API_VERSION=2024-04-01-preview
```

**Important Notes:**
- Never commit `.env.local` to version control
- MongoDB URI must include database name (`/dcs-generator`)
- Google API key requires Vertex AI API enabled in GCP console

### 4. Database Setup

The application will automatically create collections on first run:
- `accounts`: User accounts with metadata
- `transcripts`: Uploaded transcript files

**MongoDB Atlas Setup:**
1. Create a new cluster at [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas)
2. Add a database user with read/write permissions
3. Whitelist your IP address (or use 0.0.0.0/0 for development)
4. Copy the connection string and update `MONGODB_URI`

**Performance Indexes** (run once after first launch):
```js
// accounts collection
db.accounts.createIndex({ userEmail: 1, createdAt: -1 })
db.accounts.createIndex({ sharedWith: 1 })
db.accounts.createIndex({ status: 1 })
// transcripts collection
db.transcripts.createIndex({ accountId: 1 })
db.transcripts.createIndex({ userEmail: 1 })
db.transcripts.createIndex({ createdAt: -1 })
```

**Atlas Search Index** (required for dashboard search bar):

1. In Atlas UI → your cluster → **Search** tab → **Create Search Index**
2. Select **Search** (not Vector Search) → click **JSON Editor** → **Next**
3. Set **Index Name** to `accounts_search` and select the `accounts` collection
4. Replace the JSON in the editor with the following (mappings only — do **not** wrap in `name`/`definition`):

```json
{
  "mappings": {
    "dynamic": false,
    "fields": {
      "name": [
        {
          "type": "string",
          "analyzer": "lucene.standard"
        },
        {
          "type": "autocomplete",
          "analyzer": "lucene.standard",
          "tokenization": "nGram",
          "minGrams": 2,
          "maxGrams": 15
        }
      ]
    }
  }
}
```

5. Click **Create Search Index**
> **Note**: If the Atlas Search index does not exist, `searchAccounts` automatically falls back to a regex search so the app remains functional during index provisioning (indexes can take 1–2 minutes to build).

### 5. Google Cloud Setup

1. Create a Google Cloud Project
2. Enable the Vertex AI API:
   ```bash
   gcloud services enable aiplatform.googleapis.com
   ```
3. Create an API key or use service account credentials
4. Update `GOOGLE_VERTEX_AI_API_KEY` in `.env.local`

### 6. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### 7. Production Build

```bash
npm run build
npm start
```

---

## 🔐 Authentication

### Kubernetes Deployment (Production)
When deployed in a Kubernetes environment with Kanopy, authentication is handled via headers:
- Header: `X-Kanopy-Internal-Authorization`
- Format: Base64-encoded JSON with user email and name
- Validation: Automatic extraction in `getUser()` function

### Local Development
Session-based authentication using HTTP-only cookies:
1. Navigate to `/login`
2. Enter email and optional name
3. Session expires after 7 days
4. Use `clearSession()` to logout

**Security Features:**
- User isolation: Accounts filtered by `userEmail` field
- No passwords stored (relies on upstream auth in production)
- Server-side session validation on every request

---

## 📖 Usage Guide

### Creating an Account

1. **Login** (local dev only): Navigate to `/login` and enter your email
2. **Dashboard**: Click "Create New Account" button
3. **Account Name**: Enter customer/prospect name (e.g., "Acme Corp")
4. **Submit**: Account is created with `IDLE` status

### Uploading Transcripts

1. Navigate to account detail page (`/account/[id]`)
2. Click "Choose Files" to select one or more `.txt` files
3. Click "Upload" - files are processed and stored
4. Transcripts appear in the left sidebar

**Supported Formats:**
- Plain text files (`.txt`)
- UTF-8 encoding recommended
- No file size limit (handled in chunks)

### Generating DCS

1. Ensure at least one transcript is uploaded
2. Click "Generate DCS" button
3. **Agent Flow Visualization** appears:
   - 🧠 **Router Agent**: Identifying workloads (green when active)
   - ✂️ **Slicer Agent**: Filtering context (transitions to green)
   - 🔍 **Extraction Agents**: Running 3 parallel agents (final step)
4. Status polls every 2 seconds for real-time updates
5. When complete, "View Full DCS" button appears

**If Generation Gets Stuck:**
- Click "Reset & Start Over" button (appears during PROCESSING/FAILED states)
- Confirm the reset dialog
- Status returns to IDLE, ready to retry

### Viewing DCS

1. Click "View Full DCS" button after generation completes
2. **Multi-Workload Support**: If multiple workloads detected, tabs appear
3. **DCS Sections**:
   - **Deal Strategy**: Sales motion, Tiger route, value drivers
   - **3 Whys Qualification**:
     - ✅ Why Anything? (Challenges & objectives)
     - ✅ Why MongoDB? (Key capabilities & differentiators)
     - ✅ Why Now? (Compelling event & impact of delay)
   - **Discovery Coach**: AI-generated questions to fill gaps
   - **Stakeholders**: Decision-makers with psychographic notes
   - **Timeline & Partners**: Dates, cloud provider, system integrators
   - **Technical Details**: Current state, pain points, future state, required capabilities
4. **Export**: Click "Export PDF" to download formatted document

---

## 🧠 AI Agent Details

### Router Agent
**Purpose**: Identify distinct sales opportunities from transcripts

**Input**: Combined transcript text from all uploaded files

**Output**:
```typescript
{
  opportunities: [
    {
      workloadName: "E-Commerce Platform",
      contextDescription: "Online retail system handling product catalog and orders",
      confidenceScore: 0.85
    }
  ]
}
```

**Behavior**:
- Filters opportunities with confidence < 0.6
- Returns empty array if no specific projects discussed
- Uses Gemini 2.5 Pro for nuanced understanding

### Slicer Agent
**Purpose**: Filter transcript context relevant to specific workload

**Input**: 
- Original combined transcript
- Workload name and description from Router

**Output**: Sanitized transcript with only relevant sections

**Behavior**:
- Removes mentions of other workloads
- Preserves all dates, stakeholder names, technical specs for the workload
- Reduces token consumption for extraction agents

### Technical Agent
**Purpose**: Extract architecture and technical requirements

**Schema**: `technicalSchema` (Zod)

**Extracts**:
- **Current State**: Architecture, metrics, pain points with root causes
- **Future State**: Proposed solution, required capabilities, success metrics

### Commercial Agent
**Purpose**: Capture stakeholder and timeline information

**Schema**: `commercialSchema` (Zod)

**Extracts**:
- **Account Info**: Account and workload names
- **Stakeholders**: Names, roles (Economic Buyer, Technical Champion, etc.), psychographic notes
- **Partners**: Cloud provider, system integrators, committed spend status
- **Timeline**: Target go-live, compelling events, consequences of delay, all dates discussed

### Strategy Agent
**Purpose**: Determine deal strategy and qualification status

**Schema**: `strategySchema` (Zod)

**Extracts**:
- **Sales Motion**: Migrate / Replace / Launch / Select
- **Tiger Sales Route**: Classic / Sprint / Fast
- **Value Drivers**: Compete/Revenue, Save Money, Reduce Risk, Dev Velocity
- **3 Whys Framework**: Status (FOUND/PARTIAL/MISSING) with details
- **Gap Analysis**: Contextual discovery questions for next call
- **Next Steps**: 3–7 actionable items grouped by category (Technical, Commercial, Enablement, Qualification)

### MongoDB Contribution Analyst (Agent 4)
**Purpose**: Summarise what the MongoDB team contributed to the conversation — runs **once per transcript** (Pass 3), result shared across all workloads

**Input**: Full raw `combinedText` (NOT sanitizedContext — this agent specifically needs MongoDB team dialogue)

**Output**: Single `mongodbContribution` object attached to every workload in `dcsData`

**Schema**: `mongodbContributionSchema` (Zod)

**Key design decisions**:
- Runs outside the per-workload loop — one LLM call regardless of how many workloads were identified
- No individual attribution: contributions, messaging, and questions are team-level only
- `teamMembers` (names + roles) is the only section that identifies individuals

**Extracts**:
| Section | Description |
|---------|-------------|
| `teamMembers` | Names and roles of MongoDB attendees |
| `technicalContributions` | SA suggestions, architecture recommendations, PoC proposals + customer reaction |
| `salesMessaging` | Value props, competitive positioning, pricing points + customer reaction |
| `questionsAsked` | Discovery questions asked collectively + effectiveness rating + customer response |
| `unvalidatedSuggestions` | Features/solutions suggested but NOT confirmed by customer + follow-up needed |
| `overallEffectiveness` | Conversation style (Customer-Centric / Balanced / MongoDB-Centric), pain points uncovered, summary, improvement areas |

**UI Component**: `src/components/MongoDBContributionSection.tsx`
- Renders as the last section in the DCS display (after Next Steps)
- Amber highlight for unvalidated suggestions
- Reaction badges: Validated / Not Validated / Rejected / Unknown

---

## ⚙️ Configuration

### Rate Limiting
To prevent Azure OpenAI / Google API throttling:
```typescript
// src/app/actions.ts (Line ~270)
await new Promise(resolve => setTimeout(resolve, 2000)); // 2-second delay between workloads
```

Adjust delay based on your API tier and concurrent users.

### Model Selection
Currently using **Gemini 2.5 Pro**:
```typescript
model: googleAI('gemini-2.5-pro')
```

To switch to Azure OpenAI (code exists but commented):
1. Uncomment Azure configuration in `actions.ts`
2. Install `@ai-sdk/azure`: `npm install @ai-sdk/azure`
3. Update `.env.local` with Azure credentials
4. Replace model calls with `azure('gpt-4o')`

### Schema Validation
All schemas use `.default()` for optional fields to ensure Azure OpenAI strict mode compatibility:
```typescript
// Correct for Azure
databaseVersion: z.string().default("Not specified")

// Incorrect (causes validation errors)
databaseVersion: z.string().optional()
```

---

## 🧪 Testing

### Manual Testing Checklist
- [ ] Create account with valid email
- [ ] Upload single transcript (.txt file)
- [ ] Upload multiple transcripts simultaneously
- [ ] Generate DCS with Router → Slicer → Agents flow
- [ ] Verify real-time status updates (no manual refresh needed)
- [ ] View DCS with all sections populated
- [ ] Export PDF successfully
- [ ] Test multi-workload scenario (multiple tabs appear)
- [ ] Reset stuck generation
- [ ] Verify user isolation (cannot see other users' accounts)

### Common Issues

**Issue**: "No module found" errors
**Solution**: Run `npm install` and restart dev server

**Issue**: Agent flow doesn't update in real-time
**Solution**: Check browser console for polling errors; verify `/api/accounts/[id]/status` route exists

**Issue**: "Too Many Requests" from API
**Solution**: Increase delay in `processDCSGeneration()` function (default: 2 seconds)

**Issue**: DCS sections show "Not specified"
**Solution**: Ensure transcripts have sufficient detail; router may filter low-confidence workloads

---

## 🔄 Data Models

### Account
```typescript
{
  _id: ObjectId,
  name: string,              // Customer name
  userEmail: string,          // Owner email (isolation key)
  transcriptIds: ObjectId[],  // References to Transcript collection
  dcsData: DCSData[] | null,  // Generated DCS array (one per workload)
  status: 'IDLE' | 'PROCESSING' | 'COMPLETED' | 'FAILED',
  progressStep: string,       // 'router' | 'slicer' | 'agents'
  progressDetails: object,    // { currentWorkload, totalWorkloads, completedWorkloads }
  usage: {
    promptTokens: number,
    completionTokens: number,
    totalTokens: number,
    estimatedCost: number
  },
  createdAt: Date,
  updatedAt: Date
}
```

### Transcript
```typescript
{
  _id: ObjectId,
  accountId: ObjectId,        // Reference to Account
  filename: string,
  fullText: string,           // Raw transcript content
  userEmail: string,          // Uploader email
  createdAt: Date
}
```

### DCSData (Generated Output)
```typescript
{
  workloadId: string,
  workloadName: string,
  technical: {
    currentState: { /* architecture, metrics, painPoints */ },
    futureState: { /* proposedSolution, requiredCapabilities */ }
  },
  commercial: {
    accountInfo: { /* accountName, workloadName */ },
    stakeholders: [ /* name, role, notes */ ],
    partners: { /* cloudProvider, systemIntegrators */ },
    timeline: { /* targetGoLiveDate, compellingEvent */ }
  },
  strategy: {
    salesMotion: 'Migrate' | 'Replace' | 'Launch' | 'Select',
    tigerSalesRoute: 'Tiger Classic' | 'Tiger Sprint' | 'Tiger Fast',
    valueDrivers: [ /* category, justification */ ],
    threeWhys: {
      whyAnything: { status, challenges, objectives, missingInfo },
      whyMongoDB: { status, keyCapabilities, differentiators, missingInfo },
      whyNow: { status, compellingEvent, businessImpactOfDelay, missingInfo }
    },
    gapAnalysis: { discoveryQuestions: string[] }
  }
}
```

---

## 🌐 Deployment

### Vercel (Recommended)
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Production deployment
vercel --prod
```

**Environment Variables**: Add in Vercel dashboard under Project Settings → Environment Variables

### Docker
```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

### Kubernetes
Deploy with Kanopy headers for authentication:
- Ensure `X-Kanopy-Internal-Authorization` header is set by ingress
- Configure MongoDB connection string via secrets
- Set replica count based on expected load

---

## 📊 Performance Considerations

### Token Usage
- **Average per workload**: 15,000-25,000 tokens
- **Cost**: ~$0.015-$0.025 per DCS (Gemini 2.5 Pro pricing)
- **Time**: 30-60 seconds per workload

### Optimization Tips
1. **Batch Processing**: Upload multiple transcripts at once
2. **Context Length**: Keep transcripts focused (remove irrelevant preamble)
3. **Confidence Threshold**: Adjust Router filtering (default: 0.6)
4. **Parallel Extraction**: 3 agents run concurrently for each workload

### Scalability
- **Concurrent Users**: Handles 10+ users with default MongoDB Atlas M10 tier
- **Database**: Add indexes on `userEmail` field for faster queries
- **API Limits**: Implement request queuing for high-volume scenarios

---

## 🛠️ Development Tips

### Hot Reload
Next.js 15 supports Fast Refresh. Changes to:
- `*.tsx` files: Instant component updates
- `actions.ts`: Requires page navigation to reflect changes
- `schemas.ts`: Restart dev server for type updates

### Debugging
```typescript
// Enable detailed logging
console.log('Router Result:', JSON.stringify(routerResult, null, 2));

// MongoDB queries
mongoose.set('debug', true);

// AI SDK telemetry
experimental_telemetry: { isEnabled: true }
```

### Testing AI Prompts
Modify prompts in `actions.ts` (Lines 150-400) and test with sample transcripts.

---

## 📝 License

This project is proprietary and confidential. Unauthorized copying or distribution is prohibited.

---

## 👥 Contributors

Built for MongoDB Solutions Architects by the TigerLens team.

---

## 📞 Support

For issues or questions:
1. Check the **Common Issues** section above
2. Review MongoDB Atlas connection status
3. Verify Google Vertex AI API quotas
4. Contact your team administrator for access issues

---

**Version**: 1.0.0  
**Last Updated**: February 2026  
**Maintained By**: MongoDB Professional Services
- Create an API key or service account
- Update the Google Vertex AI variables in `.env.local`

### 5. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the application.

## Usage

1. **Create an Account**: Click "New Account" on the dashboard
2. **Upload Transcripts**: Go to an account and upload `.txt` files containing transcripts
3. **Generate DCS**: Click "Generate DCS" to analyze transcripts with AI
4. **View Results**: The generated DCS will be displayed in a structured format

## DCS Schema

The application generates structured DCS data with:

- **Account Info**: Workload name, sales motion, stakeholders, partners
- **Value Framework**: Current state, future state, value drivers
- **Logistics**: Timeline, capabilities, success metrics

## Development

The application uses:

- Server Actions for data mutations
- Mongoose for MongoDB interactions
- Cached database connections
- TypeScript for type safety
- Zod for schema validation
