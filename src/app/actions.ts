'use server';

import { revalidatePath } from 'next/cache';
import dbConnect from '@/lib/db';
import Account from '@/models/Account';
import Transcript from '@/models/Transcript';
import { generateObject } from 'ai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { technicalSchema, commercialSchema, strategySchema, routerSchema, mongodbContributionSchema, type DCSData } from '@/lib/schemas';
import { z } from 'zod';

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
    
    // Set status to PROCESSING with router step
    await Account.findByIdAndUpdate(
      accountId, 
      { 
        status: 'PROCESSING',
        progressStep: 'router',
        progressDetails: {}
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

async function processDCSGeneration(accountId: string) {
  try {
    await dbConnect();

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
      model: googleAI('gemini-2.5-pro'),
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

    // Update progress with identified workloads count
    await Account.findByIdAndUpdate(accountId, {
      progressStep: 'router',
      progressDetails: {
        totalWorkloads: validOpportunities.length,
        completedWorkloads: 0
      }
    });

    if (validOpportunities.length === 0) {
      // No valid workloads found
      await Account.findByIdAndUpdate(accountId, {
        dcsData: [],
        status: 'COMPLETED',
        progressStep: '',
        progressDetails: {},
        usage: {
          promptTokens: routerResult.usage?.inputTokens || 0,
          completionTokens: routerResult.usage?.outputTokens || 0,
          totalTokens: routerResult.usage?.totalTokens || 0,
          estimatedCost: ((routerResult.usage?.totalTokens || 0) / 1000) * 0.001
        }
      });
      return;
    }

    console.log('=== PASS 2: Extracting Details for Each Workload ===');

    // Track total usage across all passes
    let totalInputTokens = routerResult.usage?.inputTokens || 0;
    let totalOutputTokens = routerResult.usage?.outputTokens || 0;
    let totalTokens = routerResult.usage?.totalTokens || 0;

    // PASS 2: Process all workloads in parallel
    const workloadPromises = validOpportunities.map(async (opp, index) => {
      console.log(`\n--- Processing: ${opp.workloadName} ---`);
      
      const workloadId = crypto.randomUUID();
      
      // Update progress: Slicer for this workload
      await Account.findByIdAndUpdate(accountId, {
        progressStep: 'slicer',
        progressDetails: {
          currentWorkload: opp.workloadName,
          totalWorkloads: validOpportunities.length,
          completedWorkloads: index
        }
      });
      
      // ---------------------------------------------
      // STEP 2a: THE SLICER AGENT (The Firewall)
      // ---------------------------------------------
      console.log(`  -> Running Slicer Agent for: ${opp.workloadName}`);
      const slicerResult = await generateObject({
        model: googleAI('gemini-2.5-pro'),
        schema: z.object({
          sanitizedContext: z.string().describe("The rewritten transcript containing ONLY information relevant to the specified workload.")
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
${combinedText}`
      });

      const sanitizedContext = slicerResult.object.sanitizedContext;
      console.log(`  -> Slicer completed. Sanitized context length: ${sanitizedContext.length} chars`);

      // Update progress: Running 3 agents
      await Account.findByIdAndUpdate(accountId, {
        progressStep: 'agents',
        progressDetails: {
          currentWorkload: opp.workloadName,
          totalWorkloads: validOpportunities.length,
          completedWorkloads: index
        }
      });

      // ---------------------------------------------
      // STEP 2b: THE SCOPED EXTRACTION CHAIN
      // ---------------------------------------------
      // Run 3 agents in parallel for this workload using sanitizedContext (customer-only)
      const [technicalResult, commercialResult, strategyResult] = await Promise.all([
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

**C. USE CASE SUMMARY**
- **Detailed Use Case:** Provide a comprehensive summary describing:
  - **Application Purpose:** What the application does and who the end users are
  - **Business Problem:** The business problem it solves
  - **Key Workflows:** Key workflows and user interactions
  - **Data Patterns:** Read-heavy, write-heavy, real-time requirements, caching strategies
  - **Scale Characteristics:** Scale and performance characteristics

**D. DATA FLOW DIAGRAM**
- **Component Description:** Extract a list of all system components in the data flow:
  - Client/User Interface layers (Web, Mobile, API consumers)
  - Application/Service layers (Microservices, APIs, Backend services)
  - Data layer (Current database, MongoDB Atlas target, caching layers)
  - External integrations (Third-party APIs, Cloud services, Message queues)
- **Flow Description:** Describe the data flow between components:
  - How data enters the system (user actions, APIs, events)
  - Processing and transformation steps
  - Storage and retrieval patterns
  - Output/consumption of data
- **Volume & Velocity:** Key metrics for each flow (requests per second, data volume, latency requirements)

TRANSCRIPT:
${sanitizedContext}`
        }),

        // Agent 2: Commercial Manager
        generateObject({
          model: googleAI('gemini-2.5-pro'),
          schema: commercialSchema,
          experimental_telemetry: { isEnabled: true },
          prompt: `You are a Sales Manager. Extract ONLY: Stakeholders (Buyer vs Champion), Partner ecosystem (Cloud/SI), and Timelines (Compelling Events). Ignore technical logs.

**A. STAKEHOLDERS (The "Political Map")**
- Ignore MongoDB attendees (we want to know about the customer's internal politics, not our own team).
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
${sanitizedContext}`
        }),

        // Agent 3: Deal Strategist
        generateObject({
          model: googleAI('gemini-2.5-pro'),
          schema: strategySchema,
          experimental_telemetry: { isEnabled: true },
          prompt: `You are a Deal Strategist. Determine the Sales Motion (Migrate/Replace/Launch/Select) based on strict definitions. Map pain points to Value Drivers (Compete, Save, Risk, Velocity).

CRITICAL GROUNDING RULE: The '3 Whys' and 'Value Drivers' must represent the CUSTOMER'S actual internal motivations, NOT the MongoDB Rep's sales pitch.
- If the Rep says, 'MongoDB will save you money,' but the Customer never validates it, DO NOT list 'Save Money'. Mark it as MISSING.
- Only extract Challenges, Objectives, and Compelling Events that the CUSTOMER explicitly stated or firmly agreed to.

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

**D. THE 3 WHYS (Strict Qualification)**
1. **Why Anything?** (Pain & Objective): Look for 'Bleeding Neck' issues. Why can't they stay on the current system?
   - *If found:* Extract specific pains (e.g., 'Crashes every Friday') and objectives (e.g., 'Scale to 1M users').
   - *If partial:* You see a pain but no clear objective, or vice versa. Mark status as PARTIAL and note what's missing.
   - *Did customer admitted this is a pain they need to solve?* If they said "We can live with this" or "This is just a nice-to-have", mark as MISSING and note what's missing.
   - *If missing:* Mark status as MISSING and note what's missing.
2. **Why MongoDB?** (Differentiation): Why us? Why not Postgres or DynamoDB or any other database?
   - *If found:* Map features to pains (e.g., 'Relational Migrator reduces risk') and note differentiators.
   - *If partial:* You see a reason why they want to change but no clear link to MongoDB's strengths. Mark status as PARTIAL and note what's missing.
   - *Did customer admitted MongoDB is the best solution?* If they said "We are also considering Postgres/DynamoDB/DocumentDB or any other database", mark as PARTIAL and note what's missing. If they said "We don't see a difference between MongoDB and competitors", mark as MISSING and note what's missing.
   - *If missing:* Mark status as MISSING and note what's missing.
3. **Why Now?** (Urgency): Is there a Compelling Event?
   - *If found:* Extract the Date and the Event (e.g., 'Audit on Nov 1st'). 'Q4' is not specific enough.
   - *If partial:* You see a date but no compelling event, or an event but no date. Mark status as PARTIAL and note what's missing.
   - *Did customer admit there is a real urgency?* If they said "We have a long runway" or "This is not urgent", mark as MISSING and note what's missing and note what's missing.
   - *If missing:* Mark status as MISSING. Note what's needed.

**E. GAP ANALYSIS (The Coach)**
Based *strictly* on what is MISSING in the 3 Whys above, generate 3-5 Discovery Questions for the Sales Rep.
- **Bad Question:** 'Why do you want to move now?'
- **Good Question:** 'You mentioned the Oracle license expires in Q4—what is the specific date, and what is the financial penalty if we miss that window?'
- **Good Question:** 'You mentioned latency is an issue—how is that specifically impacting your mobile users' cart abandonment rate?'

**F. NEXT STEPS**
Based on the deal stage, timeline, and gaps identified, provide 3-7 concrete, actionable next steps for the sales team:
- **Technical Actions:** PoC requirements, architecture review sessions, migration planning workshops
- **Commercial Actions:** Executive briefings, pricing discussions, contract negotiations
- **Enablement:** Documentation needed, training sessions, customer success planning
- **Qualification:** Information gathering tasks based on gaps in the 3 Whys
- **Timeline:** Associate each action with a suggested timeframe (e.g., 'Week 1', 'Before PoC', 'Q1 2026')
- **Owner:** Suggest who should drive each action (Sales Rep, SE, Account Executive, Partner)
- **Priority:** Mark each action as High, Medium, or Low priority based on urgency and impact

TRANSCRIPT:
${sanitizedContext}`
        }),

      ]);

      // Merge into DCS object and return with usage
      const dcsData: DCSData = {
        workloadId,
        workloadName: opp.workloadName,
        technical: technicalResult.object,
        commercial: commercialResult.object,
        strategy: strategyResult.object
      };

      console.log(`✓ Completed: ${opp.workloadName}`);

      return {
        dcsData,
        usage: {
          inputTokens: (slicerResult.usage?.inputTokens || 0) + 
                      (technicalResult.usage?.inputTokens || 0) + 
                      (commercialResult.usage?.inputTokens || 0) + 
                      (strategyResult.usage?.inputTokens || 0),
          outputTokens: (slicerResult.usage?.outputTokens || 0) + 
                       (technicalResult.usage?.outputTokens || 0) + 
                       (commercialResult.usage?.outputTokens || 0) + 
                       (strategyResult.usage?.outputTokens || 0),
          totalTokens: (slicerResult.usage?.totalTokens || 0) + 
                      (technicalResult.usage?.totalTokens || 0) + 
                      (commercialResult.usage?.totalTokens || 0) + 
                      (strategyResult.usage?.totalTokens || 0)
        }
      };
    });

    // Wait for all workloads to complete
    const workloadResults = await Promise.all(workloadPromises);

    // Accumulate all usage and extract DCS data
    const dcsArray: DCSData[] = [];
    for (const result of workloadResults) {
      dcsArray.push(result.dcsData);
      totalInputTokens += result.usage.inputTokens;
      totalOutputTokens += result.usage.outputTokens;
      totalTokens += result.usage.totalTokens;
    }

    // -------------------------------------------------
    // PASS 3: MongoDB Team Contribution (runs ONCE for the full transcript, shared across all workloads)
    // -------------------------------------------------
    console.log('\n=== PASS 3: MongoDB Contribution Analyst (once for full transcript) ===');
    const mongodbContributionResult = await generateObject({
      model: googleAI('gemini-2.5-pro'),
      schema: mongodbContributionSchema,
      experimental_telemetry: { isEnabled: true },
      prompt: `You are a Conversation Analyst. Summarize what the MongoDB team (Sales Rep, Solutions Architect, AE, CSM) contributed across the ENTIRE conversation.

CRITICAL RULES:
- ONLY extract dialogue and contributions FROM MongoDB employees. DO NOT include customer statements.
- MongoDB employees can be identified by: "we at MongoDB", "our Atlas product", "I work for MongoDB", or being labeled as "MongoDB Rep/SA/AE/CSM"
- Do NOT attribute contributions to specific individuals — treat the MongoDB team as a collective unit
- If names are not mentioned, use roles (e.g. "MongoDB SA", "MongoDB Sales Rep")

A. MONGODB TEAM MEMBERS
- List who attended from MongoDB (names + roles if mentioned in the transcript)

B. TECHNICAL CONTRIBUTIONS (as a team — no individual attribution)
- What technical solutions/features did the MongoDB team suggest?
- What architectural recommendations were made?
- What demos, POCs, or technical next steps were proposed?
- For EACH contribution, note if the customer validated/confirmed it or not

C. SALES MESSAGING (as a team — no individual attribution)
- What value propositions were presented?
- What competitive positioning was used?
- What pricing/commercial points were raised?
- For EACH message, note if the customer validated/confirmed it or not

D. QUESTIONS ASKED BY MONGODB TEAM (as a team — no individual attribution)
- What discovery questions did the MongoDB team ask collectively?
- Note the customer's response for each
- Rate effectiveness: did each question uncover useful information?

E. UNVALIDATED SUGGESTIONS
- List features/solutions suggested by the MongoDB team that the customer did NOT confirm or validate
- Include what follow-up is needed to validate each

F. OVERALL EFFECTIVENESS
- Was the conversation Customer-Centric, Balanced, or MongoDB-Centric?
- Did the MongoDB team successfully uncover key customer pain points?
- Provide a 2-3 sentence assessment of discovery quality
- List specific areas for improvement

FULL TRANSCRIPT:
${combinedText}`
    });

    totalInputTokens += mongodbContributionResult.usage?.inputTokens || 0;
    totalOutputTokens += mongodbContributionResult.usage?.outputTokens || 0;
    totalTokens += mongodbContributionResult.usage?.totalTokens || 0;

    // Attach the same mongodbContribution to every workload
    for (const dcsData of dcsArray) {
      dcsData.mongodbContribution = mongodbContributionResult.object;
    }

    console.log(`\n=== Generation Complete: ${dcsArray.length} workloads ===`);
    console.log('Total token usage:', { totalInputTokens, totalOutputTokens, totalTokens });

    const estimatedCost = totalTokens > 0 ? (totalTokens / 1000) * 0.001 : 0;

    // Update account with array of DCS data (OVERWRITE existing data)
    await Account.findByIdAndUpdate(accountId, {
      dcsData: dcsArray,
      status: 'COMPLETED',
      progressStep: '',
      progressDetails: {},
      usage: {
        promptTokens: totalInputTokens,
        completionTokens: totalOutputTokens,
        totalTokens: totalTokens,
        estimatedCost: estimatedCost
      }
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

    return {
      _id: account._id.toString(),
      name: account.name,
      userEmail: account.userEmail,
      sharedWith: account.sharedWith || [],
      isOwner,
      status: account.status,
      progressStep: account.progressStep || '',
      progressDetails: account.progressDetails ? JSON.parse(JSON.stringify(account.progressDetails)) : {},
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
