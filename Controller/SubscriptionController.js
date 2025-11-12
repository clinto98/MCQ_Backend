import Razorpay from "razorpay";
import crypto from "crypto";
import Subscription from "../Models/SubscriptionModel.js";
import SubscriptionPlan from "../Models/SubscriptionPlanModel.js";
import Student from "../Models/StudentModel.js";
import Payment from "../Models/PaymentModel.js";
import Enrollment from "../Models/EnrollmentModel.js";
import Course from "../Models/CourseModel.js";
import Coupon from "../Models/CouponModel.js"

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});


// 1️⃣ Create Razorpay Order for Subscription
export const createSubscriptionOrder = async (req, res) => {
  try {
    const { studentId, planId, couponCode } = req.body;

    // 1️⃣ Fetch plan and student
    const plan = await SubscriptionPlan.findById(planId);
    if (!plan) return res.status(404).json({ message: "Invalid plan" });

    const student = await Student.findById(studentId);
    if (!student) return res.status(404).json({ message: "Invalid student" });

    // 2️⃣ Check if student already has an active plan
    if (
      student.currentPlan === plan.name &&
      student.planExpiryDate &&
      new Date(student.planExpiryDate) > new Date()
    ) {
      return res.status(400).json({
        success: false,
        message: `You already have an active ${plan.name} plan.`,
      });
    }

    // 3️⃣ Initialize amount and coupon variables
    let finalAmount = plan.amount;
    let coupon = null;

    // 4️⃣ Apply coupon only if provided
    if (couponCode && couponCode.trim() !== "") {
      coupon = await Coupon.findOne({ code: couponCode });

      if (!coupon) {
        return res.status(400).json({ success: false, message: "Invalid coupon code" });
      }

      // Validate coupon
      const now = new Date();
      if (!coupon.active) {
        return res.status(400).json({ success: false, message: "Coupon is not active" });
      }
      if (coupon.validFrom && now < new Date(coupon.validFrom)) {
        return res.status(400).json({ success: false, message: "Coupon not yet valid" });
      }
      if (coupon.validUntil && now > new Date(coupon.validUntil)) {
        return res.status(400).json({ success: false, message: "Coupon expired" });
      }
      if (coupon.maxUsageCount && coupon.usedCount >= coupon.maxUsageCount) {
        return res.status(400).json({ success: false, message: "Coupon usage limit reached" });
      }

      // Apply discount
      if (coupon.discountType === "percentage") {
        finalAmount = plan.amount - (plan.amount * coupon.discountValue) / 100;
      } else if (coupon.discountType === "flat") {
        finalAmount = plan.amount - coupon.discountValue;
      }

      // Ensure not below zero
      if (finalAmount < 0) finalAmount = 0;

    }

    // 5️⃣ Create Razorpay order only if finalAmount > 0
    let order = null;
    if (finalAmount > 0) {
      order = await razorpay.orders.create({
        amount: Math.round(finalAmount * 100),
        currency: "INR",
        receipt: `sub_${Date.now()}`,
      });
    }else{
      finalAmount = 1;
      order = await razorpay.orders.create({
        amount: 100,
        currency: "INR",
        receipt: `sub_${Date.now()}`,
      });
    }

    console.log(order)

    // 6️⃣ Create payment record
    await Payment.create({
      orderId: order ? order.id : null,
      amount: finalAmount,
      currency: "INR",
      userId: studentId,
      status: finalAmount === 0 ? "paid" : "created", // auto mark free plan as paid
      couponCode: coupon ? coupon.code : null,
    });

    // 7️⃣ Respond with order info
    res.status(201).json({
      success: true,
      orderId: order ? order.id : null,
      plan,
      finalAmount:  finalAmount,
      couponApplied: coupon ? coupon.code : null,
      message: coupon
        ? `Coupon ${coupon.code} applied successfully`
        : "No coupon applied",
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Order creation failed" });
  }
};



// 2️⃣ Verify Payment + Activate Subscription
export const verifySubscriptionPayment = async (req, res) => {
  try {
    const { orderId, paymentId, signature, planId, studentId, courseId, preferredSubjects } = req.body;

    // ✅ Validate input
    if (!orderId || !paymentId || !signature || !planId || !studentId || !courseId) {
      return res.status(400).json({ success: false, message: "Missing required fields" });
    }

    // 🔒 Verify Razorpay signature
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(orderId + "|" + paymentId)
      .digest("hex");

    if (expectedSignature !== signature) {
      await Payment.findOneAndUpdate({ orderId }, { status: "failed" });
      return res.status(400).json({ success: false, message: "Payment verification failed" });
    }

    // 🧾 Fetch plan details
    const plan = await SubscriptionPlan.findById(planId);
    if (!plan) return res.status(404).json({ message: "Invalid plan" });

    // 🧠 Fetch student details
    const student = await Student.findById(studentId);
    if (!student) return res.status(404).json({ message: "Invalid student" });

    // 🏫 Fetch course details
    const course = await Course.findById(courseId);
    if (!course) return res.status(404).json({ message: "Invalid course" });

    // 📅 Compute subscription end date
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + plan.durationInDays);

    // 💳 Update payment record
    await Payment.findOneAndUpdate(
      { orderId },
      { paymentId, signature, status: "paid" }
    );

    // 🧾 Create or update subscription
    await Subscription.create({
      studentId,
      planId,
      startDate: new Date(),
      endDate,
      paymentId,
      orderId,
      status: "active",
    });

    // 👤 Update student's active plan
    await Student.findByIdAndUpdate(studentId, {
      currentPlan: plan.name,
      planExpiryDate: endDate,
    });

    // 📚 Auto-enroll the student into the course
    let enrolledSubjects = [];
    if (preferredSubjects && Array.isArray(preferredSubjects) && preferredSubjects.length > 0) {
      let enrollment = await Enrollment.findOne({ studentId });

      if (!enrollment) {
        enrollment = new Enrollment({
          studentId,
          enrolledCourses: [],
        });
      }

      // Check if already enrolled in this course
      const existingCourseIndex = enrollment.enrolledCourses.findIndex(
        (c) => c.courseId.toString() === courseId
      );

      if (existingCourseIndex !== -1) {
        // Merge subjects if course already exists
        const existingSubjects = enrollment.enrolledCourses[existingCourseIndex].selectedSubjects;
        const mergedSubjects = Array.from(new Set([...existingSubjects, ...preferredSubjects]));
        enrollment.enrolledCourses[existingCourseIndex].selectedSubjects = mergedSubjects;
        enrolledSubjects = mergedSubjects;
      } else {
        // Add new course enrollment
        enrollment.enrolledCourses.push({
          courseId,
          selectedSubjects: [...new Set(preferredSubjects)],
        });
        enrolledSubjects = [...new Set(preferredSubjects)];
      }

      await enrollment.save();
    }

    // ✅ Success response with complete details
    return res.status(200).json({
      success: true,
      message: "Subscription verified and course enrollment successful",

      userId: student._id,
      userName: student.FullName,
      userEmail: student.email,
      userStandard: student.classStandard || "N/A",
      userSelectedCourseId: course._id,
      userSelectedCourse: course.title,
      userSelectedSubjects: enrolledSubjects,
      plan: plan.name,
      planamount: plan.amount,
      durationInDays: plan.durationInDays,
      startDate: new Date(),
      expiryDate: endDate,
      status: "active",
      payment: {
        orderId,
        paymentId,
        status: "paid",
      },
    });
  } catch (err) {
    console.error("❌ Error verifying subscription:", err);
    res.status(500).json({ message: "Subscription verification error", error: err.message });
  }
};


export const createSubscriptionPlan = async (req, res) => {
  try {
    const { name, amount, durationInDays, description, features } = req.body;

    // Validate required fields
    if (!name || !amount || !durationInDays) {
      return res.status(400).json({
        success: false,
        message: "Name, amount, and durationInDays are required.",
      });
    }

    // Check if a plan with the same name already exists
    const existingPlan = await SubscriptionPlan.findOne({ name });
    if (existingPlan) {
      return res.status(400).json({
        success: false,
        message: `A plan named '${name}' already exists.`,
      });
    }

    // Create the plan
    const newPlan = new SubscriptionPlan({
      name,
      amount,
      durationInDays,
      description,
      features,
    });

    await newPlan.save();

    return res.status(201).json({
      success: true,
      message: "Subscription plan created successfully.",
      data: newPlan,
    });
  } catch (error) {
    console.error("Error creating subscription plan:", error);
    res.status(500).json({
      success: false,
      message: "Server error while creating plan.",
    });
  }
};


export const getSubscriptionPlans = async (req, res) => {
  try {
    const plans = await SubscriptionPlan.find().sort({ amount: 1 }); // sorted by amount (optional)

    if (!plans || plans.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No subscription plans found.",
      });
    }

    res.status(200).json({
      success: true,
      message: "Subscription plans retrieved successfully.",
      data: plans,
    });
  } catch (error) {
    console.error("Error fetching subscription plans:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching subscription plans.",
    });
  }
};
