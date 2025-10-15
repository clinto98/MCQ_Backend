import mongoose from "mongoose";

const subscriptionPlanSchema = new mongoose.Schema(
    {
        name: { type: String, enum: ["Basic", "1 Month", "3 Months", "1 Year"], required: true },
        amount: { type: Number, required: true },
        durationInDays: { type: Number, required: true }, // e.g. 30, 90, 365
        description: { type: String },
        features: [String],
    },
    { timestamps: true }
);

export default mongoose.model("SubscriptionPlan", subscriptionPlanSchema);
