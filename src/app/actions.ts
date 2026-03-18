'use server';

import { revalidatePath } from 'next/cache';
import dbConnect from '@/lib/db';
import Account from '@/models/Account';
import Transcript from '@/models/Transcript';
import { generateObject } from 'ai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { technicalSchema, commercialSchema, strategySchema, routerSchema, mongodbContributionSchema, type DCSData } from '@/lib/schemas';
import { z } from 'zod';
import Workload from '@/models/Workload';
import AgentLog from '@/models/AgentLog';

// Configure Google AI
const googleAI = createGoogleGenerativeAI({
  apiKey: process.env.GOOGLE_VERTEX_AI_API_KEY!,
});

export async function createAccount(name: string, userEmail: string) {
  try {
    console.log('createAccount called with:', { name, userEmail });
    
    await dbConnect();
    
    const account = new Account({
      name,
      userEmail,
      transcriptIds: [],
      dcsData: null,
      status: 'IDLE'
    });

    console.log('Account object before save:', JSON.stringify(account, null, 2));
    await account.save();
    console.log('Account saved successfully with ID:', account._id.toString());
    
    revalidatePath('/');
    
    return { success: true, accountId: account._id.toString() };
  } catch (error) {
    console.error('Error creating account:', error);
    return { success: false, error: 'Failed to create account' };
  }
}

export async function uploadTranscript(accountId: string, fileContent: string, fileName: string, userEmail: string) {
  try {
    await dbConnect();
    
    const transcript = new Transcript({
      accountId,
      filename: fileName,
      fullText: fileContent,
      userEmail
    });

    await transcript.save();

    // Add transcript ID to account
    await Account.findByIdAndUpdate(
      accountId,
      { $push: { transcriptIds: transcript._id } }
    );

    revalidatePath(`/account/${accountId}`);
    
    return { success: true, transcriptId: transcript._id.toString() };
  } catch (error) {
    console.error('Error uploading transcript:', error);
    return { success: false, error: 'Failed to upload transcript' };
  }
}

export async function generateDCS(accountId: string) {
  try {
    await dbConnect();

    // If every transcript has already been processed, nothing to do
    const pendingCount = await Transcript.countDocuments({ accountId, processedForDcs: { $ne: true } });
    if (pendingCount === 0) {
      return { success: true as const, allProcessed: true as const };
    }

    // Delete any stale workloads and agent logs from previous runs
    await Promise.all([
      Workload.deleteMany({ accountId }),
      AgentLog.deleteMany({ accountId }),
    ]);

    // Reset all transcripts (including previously processed ones) so everything
    // is re-derived consistently with the new transcript set
    await Transcript.updateMany(
      { accountId },
      { $set: { processedForDcs: false }, $unset: { processedAt: '' } }
    );

    // Set status to PROCESSING with router step
    await Account.findByIdAndUpdate(
      accountId,
      {
        status: 'PROCESSING',
        progressStep: 'router',
        progressDetails: {},
        dcsData: [],
        usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0, estimatedCost: 0 },
      }
    );
    
    revalidatePath(`/account/${accountId}`);

    // Start the actual generation process without awaiting it
    // This allows us to return immediately while generation continues
    processDCSGeneration(accountId).catch(error => {
      console.error('Error in background DCS generation:', error);
      // Update status to ERROR on failure
      Account.findByIdAndUpdate(accountId, { status: 'IDLE' }).catch(console.error);
    });

    return { success: true };
  } catch (error) {
    console.error('Error starting DCS generation:', error);
    return { success: false, error: 'Failed to start DCS generation' };
  }
}

export async function resetAccountStatus(accountId: string) {
  try {
    await dbConnect();
    
    await Account.findByIdAndUpdate(accountId, {
      status: 'IDLE',
      progressStep: '',
      progressDetails: {}
    });
    
    revalidatePath(`/account/${accountId}`);
    
    return { success: true };
  } catch (error) {
    console.error('Error resetting account status:', error);
    return { success: false, error: 'Failed to reset status' };
  }
}

export async function forceRegenerateDCS(accountId: string) {
  try {
    await dbConnect();

    // Mark every transcript as unprocessed so they all get reprocessed
    await Transcript.updateMany(
      { accountId },
      { $set: { processedForDcs: false }, $unset: { processedAt: '' } }
    );

    // Delete all existing Workload documents and agent logs for this account
    await Promise.all([
      Workload.deleteMany({ accountId }),
      AgentLog.deleteMany({ accountId }),
    ]);

    // Clear the denormalised DCS snapshot on the Account
    await Account.findByIdAndUpdate(accountId, {
      status: 'PROCESSING',
      dcsData: [],
      progressStep: 'router',
      progressDetails: {},
      usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0, estimatedCost: 0 },
    });

    revalidatePath(`/account/${accountId}`);

    // Kick off background regeneration
    processDCSGeneration(accountId).catch(error => {
      console.error('Error in force DCS regeneration:', error);
      Account.findByIdAndUpdate(accountId, { status: 'IDLE' }).catch(console.error);
    });

    return { success: true };
  } catch (error) {
    console.error('Error forcing DCS regeneration:', error);
    return { success: false, error: 'Failed to start force regeneration' };
  }
}

