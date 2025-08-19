import mongoose from "mongoose";
import { Schema } from "mongoose";

const SubmissionSchema = new Schema({
     // Link to the specific form being submitted
    form: { type: Schema.Types.ObjectId, ref: 'Form', required: true },
     // The actual user-submitted data
    answers: { type: Schema.Types.Mixed, default: {} }, // { [fieldId]: value }
    // Optional metadata about the submission
    meta: {
      ip: String,
      userAgent: String,
    },
}, { timestamps: true });

export default mongoose.model('Submission', SubmissionSchema);
