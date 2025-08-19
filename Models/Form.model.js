import mongoose from "mongoose";
import { Schema } from "mongoose";

// Sub-document schema for a single form field
const FieldSchema = new Schema({
    id: { type: String, required: true },  // uid() from client
    type: { type: String, required: true },  // text, email, select, etc.
    config: { type: Schema.Types.Mixed, default: {} },

}, { _id: false });  // Prevents Mongoose from adding its own _id to each field


// Main schema for the entire form

const FormSchema = new Schema({
    title: { type: String, default: 'Untitled Form' },
    description: { type: String, default: '' },
    createdBy: { type: String, default: 'Anonymous' },
    ownerId: { type: String, required: true, index: true }, // Make it required and indexed for faster lookups
    views: { type: Number, default: 0 },
    submissions: { type: Number, default: 0 },

    // DRAFT the builder edits live
    fields: { type: [FieldSchema], default: [] },

    // PUBLISHED read-only snapshot for public routes
     published: {
      isPublished: { type: Boolean, default: false },
      slug: { type: String, index: true, sparse: true },  // For clean public URLs
      fields: { type: [FieldSchema], default: [] },
      publishedAt: { type: Date },
    },
  }, { timestamps: true });

export default mongoose.model('Form', FormSchema);
