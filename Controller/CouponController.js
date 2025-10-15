import Coupon from "../Models/CouponModel.js";
import SubscriptionPlan from "../Models/SubscriptionPlanModel.js";

// ✅ Create new coupon (admin use)
export const createCoupon = async (req, res) => {
  try {
    const { code, discountType, discountValue, validUntil, maxUsageCount } = req.body;

    if (!code || !discountType || !discountValue || !validUntil) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const coupon = await Coupon.create({
      code: code.toUpperCase(),
      discountType,
      discountValue,
      validUntil,
      maxUsageCount,
    });

    res.status(201).json({ success: true, coupon });
  } catch (err) {
    console.error("Error creating coupon:", err);
    res.status(500).json({ success: false, message: "Error creating coupon" });
  }
};

// ✅ Apply coupon to a subscription plan (used before creating Razorpay order)
export const applyCoupon = async (req, res) => {
  try {
    const { code, planId } = req.body;

    if (!code || !planId) {
      return res.status(400).json({ message: "Coupon code and planId are required" });
    }

    const coupon = await Coupon.findOne({ code: code.toUpperCase(), active: true });
    if (!coupon) return res.status(404).json({ message: "Invalid or inactive coupon" });

    // Check date validity
    const now = new Date();
    if (now < coupon.validFrom || now > coupon.validUntil) {
      return res.status(400).json({ message: "Coupon has expired or is not yet valid" });
    }

    // Check usage limit
    if (coupon.usedCount >= coupon.maxUsageCount) {
      return res.status(400).json({ message: "Coupon usage limit reached" });
    }

    const plan = await SubscriptionPlan.findById(planId);
    if (!plan) return res.status(404).json({ message: "Invalid plan" });

    // 💰 Calculate discount
    let discountAmount = 0;
    if (coupon.discountType === "percentage") {
      discountAmount = (plan.amount * coupon.discountValue) / 100;
    } else {
      discountAmount = coupon.discountValue;
    }

    const finalAmount = Math.max(plan.amount - discountAmount, 0);

    res.status(200).json({
      success: true,
      message: "Coupon applied successfully",
      originalPrice: plan.amount,
      discountAmount,
      finalAmount,
      couponCode: coupon.code,
    });
  } catch (err) {
    console.error("Error applying coupon:", err);
    res.status(500).json({ success: false, message: "Error applying coupon" });
  }
};

// ✅ Mark coupon as used (after successful payment)
export const markCouponUsed = async (code) => {
  try {
    await Coupon.findOneAndUpdate(
      { code: code.toUpperCase() },
      { $inc: { usedCount: 1 } }
    );
  } catch (err) {
    console.error("Error updating coupon usage:", err);
  }
};
