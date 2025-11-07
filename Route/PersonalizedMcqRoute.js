import express from "express";
import {
  generatePersonalizedMcq,
  getPersonalizedSession,
  getAvailableTopics,
  getAvailablePreviousYears,
  checkPersonalizedAnswerById,
  getActivePersonalizedPlans,
  getPersonalizedAnalysisReport
} from "../Controller/PersonalizedMcqController.js";

const router = express.Router();


router.post("/generate", generatePersonalizedMcq);
router.post("/getallpersonlizedquestions", getPersonalizedSession);
router.post("/topics", getAvailableTopics);
router.get("/previous-years", getAvailablePreviousYears);
router.post("/checkanswerbyid/:questionId", checkPersonalizedAnswerById)
router.post('/personalizedactive', getActivePersonalizedPlans)
router.get('/getpersonaliseanalysis/:quizId',getPersonalizedAnalysisReport)

export default router;

