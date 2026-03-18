import mongoose, { Schema, Document, Model } from 'mongoose';

/**
 * Workload — one document per distinct workload per account.
 *
 * Embeddings (text-embedding-004 vectors) are stored here so that incoming
 * workloads from new transcripts can be matched via cosine similarity before
 * deciding whether to merge into an existing workload or create a new one.
 */
export interface IWorkload extends Document {
  accountId: mongoose.Types.ObjectId;
  workloadId: string;
  workloadName: string;
  normalizedKey: string;
  transcriptIds: mongoose.Types.ObjectId[];
  seenCount: number;
  firstSeenTranscriptId: mongoose.Types.ObjectId;
  lastSeenTranscriptId: mongoose.Types.ObjectId;
  technical: any;
  commercial: any;
  strategy: any;
  mongodbContribution: any;
  flaggedByUsers: string[];  // emails of users who flagged this workload as a MongoDB employee example
  confirmedGenuineByUsers: string[];  // emails of users who confirmed this workload as a genuine customer workload
  createdAt: Date;
  updatedAt: Date;
}

const WorkloadSchema: Schema = new Schema(
  {
    accountId: {
      type: Schema.Types.ObjectId,
      ref: 'Account',
      required: true,
      index: true,
    },
    workloadId: { type: String, required: true },
    workloadName: { type: String, required: true },
    normalizedKey: { type: String, required: true },
    transcriptIds: [{ type: Schema.Types.ObjectId, ref: 'Transcript' }],
    seenCount: { type: Number, default: 1 },
    firstSeenTranscriptId: { type: Schema.Types.ObjectId, ref: 'Transcript' },
    lastSeenTranscriptId: { type: Schema.Types.ObjectId, ref: 'Transcript' },
    technical: { type: Schema.Types.Mixed },
    commercial: { type: Schema.Types.Mixed },
    strategy: { type: Schema.Types.Mixed },
    mongodbContribution: { type: Schema.Types.Mixed },
    flaggedByUsers: { type: [String], default: [] },
    confirmedGenuineByUsers: { type: [String], default: [] },
  },
  { timestamps: true }
);

// Fast lookup by account + unique workload
WorkloadSchema.index({ accountId: 1, workloadId: 1 }, { unique: true });

const Workload: Model<IWorkload> =
  mongoose.models.Workload ||
  mongoose.model<IWorkload>('Workload', WorkloadSchema);

export default Workload;
