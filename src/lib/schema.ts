import { z } from 'zod';

export const dcsSchema = z.object({
  accountInfo: z.object({
    workloadName: z.string().describe("Name of the app/project/service discussed in the transcript"),
    salesMotion: z.string().describe("Description of the sales motion"),
    keyStakeholders: z.array(z.object({
      name: z.string(),
      role: z.string()
    })),
    partnersInvolved: z.array(z.string()).describe("e.g. AWS, Azure, Accenture")
  }),
  valueFramework: z.object({
    valueDrivers: z.array(z.string()),
    currentState: z.object({
      currentStateDescription: z.string(),
      negativeConsequences: z.array(z.string()).describe("Pain points in customer words")
    }),
    futureState: z.object({
      futureStateDescription: z.string(),
      positiveBusinessOutcomes: z.array(z.string())
    })
  }),
  logistics: z.object({
    timeline: z.object({
      goLiveDate: z.string().optional(),
      compellingEvent: z.string().describe("Event forcing the date (e.g. Diwali, Black Friday)")
    }),
    tigerSalesRoute: z.string().describe("Tiger sales route based on analysis (e.g. Tiger Fast, Tiger Classic, Tiger Sprint)"),
    requiredCapabilities: z.array(z.string()).describe("Shopping list of technical features needed"),
    successMetrics: z.array(z.string()).describe("How they measure success (e.g. latency < 10ms)")
  })
});

export type DCSData = z.infer<typeof dcsSchema>;