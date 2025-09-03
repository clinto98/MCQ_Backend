import express from "express";
import {  checkAnswerById, createPraticePlan, getPracticePlanQuestions, getQuestionBySectionAndIndex, getRandomQuestion } from "../Controller/PracticeplanController.js";



const router = express.Router();

router.post('/CreatePraticePlan', createPraticePlan)
router.post('/CheckAnswer/:id', checkAnswerById)
router.get('/GetPracticePlanQuestions/:planId', getPracticePlanQuestions)
router.get('/GetQuestion/:planId/:section/:questionIndex', getQuestionBySectionAndIndex)
router.post('/GetRandomQuestions', getRandomQuestion)


export default router;