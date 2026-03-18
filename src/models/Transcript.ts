import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ITranscript extends Document {
  accountId: mongoose.Types.ObjectId;
  filename: string;
  fullText: string;
  userEmail: string;
  processedForDcs: boolean;
  processedAt?: Date;
  createdAt: Date;
}

const TranscriptSchema: Schema = new Schema({
  accountId: {
    type: Schema.Types.ObjectId,
    ref: 'Account',
    required: true,
  },
  filename: {
    type: String,
    required: true,
  },
  fullText: {
    type: String,
    required: true,
  },
  userEmail: {
    type: String,
    required: true,
  },
  processedForDcs: {
    type: Boolean,
    default: false,
    index: true,
  },
  processedAt: {
    type: Date,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const Transcript: Model<ITranscript> = mongoose.models.Transcript || mongoose.model<ITranscript>('Transcript', TranscriptSchema);

export default Transcript;