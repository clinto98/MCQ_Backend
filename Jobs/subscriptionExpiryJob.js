// jobs/subscriptionExpiryJob.js
import cron from "node-cron";
import Student from "../Models/StudentModel.js";
import Subscription from "../Models/SubscriptionModel.js";

export const startSubscriptionExpiryJob = () => {
  cron.schedule("0 0 * * *", async () => {
    console.log("Checking for expired subscriptions...");
    const now = new Date();

    try {
      const expiredSubs = await Subscription.find({
        endDate: { $lt: now },
        status: "active",
      });

      for (const sub of expiredSubs) {
        await Subscription.findByIdAndUpdate(sub._id, {
          status: "expired",
          isActive: false,
        });

        await Student.findByIdAndUpdate(sub.studentId, {
          currentPlan: "Basic",
          planExpiryDate: null,
        });
      }

      console.log(`✅ Downgraded ${expiredSubs.length} expired subscriptions`);
    } catch (err) {
      console.error("❌ Error running subscription expiry job:", err.message);
    }
  });
};
