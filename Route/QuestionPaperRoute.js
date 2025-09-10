import express from "express";
import { addPreviousQuestionPaper } from "../Controller/QuestionPaperController.js";


const router = express.Router();

router.post('/UploadQuestionPaper',addPreviousQuestionPaper)


export default router;