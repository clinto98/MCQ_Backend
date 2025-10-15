import mongoose from "mongoose";

const subscriptionSchema = new mongoose.Schema(
    {
        studentId: { type: mongoose.Schema.Types.ObjectId, ref: "Student", required: true },
        planId: { type: mongoose.Schema.Types.ObjectId, ref: "SubscriptionPlan", required: true },
        startDate: { type: Date, default: Date.now },
        endDate: { type: Date, required: true },
        isActive: { type: Boolean, default: true },
        paymentId: { type: String },
        orderId: { type: String },
        status: { type: String, enum: ["active", "expired", "failed"], default: "active" },
    },
    { timestamps: true }
);

export default mongoose.model("Subscription", subscriptionSchema);
