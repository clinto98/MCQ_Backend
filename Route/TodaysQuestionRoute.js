import express from "express"
import { checkTodaysAnswerById, createTodaysQuestions, getTodaysQuestions,getTodaysAnalysisReport } from "../Controller/TodaysQuestionController.js";




const router = express.Router();


router.post("/CreateTodaysQuestion", createTodaysQuestions)
router.post("/GetTodaysQuestion", getTodaysQuestions)
router.post("/CheckTodaysAnswer/:questionId", checkTodaysAnswerById)
router.get('/gettodaysquestionanalysis/:quizId',getTodaysAnalysisReport)



export default router;