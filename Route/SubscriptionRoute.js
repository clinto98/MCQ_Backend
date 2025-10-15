import express from "express";
import { createSubscriptionOrder, createSubscriptionPlan, getSubscriptionPlans, verifySubscriptionPayment } from "../Controller/SubscriptionController.js";

const router = express.Router();

router.post("/create-order", createSubscriptionOrder);
router.post("/verify-payment", verifySubscriptionPayment);
router.post("/createsubscriptionplan", createSubscriptionPlan)
router.get("/getallplans", getSubscriptionPlans);

export default router;
