import express from "express";
import { addPreviousQuestionPaper } from "../Controller/QuestionPaperController.js";
import { generatePreviousYearSession, getPreviousYearSession, checkPreviousYearAnswer, GetAllUnits } from "../Controller/PreviousyearQuestionController.js";


const router = express.Router();

router.post('/UploadQuestionPaper',addPreviousQuestionPaper)
router.post('/previous-year/generate', generatePreviousYearSession)
router.get('/previous-year/session/:userId', getPreviousYearSession)
router.post('/previous-year/check-answer', checkPreviousYearAnswer)
router.post('/previous/units',GetAllUnits)

export default router;