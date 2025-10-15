import express from "express";
import { createCourse, enrollCourse, getAllCoursesforHighersecondary, getEnrolledCoursesByStudentId, getEnrollment, updateCourse } from "../Controller/CourseController.js";


const router = express.Router();

router.post('/CreateCourse', createCourse);
router.get('/GetAllCourses', getAllCoursesforHighersecondary);
router.post('/CourseUpdate/:id', updateCourse)
router.post('/CourseEnrollment', enrollCourse)
router.post('/GetEnrolledCourses', getEnrollment)
router.post('/GetAllEnrolledSubjects', getEnrolledCoursesByStudentId)

export default router;