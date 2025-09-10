import Student from "../Models/StudentModel.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import dotenv from 'dotenv'


dotenv.config();




const generateToken = (user) => {
  return jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECERT_KEY, {
    expiresIn: '15d',
  })

}


export const emailRegister = async (req, res) => {

  try {

    const email = req.body.email;

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: "Invalid email format" });
    }
    const existingEmail = await Student.findOne({ email });
    if (existingEmail) {
      return res.status(409).json({ message: "Email already registered" });
    }

    return res.status(200).json({ message: "Email is valid and available" });

  } catch (error) {
    console.log(error.message);
    return res.status(500).json({ message: "Server error", error: error.message })
  }

}






export const studentSignup = async (req, res) => {
  try {
    const {
      FullName,
      email,
      password,
      confirmPassword,
      countryCode,
      phoneNumber,
      schoolName,
      country,
      state,
      classStandard,
      dateofBirth,
      Nationality,
      Gender,
      syllabus,
      leadSource,
      leadOwner,
    } = req.body;


    console.log("Received student signup data:", req.body);



    // if (
    //   !FirstName ||
    //   !LastName ||
    //   !email ||
    //   !password ||
    //   !countryCode ||
    //   !phoneNumber ||
    //   !schoolName ||
    //   !country ||
    //   !state ||
    //   !dateofBirth ||
    //   !Nationality ||
    //   !Gender
    // ) {
    //   return res.status(400).json({ message: "All required fields must be filled" });
    // }

    if (
      !email ||
      !password ||
      !confirmPassword

    ) {
      return res.status(400).json({ message: "All required feilds must be filled" })
    }


    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: "Invalid email format" });
    }


    const passwordRegex =
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!passwordRegex.test(password)) {
      return res.status(400).json({
        message:
          "Password must be at least 8 characters long, include uppercase, lowercase, number, and special character",
      });
    }


    // const phoneRegex = /^[0-9]{7,15}$/;
    // if (!phoneRegex.test(phoneNumber)) {
    //   return res.status(400).json({ message: "Invalid phone number format" });
    // }

    if (password !== confirmPassword) {
      return res.status(400).json({ message: "Password mismatch" })
    }


    const existingEmail = await Student.findOne({ email });
    if (existingEmail) {
      return res.status(409).json({ message: "Email already registered" });
    }

    // 🔹 6. Check for duplicate phone
    // const existingPhone = await Student.findOne({ phoneNumber, countryCode });
    // if (existingPhone) {
    //   return res.status(409).json({ message: "Phone number already registered" });
    // }

    // 🔹 7. Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // 🔹 8. Create new student
    const newStudent = new Student({
      FullName,
      email,
      password: hashedPassword,
      countryCode,
      phoneNumber,
      schoolName,
      country,
      state,
      classStandard,
      dateofBirth,
      Nationality,
      Gender,
      syllabus,
      leadSource,
      leadOwner,
    });

    await newStudent.save();

    return res.status(201).json({
      message: "Student registered successfully",
      student: {
        id: newStudent._id,
        FullName: newStudent.FullName,
        email: newStudent.email,
        phoneNumber: newStudent.phoneNumber,
        schoolName: newStudent.schoolName,
        country: newStudent.country,
        state: newStudent.state,
      },
    });
  } catch (error) {
    console.error("Error during student signup:", error);
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};


export const updateStudentStandard = async (req, res) => {
  try {
    const { studentId } = req.params; // Student ID comes from route params
    const { classStandard } = req.body; // New class standard from request body

    if (!classStandard) {
      return res.status(400).json({ message: "classStandard is required" });
    }

    // 🔹 Check if student exists
    const student = await Student.findById(studentId);
    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    // 🔹 Update standard
    student.classStandard = classStandard;
    await student.save();

    return res.status(200).json({
      message: "Student standard updated successfully",
      student: {
        id: student._id,
        FirstName: student.FirstName,
        LastName: student.LastName,
        email: student.email,
        classStandard: student.classStandard,
      },
    });
  } catch (error) {
    console.error("Error updating student standard:", error);
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

export const studentLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Check if both fields exist
    if (!email || !password) {
      return res.status(400).json({ message: "Email and Password are required" });
    }


    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: "Invalid email format" });
    }


    const student = await Student.findOne({ email });
    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }


    const isMatch = await bcrypt.compare(password, student.password);



    if (!isMatch) {
      return res.status(401).json({ message: "Invalid email or password" });
    }


    const token = generateToken(student);
    res.cookie("jwt", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production', // HTTPS only in prod
      sameSite: "None", // ✅ required for cross-origin cookies
      maxAge: 15 * 24 * 60 * 60 * 1000, // 15 days
    });



    // Successful login
    res.status(200).json({
      message: "Login successful",
      token: token,
      student: {
        id: student._id,
        firstName: student.FirstName,
        lastName: student.LastName,
        email: student.email,
      },
    });
  } catch (error) {
    console.error("Login Error:", error);
    res.status(500).json({ message: "Server error" });
  }
};


export const studentLogout = (req, res) => {
  try {
    res.cookie("jwt", "", {
      httpOnly: true,
      expires: new Date(0),
      secure: process.env.NODE_ENV === 'production', // HTTPS only in prod
      sameSite: "None", // ✅ required for cross-origin cookies
    });
    res.status(200).json({ message: "Logout successful" });

  } catch (error) {
    console.error("Logout Error:", error);
    res.status(500).json({ message: "Server error" });
  }
}


export const updatePraticeMode = async (req, res) => {
  try {
    const { studentId, praticeMode } = req.body

    // Validate input
    const validModes = ["Getting Started", "On My Way", "Confident", "Pro Level"];
    if (!validModes.includes(praticeMode)) {
      return res.status(400).json({ message: "Invalid practice mode." });
    }

    // Find the student and update the practice mode
    const student = await Student.findById(studentId);
    if (!student) {
      return res.status(404).json({ message: "Student not found." });
    }

    student.praticeMode = praticeMode;
    await student.save();

    res.status(200).json({
      message: "Practice mode updated successfully.",
      praticeMode: student.praticeMode,
    });
  } catch (error) {
    console.error("Error updating practice mode:", error);
    res.status(500).json({ message: "Server error." });
  }
};