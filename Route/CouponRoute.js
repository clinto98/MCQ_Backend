import express from "express";
import { applyCoupon, createCoupon,markCouponUsed } from "../Controller/CouponController.js";


const router = express.Router();

router.post("/CreateCoupon", createCoupon)
router.post("/ApplyCoupon", applyCoupon)
router.post("/markcoupon",markCouponUsed)

export default router;