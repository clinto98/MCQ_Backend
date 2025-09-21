import express from "express";
import { createOrder, verifyPayment, getPaymentStatus } from "../Controller/PaymentController.js";

const router = express.Router();

// POST /api/payment/order → Create Razorpay order
router.post("/orderPayment", createOrder);

// POST /api/payment/verify → Verify payment signature
router.post("/verifyPayment", verifyPayment);

// GET /api/payment/status/:orderId → Get payment status
router.get("/statusPayment/:orderId", getPaymentStatus);

export default router;
