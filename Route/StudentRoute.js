import express from "express";
import { emailRegister, studentLogin, studentLogout, studentSignup, updatePraticeMode, updateStudentStandard } from "../Controller/StudentController.js";


const router = express.Router();

router.post('/StudentRegister', studentSignup)
router.post('/StudentLogin', studentLogin)
router.post('/StudentLogout',studentLogout)
router.post('/emailValidate',emailRegister)
router.put('/standardupdate/:studentId',updateStudentStandard)
router.put('/StudentPraticeMode',updatePraticeMode)

export default router;

