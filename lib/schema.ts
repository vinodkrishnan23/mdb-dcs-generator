import { z } from 'zod';

export const dcsSchema = z.object({
  accountInfo: z.object({
    workloadName: z.string().describe("Name of the app/project/service discussed in the transcript"),
    salesMotion: z.enum(['Migrate from mongodb community to mongodb atlas/mongodb enterprise', 'Launch - launching new app and are evaluating multiple databases including mongodb atlas/mongodb enterprise', 'Select - launcing new app and have selected mongodb atlas/mongodb enterprise', 'Replace - replacing any other database apart from mongodb']),
    keyStakeholders: z.array(z.object({
      name: z.string(),
      role: z.string()
    })),
    partnersInvolved: z.array(z.string()).describe("e.g. AWS, Azure, Accenture")
  }),
  valueFramework: z.object({
    valueDrivers: z.array(z.string()),
    currentState: z.object({
      technology: z.string(),
      negativeConsequences: z.array(z.string()).describe("Pain points in customer words")
    }),
    futureState: z.object({
      technology: z.string().default("MongoDB Atlas"),
      positiveBusinessOutcomes: z.array(z.string())
    })
  }),
  logistics: z.object({
    timeline: z.object({
      goLiveDate: z.string().optional(),
      compellingEvent: z.string().describe("Event forcing the date (e.g. Diwali, Black Friday)")
    }),
    requiredCapabilities: z.array(z.string()).describe("Shopping list of technical features needed"),
    successMetrics: z.array(z.string()).describe("How they measure success (e.g. latency < 10ms)")
  })
});

export type DCSData = z.infer<typeof dcsSchema>;