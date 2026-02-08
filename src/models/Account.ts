import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IAccount extends Document {
  name: string;
  userEmail: string;
  industryContext?: string;
  transcriptIds: mongoose.Types.ObjectId[];
  dcsData: any[]; // Array of DCS objects
  status: 'IDLE' | 'PROCESSING' | 'COMPLETED';
  progressStep?: string;
  progressDetails?: {
    currentWorkload?: string;
    totalWorkloads?: number;
    completedWorkloads?: number;
  };
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    estimatedCost: number;
  };
  createdAt: Date;
}

const AccountSchema: Schema = new Schema({
  name: {
    type: String,
    required: true,
  },
  userEmail: {
    type: String,
    required: true,
  },
  industryContext: {
    type: String,
    default: '',
  },
  transcriptIds: [{
    type: Schema.Types.ObjectId,
    ref: 'Transcript',
  }],
  dcsData: {
    type: [Schema.Types.Mixed],
    default: [],
  },
  status: {
    type: String,
    enum: ['IDLE', 'PROCESSING', 'COMPLETED'],
    default: 'IDLE',
  },
  progressStep: {
    type: String,
    default: '',
  },
  progressDetails: {
    currentWorkload: { type: String },
    totalWorkloads: { type: Number },
    completedWorkloads: { type: Number },
  },
  usage: {
    promptTokens: { type: Number },
    completionTokens: { type: Number },
    totalTokens: { type: Number },
    estimatedCost: { type: Number },
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const Account: Model<IAccount> = mongoose.models.Account || mongoose.model<IAccount>('Account', AccountSchema);

export default Account;