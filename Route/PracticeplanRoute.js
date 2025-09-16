import express from "express";
import { checkAnswerById, createMissedQuestions, createPraticePlan, createRandomQuestions, getPracticePlanQuestions, getQuestionBySectionAndIndex, getRandomQuestion } from "../Controller/PracticeplanController.js";



const router = express.Router();

router.post('/CreatePraticePlan', createPraticePlan)
router.post('/CheckAnswer/:id', checkAnswerById)
router.get('/GetPracticePlanQuestions/:planId', getPracticePlanQuestions)
router.get('/GetQuestion/:planId/:section/:questionIndex', getQuestionBySectionAndIndex)
router.post('/CreateRandomQuestions', createRandomQuestions)
router.post('/GetRandomQuestions', getRandomQuestion)
router.post('/CreateMissedQuestions', createMissedQuestions)

export default router;