import Razorpay from "razorpay";
import crypto from "crypto";
import Subscription from "../Models/SubscriptionModel.js";
import SubscriptionPlan from "../Models/SubscriptionPlanModel.js";
import Student from "../Models/StudentModel.js";
import Payment from "../Models/PaymentModel.js";
import Enrollment from "../Models/EnrollmentModel.js";

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});


// 1️⃣ Create Razorpay Order for Subscription
export const createSubscriptionOrder = async (req, res) => {
  try {
    const { studentId, planId } = req.body;

    const plan = await SubscriptionPlan.findById(planId);
    if (!plan) return res.status(404).json({ message: "Invalid plan" });

    const student = await Student.findById(studentId);
    if (!student) return res.status(404).json({ message: "Invalid student" });

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

    const options = {
      amount: plan.amount * 100,
      currency: "INR",
      receipt: `sub_${Date.now()}`,
    };

    const order = await razorpay.orders.create(options);
    const payment = await Payment.create({
      orderId: order.id,
      amount: plan.amount,
      currency: "INR",
      userId: studentId,
      status: "created",
    });

    res.status(201).json({
      success: true,
      orderId: order.id,
      plan,
      key: process.env.RAZORPAY_KEY_ID,
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
    // 🧾 Fetch plan and compute subscription end date
    const plan = await SubscriptionPlan.findById(planId);
    if (!plan) return res.status(404).json({ message: "Invalid plan" });

    const endDate = new Date();
    endDate.setDate(endDate.getDate() + plan.durationInDays);

    // 💳 Update payment status
    await Payment.findOneAndUpdate(
      { orderId },
      { paymentId, signature, status: "paid" }
    );

    // 📘 Create subscription record
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
      } else {
        // New course enrollment
        enrollment.enrolledCourses.push({
          courseId,
          selectedSubjects: [...new Set(preferredSubjects)],
        });
      }
      await enrollment.save();
    }

    res.status(200).json({
      success: true,
      message: "Subscription activated and course enrolled successfully",
      plan: plan.name,
      planAmount: plan.amount,
      startDate: new Date(),
      expiryDate: endDate,
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
