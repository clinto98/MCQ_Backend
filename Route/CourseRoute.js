import express from "express";
import { createCourse, enrollCourses, getAllCoursesforHighersecondary } from "../Controller/CourseController.js";
import { protectRoute } from "../Middileware/VerifyToken.js";


const router = express.Router();

router.post('/CreateCourse',createCourse);
router.post('/GetAllCourses',getAllCoursesforHighersecondary);
router.post('/CourseEnrollment',enrollCourses)

export default router;