// ─── Utility Types & Functions ───────────────────────────────────────────────

const COST_PER_M_INPUT  = 1.25;  // Gemini 2.5 Pro — $ per 1M input tokens
const COST_PER_M_OUTPUT = 10.0;  // Gemini 2.5 Pro — $ per 1M output tokens

/**
 * Persists a single agent call to the agent_logs collection AND atomically
 * increments the account's running usage counters via $inc.
 * Sequential callers should await this; parallel callers can fire-and-forget.
 */
async function logAgentCall({
  accountId,
  transcriptId,
  transcriptName,
  workloadName,
  agentType,
  usage,
  durationMs,
}: {
  accountId: string;
  transcriptId: string;
  transcriptName: string;
  workloadName?: string;
  agentType: string;
  usage?: { inputTokens?: number; outputTokens?: number; totalTokens?: number };
  durationMs: number;
}) {
  const promptTokens     = usage?.inputTokens    ?? 0;
  const completionTokens = usage?.outputTokens   ?? 0;
  const totalTokens      = usage?.totalTokens    ?? 0;
  const estimatedCost    =
    (promptTokens     / 1_000_000) * COST_PER_M_INPUT +
    (completionTokens / 1_000_000) * COST_PER_M_OUTPUT;

  await Promise.all([
    AgentLog.create({
      accountId, transcriptId, transcriptName, workloadName, agentType,
      promptTokens, completionTokens, totalTokens, estimatedCost, durationMs,
    }),
    Account.findByIdAndUpdate(accountId, {
      $inc: {
        'usage.promptTokens':     promptTokens,
        'usage.completionTokens': completionTokens,
        'usage.totalTokens':      totalTokens,
        'usage.estimatedCost':    estimatedCost,
      },
    }),
  ]);
}

