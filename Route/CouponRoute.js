import express from "express";
import { applyCoupon, createCoupon } from "../Controller/CouponController.js";


const router = express.Router();

router.post("/CreateCoupon", createCoupon)
router.post("/ApplyCoupon", applyCoupon)

export default router;