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

// 4. MongoDB Contribution Schema - Agent 4: The Contribution Analyst
export const mongodbContributionSchema = z.object({
  teamMembers: z.array(z.object({
    name: z.string().describe("Name of MongoDB team member if mentioned, otherwise use their role"),
    role: z.string().describe("Role e.g. Sales Rep, Solutions Architect, AE, CSM")
  })).describe("MongoDB team members who attended the call"),

  technicalContributions: z.array(z.object({
    contribution: z.string().describe("Technical suggestion or recommendation made by MongoDB SA"),
    contributor: z.string().describe("Which MongoDB team member made this contribution"),
    type: z.enum(['Architecture', 'Feature Suggestion', 'Demo', 'PoC', 'Migration', 'Other']),
    customerReaction: z.enum(['Validated', 'Not Validated', 'Rejected', 'Unknown']).describe("Did the customer confirm interest?")
  })).describe("Technical contributions from MongoDB SA/SE"),

  salesMessaging: z.array(z.object({
    message: z.string().describe("Value proposition or sales point raised"),
    contributor: z.string().describe("Which MongoDB team member said this"),
    type: z.enum(['Value Proposition', 'Competitive Positioning', 'Pricing', 'Reference', 'Other']),
    customerReaction: z.enum(['Validated', 'Not Validated', 'Rejected', 'Unknown'])
  })).describe("Sales messaging used by MongoDB team"),

  questionsAsked: z.array(z.object({
    question: z.string().describe("Exact or close paraphrase of the discovery question as it appears in the transcript"),
    askedBy: z.string().describe("EXACT name of the MongoDB team member whose speaker label appears on this line in the transcript. Do NOT infer — read the label directly before the question."),
    askedByRole: z.string().describe("Role of that person e.g. Solutions Architect, Sales Rep, AE"),
    effectiveness: z.enum(['Effective', 'Partially Effective', 'Ineffective']).describe("Did it uncover useful customer information?"),
    customerResponse: z.string().describe("Brief summary of how customer responded")
  })).describe("Discovery questions asked by MongoDB team — each question attributed to the speaker whose label appears on THAT line, not inferred from overall participation"),

  unvalidatedSuggestions: z.array(z.object({
    suggestion: z.string().describe("Feature or solution suggested by MongoDB but NOT confirmed by customer"),
    suggestedBy: z.string().describe("Which MongoDB team member suggested this"),
    followUpNeeded: z.string().describe("What follow-up is needed to validate this suggestion")
  })).describe("MongoDB suggestions that customer did not validate or confirm"),

  overallEffectiveness: z.object({
    conversationStyle: z.enum(['Customer-Centric', 'Balanced', 'MongoDB-Centric']).describe("Was the conversation focused on customer needs or MongoDB pitching?"),
    keyPainPointsUncovered: z.boolean().describe("Did MongoDB team successfully uncover key pain points?"),
    summary: z.string().describe("2-3 sentence assessment of how well MongoDB team conducted discovery"),
    improvementAreas: z.array(z.string()).describe("Specific areas where MongoDB team could improve")
  })
});

// Combined DCS type
export type TechnicalData = z.infer<typeof technicalSchema>;
export type CommercialData = z.infer<typeof commercialSchema>;
export type StrategyData = z.infer<typeof strategySchema>;
export type RouterData = z.infer<typeof routerSchema>;
export type MongodbContributionData = z.infer<typeof mongodbContributionSchema>;

export interface DCSData {
  workloadId: string;
  workloadName: string;
  technical: TechnicalData;
  commercial: CommercialData;
  strategy: StrategyData;
  mongodbContribution?: MongodbContributionData;
}
