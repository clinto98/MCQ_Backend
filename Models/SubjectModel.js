import mongoose from "mongoose";

const subjectSchema = new mongoose.Schema({
      courseId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Course",
        required: true,
      },
      Subjects: [
        {
          type: String,
          trim: true,
        },
      ],
}, { timestamps: true });

export default mongoose.model("Subject", subjectSchema);
