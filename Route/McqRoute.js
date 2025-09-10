import express from "express";
import { createBulkTwelfthQuestions, createTimeQuiz, createTwelfthQuestion, MockBattle, submitTimeAnswer } from "../Controller/Mcqcontroller.js";



const router = express.Router();

router.post('/CreateMcq', createTwelfthQuestion)
router.post('/CreateBlukMcq', createBulkTwelfthQuestions)
router.post('/CreateMockQuestions', MockBattle)
router.post('/CreateTimedMockQuestions', createTimeQuiz)
router.post('/CheckTimeQuiz', submitTimeAnswer)


export default router;