function normalizeWorkloadName(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\b(app|application|project|service|platform|system|workload)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

type RouterOpportunity = z.infer<typeof routerSchema>['opportunities'][number];

function dedupeRouterOpportunities(opportunities: RouterOpportunity[]) {
  const byKey = new Map<string, RouterOpportunity>();
  for (const opp of opportunities) {
    const key = normalizeWorkloadName(opp.workloadName);
    if (!key) continue;
    const existing = byKey.get(key);
    if (!existing || opp.confidenceScore > existing.confidenceScore) {
      byKey.set(key, opp);
    }
  }
  return Array.from(byKey.values());
}

/**
 * Semantic workload matching.
 * 1. Fast path: exact normalized-key match (free, no API call).
 * 2. Semantic path: single LLM call to detect same-project name variations
 *    (e.g. "Ticketing App" == "Ticketing System").
 * Returns the workloadId of the matched existing workload, or null if new.
 */
const WORKLOAD_MATCH_SCHEMA = z.object({
  matchedWorkloadId: z
    .string()
    .optional()
    .describe(
      'workloadId of the existing workload this maps to. Omit entirely if this is a new distinct workload.'
    ),
});

async function findMatchingWorkload(
  newWorkloadName: string,
  newContextDescription: string,
  existingWorkloads: Array<{ workloadId: string; workloadName: string; normalizedKey: string }>
): Promise<{ matchedId: string | null; usage?: any }> {
  if (existingWorkloads.length === 0) return { matchedId: null };

  // Fast path: exact normalized-key match (no LLM call needed)
  const normKey = normalizeWorkloadName(newWorkloadName);
  const exactMatch = existingWorkloads.find(w => w.normalizedKey === normKey);
  if (exactMatch) return { matchedId: exactMatch.workloadId };

  // Semantic path: LLM decides if the new workload is the same project as any existing one
  try {
    const result = await generateObject({
      model: googleAI('gemini-2.5-pro'),
      schema: WORKLOAD_MATCH_SCHEMA,
      experimental_telemetry: { isEnabled: true },
      prompt: `You are a workload deduplication assistant.

A new workload was identified from a sales transcript:
  Name: "${newWorkloadName}"
  Context: "${newContextDescription}"

Compare it to the existing tracked workloads and decide if it refers to the SAME project/application as any of them.

EXISTING WORKLOADS:
${existingWorkloads.map(w => `  - workloadId: "${w.workloadId}"  name: "${w.workloadName}"`).join('\n')}

Rules:
1. Match ONLY if they are clearly the same application (e.g. "Ticketing App" and "Ticketing System" are the same; "Order Management" and "Analytics Dashboard" are not).
2. Minor name variations (abbreviations, subtitles, re-wordings) should still match.
3. If there is any doubt, do NOT match — omit matchedWorkloadId.
4. Return the matchedWorkloadId of the best match, or omit it if this is a new distinct workload.`,
    });
    return { matchedId: result.object.matchedWorkloadId ?? null, usage: result.usage };
  } catch {
    return { matchedId: null };
  }
}

const MERGED_WORKLOAD_SCHEMA = z.object({
  technical: technicalSchema,
  commercial: commercialSchema,
  strategy: strategySchema,
  mongodbContribution: mongodbContributionSchema,
});

async function mergeWorkloadDcs(existing: DCSData, incoming: DCSData): Promise<{ dcs: DCSData; usage?: any }> {
  try {
    const mergeResult = await generateObject({
      model: googleAI('gemini-2.5-pro'),
      schema: MERGED_WORKLOAD_SCHEMA,
      experimental_telemetry: { isEnabled: true },
      prompt: `You are a DCS merger.

Merge the existing and incoming workload analysis into one consolidated object.
Rules:
1. Preserve factual details from both inputs.
2. Keep arrays deduplicated and additive where possible.
3. Keep summaries coherent and avoid contradictions.
4. Do not invent facts not present in either input.

EXISTING:
${JSON.stringify(existing, null, 2)}

INCOMING:
${JSON.stringify(incoming, null, 2)}`,
    });
    return {
      dcs: {
        workloadId: existing.workloadId,
        workloadName: existing.workloadName,
        technical: mergeResult.object.technical,
        commercial: mergeResult.object.commercial,
        strategy: mergeResult.object.strategy,
        mongodbContribution: mergeResult.object.mongodbContribution,
      } as DCSData,
      usage: mergeResult.usage,
    };
  } catch {
    return { dcs: { ...incoming, workloadId: existing.workloadId, workloadName: existing.workloadName } };
  }
}

// ─── Incremental DCS Generation ─────────────────────────────────────────────────────
// Each unprocessed transcript is processed sequentially.
// For every workload identified by the Router Agent:
//   1. Normalized-key exact match is tried first (free).
//   2. LLM semantic match is attempted to catch name variations.
//   3. Match found → merge DCS into existing Workload document.
//   4. No match → create a new Workload document.
// Account.dcsData is rebuilt as a denormalised snapshot after every transcript.

async function processDCSGeneration(accountId: string) {

  try {
    await dbConnect();

    const account = await Account.findById(accountId);
    if (!account) throw new Error('Account not found');

    const transcripts = await Transcript.find({ accountId }).sort({ createdAt: 1 });
    if (!transcripts.length) throw new Error('No transcripts found for this account');

    const pendingTranscripts = transcripts.filter(t => !(t as any).processedForDcs);

    if (pendingTranscripts.length === 0) {
      await Account.findByIdAndUpdate(accountId, {
        status: 'COMPLETED',
        progressStep: '',
        progressDetails: {},
      });
      return;
    }

    // Load all existing Workload documents — live source of truth for similarity checks
    const existingWorkloads = await Workload.find({ accountId }).lean() as any[];

    for (let ti = 0; ti < pendingTranscripts.length; ti++) {
      const transcript     = pendingTranscripts[ti];
      const transcriptId   = transcript._id.toString();
      const transcriptName = transcript.filename;
      console.log(`\n=== Processing Transcript ${ti + 1}/${pendingTranscripts.length}: ${transcriptName} ===`);

      await Account.findByIdAndUpdate(accountId, {
        progressStep: 'router',
        progressDetails: {
          currentTranscript: transcriptName,
          transcriptProgress: `${ti + 1}/${pendingTranscripts.length}`,
        },
      } as any);

      // ── Pass 1: Router ────────────────────────────────────────────────────────
      console.log('=== PASS 1: Router Agent - Identifying Workloads ===');

      const routerT0 = Date.now();
      const routerResult = await generateObject({
        model: googleAI('gemini-2.5-pro'),
        schema: routerSchema,
        experimental_telemetry: { isEnabled: true },
        prompt: `You are a Sales Discovery Analyst. Identify DISTINCT workloads in this single transcript.

**Rules:**
1. Each workload is a SEPARATE software application or project (e.g., "E-Commerce Platform", "Analytics Dashboard", "Mobile Banking App").
2. Ignore minor features or updates to existing systems unless they represent a NEW database deployment.
3. If the transcript is just "general MongoDB discussion" with no specific project, return an empty array.
4. Assign a confidence score (0-1) based on how much technical/commercial detail is present for that workload.

TRANSCRIPT:
${transcript.fullText}`,
      });
      await logAgentCall({ accountId, transcriptId, transcriptName, agentType: 'router', usage: routerResult.usage, durationMs: Date.now() - routerT0 });

      const validOpportunities = dedupeRouterOpportunities(
        routerResult.object.opportunities.filter(opp => opp.confidenceScore >= 0.6)
      );

      console.log(`  Router found ${validOpportunities.length} valid workload(s) (confidence >= 0.6)`);

      await Account.findByIdAndUpdate(accountId, {
        progressDetails: {
          currentTranscript: transcriptName,
          transcriptProgress: `${ti + 1}/${pendingTranscripts.length}`,
          totalWorkloads: validOpportunities.length,
          completedWorkloads: 0,
        },
      } as any);

      // ── Pass 2: All workloads in parallel — Slicer → 4 Agents → Semantic Match ──
      // Each workload's AI calls are independent, so we fan out with Promise.all.
      // Semantic matching uses the pre-transcript existingWorkloads snapshot so
      // all workloads see the same base state regardless of execution order.
      console.log(`  Running ${validOpportunities.length} workload(s) in parallel...`);

      await Account.findByIdAndUpdate(accountId, {
        progressStep: 'agents',
        progressDetails: {
          currentTranscript: transcriptName,
          totalWorkloads: validOpportunities.length,
          completedWorkloads: 0,
          transcriptProgress: `${ti + 1}/${pendingTranscripts.length}`,
        },
      } as any);

      // Snapshot existingWorkloads before this transcript so all parallel
      // workload branches see the same base state for semantic matching.
      const existingWorkloadsSnapshot = existingWorkloads.map(w => ({
        workloadId: w.workloadId,
        workloadName: w.workloadName,
        normalizedKey: w.normalizedKey,
      }));

      const parallelResults = await Promise.all(
        validOpportunities.map(async (opp) => {
          console.log(`\n  --- Starting workload: "${opp.workloadName}" ---`);

          // Step 2a: Slicer
          const slicerT0 = Date.now();
          const slicerResult = await generateObject({
            model: googleAI('gemini-2.5-pro'),
            schema: z.object({
              sanitizedContext: z.string().describe(
                'The rewritten transcript containing ONLY information relevant to the specified workload.'
              ),
            }),
            experimental_telemetry: { isEnabled: true },
            prompt: `You are a Context Filter. Read the transcript below.

Identify who is the 'Customer' and who is the 'MongoDB Seller/SA'.

REWRITE the transcript to include ONLY the dialogue, facts, and context relevant to the workload: **"${opp.workloadName}"**.

Retain the speaker labels (e.g., Customer vs. MongoDB) for every line.

**WORKLOAD CONTEXT:**
${opp.contextDescription}

**RULES:**
1. REMOVE all discussion about other projects/workloads.
2. IF a metric (e.g. '5TB data') is not explicitly linked to this workload, DELETE IT.
3. DELETE dates, stakeholder names, or technical details NOT relevant to this workload.
4. PRESERVE all dates, stakeholder names, technical specs, and pain points that ARE relevant to this workload.
5. RETURN only the filtered text with clear speaker labels.

**ORIGINAL TRANSCRIPT:**
${transcript.fullText}`,
          });
          const sanitizedContext = slicerResult.object.sanitizedContext;
          console.log(`  Slicer done: "${opp.workloadName}" (${sanitizedContext.length} chars)`);
          await logAgentCall({ accountId, transcriptId, transcriptName, workloadName: opp.workloadName, agentType: 'slicer', usage: slicerResult.usage, durationMs: Date.now() - slicerT0 });

          // Step 2b: 4 Agents + semantic matching — all in parallel
          // Each call fires logAgentCall fire-and-forget as soon as it completes,
          // updating the Account.usage $inc in real time for the polling UI.
          const agentsT0 = Date.now();
          const [technicalResult, commercialResult, strategyResult, contributionResult, matchedWorkloadId] =
            await Promise.all([
              // Agent 1: Technical Architect
              generateObject({
                model: googleAI('gemini-2.5-pro'),
                schema: technicalSchema,
                experimental_telemetry: { isEnabled: true },
                prompt: `You are a Principal Architect. Extract ONLY technical evidence: specific instance types (e.g. m5.large), database versions, topology (Replica Set vs Sharded), and metrics (latency, throughput). Ignore sales politics.

CRITICAL GROUNDING RULE: You must extract information strictly from the CUSTOMER'S perspective.
- If the MongoDB Rep suggests a feature (e.g., 'You should use Time Series'), DO NOT add it to 'Future State' unless the Customer explicitly agrees or asks for it.
- Current State and Pain Points must be facts stated by the Customer, not assumptions made by the Rep.

**B. TECHNICAL DEEP DIVE (Current vs. Future)**
- **Current State Description:** Provide a detailed explanation of the current solution and architecture.
- **Current Architecture:** Topology, Hardware (instance types, RAM, CPU), Data Flow (Ingest->Process->Store->Consume), Metrics (GB/TB, ms, RPS).
- **Negative Consequences:** Technical Root Cause -> Business Impact.
- **Future State:** Proposed Solution (implementation + migration strategy), Specific Features (Time Series, Atlas Search, Vector Search, Online Archive), Outcomes.

**E. TECH STACK (Current — extract from what the customer mentions)**
Extract each layer of the customer's current tech stack. For every item provide a one-liner describing its role. Only include items that are explicitly mentioned or strongly implied by the customer.
- **Databases:** All databases in use (e.g. PostgreSQL 14 — primary OLTP store, Redis — session cache).
- **Backend Languages / API Frameworks:** Languages and frameworks powering services (e.g. Java Spring Boot — core microservices, Python FastAPI — ML serving layer).
- **Frontend Technologies:** Web/mobile UI frameworks (e.g. React — customer portal, iOS Swift — mobile app).
- **Messaging & Streaming:** Event brokers, queues, streaming platforms (e.g. Apache Kafka — event backbone, RabbitMQ — task queue).
- **AI Stack (only if discussed):**
  - LLMs in use or planned (name + what they're used for)
  - Embedding models (name + what is being embedded)
  - Chunking strategy (how documents are split before embedding)
  - Orchestration frameworks (LangChain, LlamaIndex, Haystack, AutoGen, etc. + role)
  - Preferred language for AI/ML workloads
  - Multimodality (any image/audio/video inputs discussed)
  - Other AI tooling (guardrails, eval frameworks, fine-tuning, inference servers)
- **Other tooling** worth noting (CI/CD, observability, infrastructure-as-code, etc.)

**C. USE CASE SUMMARY**
- Application Purpose, Business Problem, Key Workflows, Data Patterns, Scale Characteristics.

**D. DATA FLOW DIAGRAM**
- Components: Client/UI, Application/Service, Data, External Integration layers.
- Flows: how data enters, is processed, stored, consumed.
- Volume & Velocity metrics per flow.

TRANSCRIPT (workload-filtered):
${sanitizedContext}`,
              }).then(r => { logAgentCall({ accountId, transcriptId, transcriptName, workloadName: opp.workloadName, agentType: 'technical', usage: r.usage, durationMs: Date.now() - agentsT0 }).catch(console.error); return r; }),

              // Agent 2: Commercial Manager
              generateObject({
                model: googleAI('gemini-2.5-pro'),
                schema: commercialSchema,
                experimental_telemetry: { isEnabled: true },
                prompt: `You are a Sales Manager. Extract ONLY: Stakeholders (Buyer vs Champion), Partner ecosystem (Cloud/SI), and Timelines. Ignore technical logs.

**A. STAKEHOLDERS** — Who reports to whom, psychographics, sentiment analysis (skeptical/enthusiastic/concerned), Economic Buyer vs Technical Champion.
**B. PARTNERS & EVALUATION** — Cloud provider + committed spend, SIs (design vs delivery), evaluation process (PoC -> Security -> Procurement -> Sign-off).
**C. TIMELINE & URGENCY** — Exact launch date, Compelling Event, Consequence of Delay, ALL dates mentioned in the call with context.

TRANSCRIPT (workload-filtered):
${sanitizedContext}`,
              }).then(r => { logAgentCall({ accountId, transcriptId, transcriptName, workloadName: opp.workloadName, agentType: 'commercial', usage: r.usage, durationMs: Date.now() - agentsT0 }).catch(console.error); return r; }),

              // Agent 3: Deal Strategist
              generateObject({
                model: googleAI('gemini-2.5-pro'),
                schema: strategySchema,
                experimental_telemetry: { isEnabled: true },
                prompt: `You are a Deal Strategist. Determine Sales Motion (Migrate/Replace/Launch/Select). Map pain points to Value Drivers (Compete, Save, Risk, Velocity).

CRITICAL GROUNDING RULE: '3 Whys' and 'Value Drivers' must represent the CUSTOMER'S actual internal motivations, NOT the MongoDB Rep's sales pitch.
- If the Rep says 'MongoDB will save you money,' but the Customer never validates it, DO NOT list 'Save Money'. Mark it as MISSING.

**A. VALUE DRIVERS** — Compete/Revenue, Save Money, Reduce Risk, Dev Velocity.
**B. SALES MOTION** — Migrate (from Community/DocDB/Cosmos), Replace (from RDBMS/Cassandra), Launch (greenfield), Select (already chosen MongoDB).
**C. TIGER SALES ROUTE** — Classic / Sprint / Fast.
**D. THE 3 WHYS** — Why Anything / Why MongoDB / Why Now. Each: FOUND / PARTIAL / MISSING.
**E. GAP ANALYSIS** — 3-5 hyper-specific discovery questions to fill gaps in the 3 Whys.
**F. NEXT STEPS** — 3-7 actions with category, owner, timeline, priority.

TRANSCRIPT (workload-filtered):
${sanitizedContext}`,
              }).then(r => { logAgentCall({ accountId, transcriptId, transcriptName, workloadName: opp.workloadName, agentType: 'strategy', usage: r.usage, durationMs: Date.now() - agentsT0 }).catch(console.error); return r; }),

              // Agent 4: MongoDB Contribution Analyst (workload-scoped)
              generateObject({
                model: googleAI('gemini-2.5-pro'),
                schema: mongodbContributionSchema,
                experimental_telemetry: { isEnabled: true },
                prompt: `You are a Conversation Analyst. Summarize what the MongoDB team contributed for workload "${opp.workloadName}".

CRITICAL RULES:
- ONLY extract dialogue FROM MongoDB employees. DO NOT include customer statements.
- Do NOT attribute contributions to specific individuals — treat the team as a collective unit.

A. MONGODB TEAM MEMBERS — names + roles if mentioned.
B. TECHNICAL CONTRIBUTIONS (team-level) — solutions/features suggested, for each note customer validation status.
C. SALES MESSAGING (team-level) — value propositions, competitive positioning, pricing, for each note validation status.
D. QUESTIONS ASKED (team-level) — discovery questions asked, customer response, effectiveness rating.
E. UNVALIDATED SUGGESTIONS — features NOT confirmed by the customer + follow-up needed.
F. OVERALL EFFECTIVENESS — Customer-Centric / Balanced / MongoDB-Centric, 2-3 sentence assessment, improvement areas.

TRANSCRIPT (workload-filtered):
${sanitizedContext}`,
              }).then(r => { logAgentCall({ accountId, transcriptId, transcriptName, workloadName: opp.workloadName, agentType: 'contribution', usage: r.usage, durationMs: Date.now() - agentsT0 }).catch(console.error); return r; }),

              // Semantic workload matching runs concurrently with the 4 agents.
              // Uses pre-transcript snapshot — safe for all parallel branches.
              findMatchingWorkload(
                opp.workloadName,
                opp.contextDescription,
                existingWorkloadsSnapshot
              ).then(({ matchedId, usage }) => {
                if (usage) logAgentCall({ accountId, transcriptId, transcriptName, workloadName: opp.workloadName, agentType: 'matcher', usage, durationMs: Date.now() - agentsT0 }).catch(console.error);
                return matchedId;
              }),
            ]);

          console.log(`  Completed: "${opp.workloadName}"`);

          return {
            opp,
            technical: technicalResult.object,
            commercial: commercialResult.object,
            strategy: strategyResult.object,
            mongodbContribution: contributionResult.object,
            matchedWorkloadId,
          };
        })
      );

      // Sequential DB writes — keeps existingWorkloads in-memory state consistent
      for (const result of parallelResults) {
        const { opp, technical, commercial, strategy, mongodbContribution, matchedWorkloadId } = result;

        const matchedWorkload = matchedWorkloadId
          ? existingWorkloads.find(w => w.workloadId === matchedWorkloadId) ?? null
          : null;
        const isMatch = matchedWorkload !== null;

        console.log(`  Workload: "${opp.workloadName}" -> ${isMatch ? `merged into "${matchedWorkload!.workloadName}"` : 'new workload created'}`);

        if (isMatch) {
          const existingDCS: DCSData = {
            workloadId: matchedWorkload.workloadId,
            workloadName: matchedWorkload.workloadName,
            technical: matchedWorkload.technical,
            commercial: matchedWorkload.commercial,
            strategy: matchedWorkload.strategy,
            mongodbContribution: matchedWorkload.mongodbContribution,
          };
          const incomingDCS: DCSData = {
            workloadId: matchedWorkload.workloadId,
            workloadName: matchedWorkload.workloadName,
            technical,
            commercial,
            strategy,
            mongodbContribution,
          };
          const mergerT0 = Date.now();
          const { dcs: merged, usage: mergerUsage } = await mergeWorkloadDcs(existingDCS, incomingDCS);
          if (mergerUsage) {
            await logAgentCall({ accountId, transcriptId, transcriptName, workloadName: opp.workloadName, agentType: 'merger', usage: mergerUsage, durationMs: Date.now() - mergerT0 });
          }

          await Workload.findOneAndUpdate(
            { accountId, workloadId: matchedWorkload.workloadId },
            {
              technical: merged.technical,
              commercial: merged.commercial,
              strategy: merged.strategy,
              mongodbContribution: merged.mongodbContribution,
              lastSeenTranscriptId: transcript._id,
              $inc: { seenCount: 1 },
              $addToSet: { transcriptIds: transcript._id },
            }
          );

          const idx = existingWorkloads.findIndex(w => w.workloadId === matchedWorkload.workloadId);
          if (idx >= 0) {
            existingWorkloads[idx] = {
              ...existingWorkloads[idx],
              technical: merged.technical,
              commercial: merged.commercial,
              strategy: merged.strategy,
              mongodbContribution: merged.mongodbContribution,
            };
          }
        } else {
          const newWorkloadId = crypto.randomUUID();
          const newWorkload = new Workload({
            accountId,
            workloadId: newWorkloadId,
            workloadName: opp.workloadName,
            normalizedKey: normalizeWorkloadName(opp.workloadName),
            transcriptIds: [transcript._id],
            seenCount: 1,
            firstSeenTranscriptId: transcript._id,
            lastSeenTranscriptId: transcript._id,
            technical,
            commercial,
            strategy,
            mongodbContribution,
          });
          await newWorkload.save();
          existingWorkloads.push(newWorkload.toObject());
        }
      }

      // Mark transcript as processed so it won't be reprocessed on next call
      await Transcript.findByIdAndUpdate(transcript._id, {
        processedForDcs: true,
        processedAt: new Date(),
      } as any);

      // Rebuild Account.dcsData snapshot from Workload collection after each transcript
      const snapshot = await Workload.find({ accountId }).lean() as any[];
      await Account.findByIdAndUpdate(accountId, {
        dcsData: snapshot.map(w => ({
          workloadId: w.workloadId,
          workloadName: w.workloadName,
          technical: w.technical,
          commercial: w.commercial,
          strategy: w.strategy,
          mongodbContribution: w.mongodbContribution,
          flaggedByUsers: w.flaggedByUsers ?? [],
        })),
      });
    }

    // Final status update
    await Account.findByIdAndUpdate(accountId, {
      status: 'COMPLETED',
      progressStep: '',
      progressDetails: {},
    });

    console.log('=== DCS GENERATION COMPLETED ===');
  } catch (error) {
    console.error('Error generating DCS:', error);
    
    // Reset status on error
    await Account.findByIdAndUpdate(accountId, { 
      status: 'IDLE',
      progressStep: '',
      progressDetails: {}
    });
    
    throw error;
  }
}

export async function getAccounts(userEmail: string) {
  try {
    console.log('=== getAccounts called for:', userEmail);
    await dbConnect();
    
    // Find accounts where user is owner OR in sharedWith array
    const accounts = await Account.find({
      $or: [
        { userEmail: userEmail },
        { sharedWith: userEmail }
      ]
    }).sort({ createdAt: -1 });
    
    console.log('Found', accounts.length, 'accounts');
    accounts.forEach(acc => {
      console.log('- Account:', acc.name, '| Owner:', acc.userEmail, '| SharedWith:', acc.sharedWith);
    });
    
    return accounts.map(account => ({
      _id: account._id.toString(),
      name: account.name,
      status: account.status,
      transcriptCount: account.transcriptIds?.length || 0,
      createdAt: account.createdAt,
      isOwner: account.userEmail === userEmail
    }));
  } catch (error) {
    console.error('Error fetching accounts:', error);
    return [];
  }
}

export async function deleteAccount(accountId: string, userEmail: string) {
  try {
    await dbConnect();

    const account = await Account.findById(accountId);
    if (!account) return { success: false, error: 'Account not found' };
    if (account.userEmail !== userEmail) return { success: false, error: 'Only the owner can delete this account' };

    // Delete all transcripts linked to this account
    if (account.transcriptIds?.length > 0) {
      await Transcript.deleteMany({ _id: { $in: account.transcriptIds } });
    }

    // Delete all Workload documents for this account
    await Workload.deleteMany({ accountId });

    // Delete the account itself
    await Account.findByIdAndDelete(accountId);

    revalidatePath('/');
    return { success: true };
  } catch (error) {
    console.error('Error deleting account:', error);
    return { success: false, error: 'Failed to delete account' };
  }
}

export async function searchAccounts(query: string, userEmail: string) {
  try {
    await dbConnect();

    // Empty query — return all accounts (same as getAccounts)
    if (!query.trim()) return getAccounts(userEmail);

    let results: any[] = [];

    try {
      // Atlas Search: autocomplete (edgeGram) on name field — avoids false fuzzy matches
      results = await Account.aggregate([
        {
          $search: {
            index: 'accounts_search',
            autocomplete: {
              query: query,
              path: 'name',
              tokenOrder: 'sequential'
            }
          }
        },
        {
          // Access control: owned OR shared
          $match: {
            $or: [
              { userEmail: userEmail },
              { sharedWith: userEmail }
            ]
          }
        },
        { $limit: 20 }
      ]);
    } catch {
      // Atlas Search index not yet provisioned — fall back to regex
      console.warn('Atlas Search unavailable, falling back to regex search');
      results = await Account.find({
        $and: [
          { $or: [{ userEmail }, { sharedWith: userEmail }] },
          { name: { $regex: query, $options: 'i' } }
        ]
      }).limit(20);
    }

    return results.map((account: any) => ({
      _id: account._id.toString(),
      name: account.name,
      status: account.status,
      transcriptCount: account.transcriptIds?.length || 0,
      createdAt: account.createdAt,
      isOwner: account.userEmail === userEmail
    }));
  } catch (error) {
    console.error('Error searching accounts:', error);
    return [];
  }
}

export async function getAccountDetails(accountId: string, userEmail: string) {
  try {
    await dbConnect();
    const account = await Account.findById(accountId).populate('transcriptIds');
    
    if (!account) {
      return null;
    }

    // Check if user has access (owner OR in sharedWith array)
    const isOwner = account.userEmail === userEmail;
    const isShared = account.sharedWith && account.sharedWith.includes(userEmail);
    
    if (!isOwner && !isShared) {
      return null; // User has no access to this account
    }

    // Fetch workloads fresh so flagged-per-user filtering is always current.
    // Falls back to the denormalised Account.dcsData snapshot for accounts that
    // were generated before the Workload collection existed.
    const rawWorkloads = await Workload.find({ accountId: account._id }).lean() as any[];
    const dcsData = rawWorkloads.length > 0
      ? rawWorkloads
          .filter(w => !(w.flaggedByUsers ?? []).includes(userEmail))
          .map(w => ({
            workloadId: w.workloadId,
            workloadName: w.workloadName,
            technical: w.technical,
            commercial: w.commercial,
            strategy: w.strategy,
            mongodbContribution: w.mongodbContribution,
          }))
      : (account.dcsData ? JSON.parse(JSON.stringify(account.dcsData)) : null);

    return {
      _id: account._id.toString(),
      name: account.name,
      userEmail: account.userEmail,
      sharedWith: account.sharedWith || [],
      isOwner,
      status: account.status,
      progressStep: account.progressStep || '',
      progressDetails: account.progressDetails ? JSON.parse(JSON.stringify(account.progressDetails)) : {},
      dcsData,
      usage: account.usage ? {
        promptTokens: account.usage.promptTokens || 0,
        completionTokens: account.usage.completionTokens || 0,
        totalTokens: account.usage.totalTokens || 0,
        estimatedCost: account.usage.estimatedCost || 0
      } : null,
      transcripts: (account.transcriptIds as any[]).map(transcript => ({
        _id: transcript._id.toString(),
        filename: transcript.filename,
        createdAt: transcript.createdAt.toISOString(),
        processedForDcs: !!(transcript as any).processedForDcs,
      })),
      createdAt: account.createdAt.toISOString()
    };
  } catch (error) {
    console.error('Error fetching account details:', error);
    return null;
  }
}
// ─── Workload Flag ───────────────────────────────────────────────────────────

/**
 * Mark a workload as "discussed in call" for the requesting user.
 * Once flagged the workload is hidden from that user's DCS views.
 */
export async function flagWorkload(
  accountId: string,
  workloadId: string,
  userEmail: string
) {
  try {
    await dbConnect();

    // Verify the user has access to this account
    const account = await Account.findById(accountId).lean() as any;
    if (!account) return { success: false, error: 'Account not found' };
    if (account.userEmail !== userEmail && !(account.sharedWith ?? []).includes(userEmail)) {
      return { success: false, error: 'Access denied' };
    }

    await Workload.findOneAndUpdate(
      { accountId, workloadId },
      { $addToSet: { flaggedByUsers: userEmail } }
    );

    return { success: true };
  } catch (error) {
    console.error('Error flagging workload:', error);
    return { success: false, error: 'Failed to flag workload' };
  }
}

// Sharing Actions

export async function shareAccount(accountId: string, emailToShareWith: string, currentUserEmail: string) {
  try {
    console.log('=== shareAccount called ===');
    console.log('accountId:', accountId);
    console.log('emailToShareWith:', emailToShareWith);
    console.log('currentUserEmail:', currentUserEmail);
    
    await dbConnect();
    
    const account = await Account.findById(accountId);
    console.log('Account found:', account ? 'Yes' : 'No');
    
    if (!account) {
      return { success: false, error: 'Account not found' };
    }
    
    console.log('Account owner:', account.userEmail);
    console.log('Current sharedWith:', account.sharedWith);
    
    // Verify current user is the owner
    if (account.userEmail !== currentUserEmail) {
      return { success: false, error: 'Only account owner can share' };
    }
    
    // Prevent sharing with self
    if (emailToShareWith === currentUserEmail) {
      return { success: false, error: 'Cannot share account with yourself' };
    }
    
    // Check if already shared
    if (account.sharedWith && account.sharedWith.includes(emailToShareWith)) {
      return { success: false, error: 'Account already shared with this user' };
    }
    
    // Add email to sharedWith array
    const updatedAccount = await Account.findByIdAndUpdate(
      accountId, 
      { $push: { sharedWith: emailToShareWith } },
      { new: true } // Return the updated document
    );
    
    console.log('After update - sharedWith:', updatedAccount?.sharedWith);
    console.log('=== shareAccount completed successfully ===');
    
    revalidatePath(`/account/${accountId}`);
    revalidatePath('/');
    
    return { success: true };
  } catch (error) {
    console.error('Error sharing account:', error);
    return { success: false, error: 'Failed to share account' };
  }
}

export async function unshareAccount(accountId: string, emailToRemove: string, currentUserEmail: string) {
  try {
    await dbConnect();
    
    const account = await Account.findById(accountId);
    
    if (!account) {
      return { success: false, error: 'Account not found' };
    }
    
    // Verify current user is the owner
    if (account.userEmail !== currentUserEmail) {
      return { success: false, error: 'Only account owner can unshare' };
    }
    
    // Remove email from sharedWith array
    await Account.findByIdAndUpdate(accountId, {
      $pull: { sharedWith: emailToRemove }
    });
    
    revalidatePath(`/account/${accountId}`);
    revalidatePath('/');
    
    return { success: true };
  } catch (error) {
    console.error('Error unsharing account:', error);
    return { success: false, error: 'Failed to unshare account' };
  }
}
