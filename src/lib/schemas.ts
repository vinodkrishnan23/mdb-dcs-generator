import { z } from 'zod';

// 0. Router Schema - The "Traffic Controller"
export const routerSchema = z.object({
  opportunities: z.array(z.object({
    workloadName: z.string().describe("Name of the app/project (e.g. 'Ticketing System', 'AI Chatbot')"),
    contextDescription: z.string().describe("A 1-sentence summary of what this specific workload does, used to filter context."),
    confidenceScore: z.number().describe("0-1 score: How much detail is actually present? Ignore if < 0.6")
  })).describe("List of distinct sales opportunities found in the transcript")
});

// 1. Technical Schema - Agent 1: The Technical Architect
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

// 2. Commercial Schema - Agent 2: The Commercial Manager
export const commercialSchema = z.object({
  accountInfo: z.object({
    accountName: z.string(),
    workloadName: z.string().describe("App/Project Name")
  }),
  stakeholders: z.array(z.object({
    name: z.string(),
    role: z.enum(['Economic Buyer', 'Technical Champion', 'User', 'Influencer', 'Unknown']),
    notes: z.string().describe("Psychographics/Political stance and sentiment analysis for non-MongoDB attendees (e.g., skeptical, enthusiastic, concerned, supportive)")
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
    })).optional().describe("All dates discussed in the call with their context and meaning")
  })
});

// 3. Strategy Schema - Agent 3: The Deal Strategist
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

// Combined DCS type
export type TechnicalData = z.infer<typeof technicalSchema>;
export type CommercialData = z.infer<typeof commercialSchema>;
export type StrategyData = z.infer<typeof strategySchema>;
export type RouterData = z.infer<typeof routerSchema>;

export interface DCSData {
  workloadId: string;
  workloadName: string;
  technical: TechnicalData;
  commercial: CommercialData;
  strategy: StrategyData;
}
