import mongoose from "mongoose";

const courseSchema = new mongoose.Schema(
    {
        title: { type: String, required: true, trim: true },

        description: { type: String, trim: true },
        standerd: { type: String, trim: true },
        category: { type: String, trim: true },
        syllabus: { type: String, enum: ["CBSE", "ICSE", "State Board", "SAT", "Other"], required: true },
        // createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "Admin", required: true },
        startDate: Date,
        endDate: Date,
        subcribedStudents: { type: Number, default: 0 },
        totalQuestions: { type: Number, default: 0 },
        courseImage: {
            type: String,
            trim: true,
            default: "", // optional default value
        },
    },

    { timestamps: true }
);

export default mongoose.model("Course", courseSchema);
