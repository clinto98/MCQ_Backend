import express from "express";
import { createCourse, getAllCourses } from "../Controller/CourseController.js";
import { protectRoute } from "../Middileware/VerifyToken.js";


const router = express.Router();

router.post('/CreateCourse',createCourse);
router.post('/GetAllCourses',getAllCourses);

export default router;