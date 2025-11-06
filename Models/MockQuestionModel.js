import mongoose from "mongoose";

const mockQuestionSchema = new mongoose.Schema({
    questionId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "twelve",
        required: true,
    },
    index: { type: Number, required: true },
    status: {
        type: String,
        enum: ["pending", "attempted", "correct", "incorrect"],
        default: "pending",
    },
    answeredAt: { type: Date, default: null },
    attempts: { type: Number, default: 0 },
});

const MockQuestionsSchema = new mongoose.Schema(
    {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
        subject: { type: String, required: true, trim: true },
        Standard: { type: String },
        syllabus: { type: String },

        FrequentlyAsked: { type: Boolean, default: false },
        ExamSimulation: { type: Boolean, default: false },
        timeLimit: { type: Number, default: 0 },

        questions: [mockQuestionSchema],

        currentQuestion: {
            index: { type: Number, default: 0 },
            questionId: { type: mongoose.Schema.Types.ObjectId, ref: "twelve", default: null },
        },

        progress: {
            completedQuestions: { type: Number, default: 0 },
            correctAnswers: { type: Number, default: 0 },
            wrongAnswers: { type: Number, default: 0 },

            correctAnswerList: [
                { type: mongoose.Schema.Types.ObjectId, ref: "twelve" }
            ],

            wrongAnswerList: [
                {
                    questionId: { type: mongoose.Schema.Types.ObjectId, ref: "twelve" },
                    selectedOption: { type: String },
                    answeredAt: { type: Date, default: Date.now }
                }
            ],

            status: {
                type: String,
                enum: ["not_started", "in_progress", "completed"],
                default: "not_started",
            },
        },

        isActive: { type: Boolean, default: true },
    },
    { timestamps: true }
);

export default mongoose.model("MockQuestions", MockQuestionsSchema);
