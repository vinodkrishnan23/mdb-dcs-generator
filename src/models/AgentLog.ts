import mongoose, { Schema, Model } from 'mongoose';

export interface IAgentLog {
  accountId: string;
  transcriptId: string;
  transcriptName: string;
  workloadName?: string;
  agentType: string; // 'router' | 'slicer' | 'technical' | 'commercial' | 'strategy' | 'contribution' | 'matcher' | 'merger'
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  estimatedCost: number;
  durationMs: number;
  createdAt: Date;
}

const AgentLogSchema: Schema = new Schema({
  accountId:        { type: String, required: true },
  transcriptId:     { type: String, required: true },
  transcriptName:   { type: String, required: true },
  workloadName:     { type: String },
  agentType:        { type: String, required: true },
  promptTokens:     { type: Number, default: 0 },
  completionTokens: { type: Number, default: 0 },
  totalTokens:      { type: Number, default: 0 },
  estimatedCost:    { type: Number, default: 0 },
  durationMs:       { type: Number, default: 0 },
  createdAt:        { type: Date, default: Date.now },
});

AgentLogSchema.index({ accountId: 1, createdAt: -1 });

const AgentLog: Model<any> =
  mongoose.models.AgentLog || mongoose.model('AgentLog', AgentLogSchema);

export default AgentLog;
