'use server';

import { revalidatePath } from 'next/cache';
import dbConnect from '@/lib/db';
import Account from '@/models/Account';
import Transcript from '@/models/Transcript';
import { generateObject } from 'ai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { technicalSchema, commercialSchema, strategySchema, routerSchema, type DCSData } from '@/lib/schemas';

// Configure Google AI
const googleAI = createGoogleGenerativeAI({
  apiKey: process.env.GOOGLE_VERTEX_AI_API_KEY!,
});

export async function createAccount(name: string) {
  try {
    await dbConnect();
    
    const account = new Account({
      name,
      transcriptIds: [],
      dcsData: null,
      status: 'IDLE'
    });

    await account.save();
    revalidatePath('/');
    
    return { success: true, accountId: account._id.toString() };
  } catch (error) {
    console.error('Error creating account:', error);
    return { success: false, error: 'Failed to create account' };
  }
}

export async function uploadTranscript(accountId: string, fileContent: string, fileName: string) {
  try {
    await dbConnect();
    
    const transcript = new Transcript({
      accountId,
      filename: fileName,
      fullText: fileContent
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
    
    // Set status to PROCESSING
    await Account.findByIdAndUpdate(accountId, { status: 'PROCESSING' });
    revalidatePath(`/account/${accountId}`);

    // Fetch all transcripts for this account
    const account = await Account.findById(accountId).populate('transcriptIds');
    
    if (!account || !account.transcriptIds || account.transcriptIds.length === 0) {
      throw new Error('No transcripts found for this account');
    }

    // Concatenate all transcript text
    const transcripts = account.transcriptIds as any[];
    const combinedText = transcripts.map((transcript: any) => transcript.fullText).join('\n\n--- TRANSCRIPT SEPARATOR ---\n\n');

    console.log('=== PASS 1: Router Agent - Identifying Workloads ===');
    
    // PASS 1: Router Agent - Identify distinct workloads
    const routerResult = await generateObject({
      model: googleAI('gemini-3-pro-preview'),
      schema: routerSchema,
      experimental_telemetry: { isEnabled: true },
      prompt: `You are a Sales Discovery Analyst. Your job is to identify DISTINCT sales opportunities (workloads/projects) discussed in these transcripts.

**Rules:**
1. Each workload is a SEPARATE software application or project (e.g., "E-Commerce Platform", "Analytics Dashboard", "Mobile Banking App").
2. Ignore minor features or updates to existing systems unless they represent a NEW database deployment.
3. If the transcript is just "general MongoDB discussion" with no specific project, return an empty array.
4. Assign a confidence score (0-1) based on how much technical/commercial detail is present for that workload.

**Output Format:**
Return a list of opportunities with:
- workloadName: Clear, descriptive name
- contextDescription: 1-sentence summary to help scope extraction
- confidenceScore: 0-1 (only include if you have real details, not just mentions)

TRANSCRIPT:
${combinedText}`
    });

    console.log('Router found opportunities:', routerResult.object.opportunities);

    // Filter out low-confidence workloads (< 0.6)
    const validOpportunities = routerResult.object.opportunities.filter(
      opp => opp.confidenceScore >= 0.6
    );

    console.log(`Filtered to ${validOpportunities.length} valid opportunities (confidence >= 0.6)`);

    if (validOpportunities.length === 0) {
      // No valid workloads found
      await Account.findByIdAndUpdate(accountId, {
        dcsData: [],
        status: 'COMPLETED',
        usage: {
          promptTokens: routerResult.usage?.inputTokens || 0,
          completionTokens: routerResult.usage?.outputTokens || 0,
          totalTokens: routerResult.usage?.totalTokens || 0,
          estimatedCost: ((routerResult.usage?.totalTokens || 0) / 1000) * 0.001
        }
      });
      revalidatePath(`/account/${accountId}`);
      return { success: true, dcsData: [] };
    }

    console.log('=== PASS 2: Extracting Details for Each Workload ===');

    // Track total usage across all passes
    let totalInputTokens = routerResult.usage?.inputTokens || 0;
    let totalOutputTokens = routerResult.usage?.outputTokens || 0;
    let totalTokens = routerResult.usage?.totalTokens || 0;

    // PASS 2: For each valid workload, run the 3-agent extraction in parallel
    const dcsArray: DCSData[] = [];

    for (const opp of validOpportunities) {
      console.log(`\n--- Processing: ${opp.workloadName} ---`);
      
      const workloadId = crypto.randomUUID();
      
      // Create scoping instruction for agents
      const scopingInstruction = `FOCUS ONLY on the workload named '${opp.workloadName}' (${opp.contextDescription}). IGNORE details about other apps/workloads.`;

      // Run 3 agents in parallel for this workload
      const [technicalResult, commercialResult, strategyResult] = await Promise.all([
        // Agent 1: Technical Architect
        generateObject({
          model: googleAI('gemini-3-pro-preview'),
          schema: technicalSchema,
          experimental_telemetry: { isEnabled: true },
          prompt: `You are a Principal Architect. Extract ONLY technical evidence: specific instance types (e.g. m5.large), database versions, topology (Replica Set vs Sharded), and metrics (latency, throughput). Ignore sales politics.

${scopingInstruction}

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
  - **Outcomes:** Measurable success metrics (e.g., "P99 < 10ms").

TRANSCRIPT:
${combinedText}`
        }),

        // Agent 2: Commercial Manager
        generateObject({
          model: googleAI('gemini-3-pro-preview'),
          schema: commercialSchema,
          experimental_telemetry: { isEnabled: true },
          prompt: `You are a Sales Manager. Extract ONLY: Stakeholders (Buyer vs Champion), Partner ecosystem (Cloud/SI), and Timelines (Compelling Events). Ignore technical logs.

${scopingInstruction}

**A. STAKEHOLDERS (The "Political Map")**
- Identify **Who reports to whom?** (e.g., "Engineering Manager reports to CTO").
- Identify **Psychographics:** What gives them confidence? What are their "scars" (past failures)?
- **Sentiment Analysis:** For non-MongoDB attendees, capture their sentiment and attitude (e.g., "Skeptical about migration", "Enthusiastic about new features", "Concerned about costs", "Supportive but needs proof").
- **Role:** Distinguish between the "Economic Buyer" (Signer) and "Technical Champion" (User).

**B. PARTNERS & EVALUATION**
- **Cloud:** AWS/Azure/GCP? Do they have a **Committed Spend** contract?
- **SIs:** Are Accenture, TCS, or Infosys involved? Are they doing design or just delivery?
- **Process:** What is the sequence? (PoC -> Security Review -> Procurement -> Sign-off).

**C. TIMELINE & URGENCY**
- **"No Date, No Deal":** Find the exact launch date.
- **Compelling Event:** What happens if they miss it? (e.g., "Diwali Peak", "Black Friday", "Audit").
- **Consequence of Delay:** "If we don't fix this by Oct 1st, we lose $50k/day."
- **All Dates Discussed:** Capture ALL dates mentioned in the call with their context (e.g., "March 15 - PoC completion deadline", "April 1 - Security review", "Q2 - Budget approval cycle", "June 30 - Current license expiration").

TRANSCRIPT:
${combinedText}`
        }),

        // Agent 3: Deal Strategist
        generateObject({
          model: googleAI('gemini-3-pro-preview'),
          schema: strategySchema,
          experimental_telemetry: { isEnabled: true },
          prompt: `You are a Deal Strategist. Determine the Sales Motion (Migrate/Replace/Launch/Select) based on strict definitions. Map pain points to Value Drivers (Compete, Save, Risk, Velocity).

${scopingInstruction}

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

TRANSCRIPT:
${combinedText}`
        })
      ]);

      // Accumulate token usage
      totalInputTokens += (technicalResult.usage?.inputTokens || 0) + 
                         (commercialResult.usage?.inputTokens || 0) + 
                         (strategyResult.usage?.inputTokens || 0);
      totalOutputTokens += (technicalResult.usage?.outputTokens || 0) + 
                          (commercialResult.usage?.outputTokens || 0) + 
                          (strategyResult.usage?.outputTokens || 0);
      totalTokens += (technicalResult.usage?.totalTokens || 0) + 
                    (commercialResult.usage?.totalTokens || 0) + 
                    (strategyResult.usage?.totalTokens || 0);

      // Merge into DCS object
      const dcsData: DCSData = {
        workloadId,
        workloadName: opp.workloadName,
        technical: technicalResult.object,
        commercial: commercialResult.object,
        strategy: strategyResult.object
      };

      dcsArray.push(dcsData);
      console.log(`✓ Completed: ${opp.workloadName}`);
    }

    console.log(`\n=== Generation Complete: ${dcsArray.length} workloads ===`);
    console.log('Total token usage:', { totalInputTokens, totalOutputTokens, totalTokens });

    const estimatedCost = totalTokens > 0 ? (totalTokens / 1000) * 0.001 : 0;

    // Update account with array of DCS data (OVERWRITE existing data)
    await Account.findByIdAndUpdate(accountId, {
      dcsData: dcsArray,
      status: 'COMPLETED',
      usage: {
        promptTokens: totalInputTokens,
        completionTokens: totalOutputTokens,
        totalTokens: totalTokens,
        estimatedCost: estimatedCost
      }
    });

    revalidatePath(`/account/${accountId}`);
    
    return { success: true, dcsData: dcsArray };
  } catch (error) {
    console.error('Error generating DCS:', error);
    
    // Reset status on error
    await Account.findByIdAndUpdate(accountId, { status: 'IDLE' });
    revalidatePath(`/account/${accountId}`);
    
    return { success: false, error: 'Failed to generate DCS' };
  }
}

export async function getAccounts() {
  try {
    await dbConnect();
    const accounts = await Account.find({}).sort({ createdAt: -1 });
    return accounts.map(account => ({
      _id: account._id.toString(),
      name: account.name,
      status: account.status,
      transcriptCount: account.transcriptIds.length,
      createdAt: account.createdAt
    }));
  } catch (error) {
    console.error('Error fetching accounts:', error);
    return [];
  }
}

export async function getAccountDetails(accountId: string) {
  try {
    await dbConnect();
    const account = await Account.findById(accountId).populate('transcriptIds');
    
    if (!account) {
      return null;
    }

    return {
      _id: account._id.toString(),
      name: account.name,
      status: account.status,
      dcsData: account.dcsData ? JSON.parse(JSON.stringify(account.dcsData)) : null,
      usage: account.usage ? {
        promptTokens: account.usage.promptTokens || 0,
        completionTokens: account.usage.completionTokens || 0,
        totalTokens: account.usage.totalTokens || 0,
        estimatedCost: account.usage.estimatedCost || 0
      } : null,
      transcripts: (account.transcriptIds as any[]).map(transcript => ({
        _id: transcript._id.toString(),
        filename: transcript.filename,
        createdAt: transcript.createdAt.toISOString()
      })),
      createdAt: account.createdAt.toISOString()
    };
  } catch (error) {
    console.error('Error fetching account details:', error);
    return null;
  }
}