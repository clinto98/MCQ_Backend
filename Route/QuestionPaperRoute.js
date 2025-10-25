import express from "express";
import { addPreviousQuestionPaper, receiveQuestionPapers } from "../Controller/QuestionPaperController.js";
import { generatePreviousYearSession, getPreviousYearSession, checkPreviousYearAnswer, GetAllUnits } from "../Controller/PreviousyearQuestionController.js";


const router = express.Router();

router.post('/UploadQuestionPaper', addPreviousQuestionPaper)
router.post('/previous-year/generate', generatePreviousYearSession)
router.post('/previous-year/session', getPreviousYearSession)
router.post('/previous-year/check-answer/:questionId', checkPreviousYearAnswer)
router.post('/previous/units', GetAllUnits)
router.post('/Questionsreceive', receiveQuestionPapers)


export default router;