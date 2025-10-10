import express from "express"
import { createOrUpdateSubjects, getSubjectsByCourseId } from "../Controller/SubjectController.js";





const router = express.Router();


router.post("/CreateSubject", createOrUpdateSubjects)
router.post("/GetAllSubjects", getSubjectsByCourseId)




export default router;