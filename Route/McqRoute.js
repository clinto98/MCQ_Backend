import express from "express";
import { createBulkTwelfthQuestions, createTwelfthQuestion } from "../Controller/Mcqcontroller.js";



const router = express.Router();

router.post('/CreateMcq', createTwelfthQuestion)
router.post('/CreateBlukMcq',createBulkTwelfthQuestions)


export default router;