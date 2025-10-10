import express from "express";
import { createCourse, enrollCourses, getAllCoursesforHighersecondary, getEnrolledCoursesByStudentId, getEnrollment } from "../Controller/CourseController.js";


const router = express.Router();

router.post('/CreateCourse',createCourse);
router.post('/GetAllCourses',getAllCoursesforHighersecondary);
router.post('/CourseEnrollment',enrollCourses)
router.post('/GetEnrolledCourses',getEnrollment)
router.post('/GetAllEnrolledSubjects',getEnrolledCoursesByStudentId)

export default router;