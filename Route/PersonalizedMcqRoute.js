import express from "express";
import {
  generatePersonalizedMcq,
  getPersonalizedSession,
  getAvailableTopics,
  getAvailablePreviousYears
} from "../Controller/PersonalizedMcqController.js";

const router = express.Router();

// Generate personalized MCQ questions
router.post("/generate", generatePersonalizedMcq);

// Get personalized session details
router.get("/session/:sessionId", getPersonalizedSession);

// Get available topics for a subject
router.post("/topics", getAvailableTopics);

// Get available previous years for a subject
router.get("/previous-years", getAvailablePreviousYears);


export default router;

