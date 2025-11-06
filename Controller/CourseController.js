import Course from "../Models/CourseModel.js";
import Enrollment from "../Models/EnrollmentModel.js";
import Student from "../Models/StudentModel.js";


export const createCourse = async (req, res) => {
  try {
    const { title, description, category, standerd, courseImage, syllabus, startDate, endDate } = req.body;

    if (!title || !syllabus ) {
      return res.status(400).json({ message: "Title, syllabus are required" });
    }

    const newCourse = new Course({
      title,
      description,
      category,
      syllabus,
      standerd,
      startDate,
      endDate,
      courseImage,
    });

    await newCourse.save();
    res.status(201).json({ message: "Course created successfully", course: newCourse });
  } catch (error) {
    res.status(500).json({ message: "Error creating course", error: error.message });
  }
};



export const updateCourse = async (req, res) => {
  try {
    const  courseId  = req.params.id;
    console.log("course",courseId);
     // Course ID should come from URL params
    const updates = req.body;
    console.log("updates",updates);
    

    // ✅ Ensure courseId is provided
    if (!courseId) {
      return res.status(400).json({ message: "Course ID is required" });
    }

    // ✅ Check if course exists
    const existingCourse = await Course.findById(courseId);
    if (!existingCourse) {
      return res.status(404).json({ message: "Course not found" });
    }

    // ✅ Only update provided fields
    const allowedFields = [
      "title",
      "description",
      "category",
      "standerd",
      "courseImage",
      "syllabus",
      "startDate",
      "endDate",
    ];

    for (const key of allowedFields) {
      if (updates[key] !== undefined) {
        existingCourse[key] = updates[key];
      }
    }

    await existingCourse.save();

    res.status(200).json({
      message: "Course updated successfully",
      course: existingCourse,
    });
  } catch (error) {
    console.error("Error updating course:", error);
    res.status(500).json({ message: "Error updating course", error: error.message });
  }
};


export const getAllCoursesforHighersecondary = async (req, res) => {
  try {
    // Instead of expecting a single classStandard, 
    // fetch all courses where standard is 10, 11, or 12
    const higherSecondaryStandards = ["10", "11", "12"];

    const courses = await Course.find({
      standerd: { $in: higherSecondaryStandards }
    }).sort({ createdAt: -1 });

    if (!courses || courses.length === 0) {
      return res.status(404).json({ message: "No higher secondary courses found" });
    }

    res.status(200).json({
      message: "Higher secondary courses retrieved successfully",
      count: courses.length,
      courses
    });
  } catch (error) {
    res.status(500).json({
      message: "Error retrieving courses",
      error: error.message
    });
  }
};
// Enroll or update enrollment
export const enrollCourse = async (req, res) => {

  try {
    const { studentId, courseId, selectedSubjects } = req.body;

       if (!studentId || !courseId || !selectedSubjects?.length) {
      return res.status(400).json({ message: "All fields are required" });
    }
   const student = await Student.findById(studentId);
    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

  
    const courseIdStr = String(courseId);
    // ✅ Check if course exists
    const course = await Course.findById(courseIdStr);
    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }

    // ✅ Find enrollment for this student
    let enrollment = await Enrollment.findOne({ studentId });

    // 🆕 No enrollment yet → create new
    if (!enrollment) {
      enrollment = await Enrollment.create({
        studentId,
        enrolledCourses: [
          {
            courseId: courseIdStr,
            selectedSubjects,
            enrollmentDate: new Date(),
          },
        ],
      });

      return res.status(200).json({
        message: "Enrollment successful (new student record created)",
        userId: student._id,
        userName: student.FullName,
        userEmail: student.email,
        planName: student.currentPlan,
        ExpiryDate: student.planExpiryDate,
        enrollment,
      });
    }
    
    // ✅ Find if this courseId already exists in enrolledCourses
    const existingCourse = enrollment.enrolledCourses.find(
      (c) => c.courseId.toString() === courseIdStr
    );

    if (existingCourse) {
      // 🧩 Add only *new* subjects that are not already there
      const newSubjects = selectedSubjects.filter(
        (subj) => !existingCourse.selectedSubjects.includes(subj)
      );

      if (newSubjects.length === 0) {
        return res.status(400).json({
          message: "No new subjects to add — already enrolled in these subjects",
        });
      }

      existingCourse.selectedSubjects.push(...newSubjects);
      existingCourse.selectedSubjects = [...new Set(existingCourse.selectedSubjects)];
      await enrollment.save();

      return res.status(200).json({
        message: `Updated existing course with new subjects: ${newSubjects.join(", ")}`,
        enrollment,
      });
    }

    // 🆕 If course not found → create new course entry
    enrollment.enrolledCourses.push({
      courseId: courseIdStr,
      selectedSubjects,
      enrollmentDate: new Date(),
    });

    await enrollment.save();

    return res.status(200).json({
      message: "Enrollment successful (new course added)",
      enrollment,
    });
  } catch (error) {
    console.error("Enrollment error:", error);
    res.status(500).json({ message: "Internal Server Error", error: error.message });
  }
};

export const getEnrolledCoursesByStudentId = async (req, res) => {
  try {
    const { studentId } = req.body; // or use req.query.studentId if you prefer query param

    if (!studentId) {
      return res.status(400).json({ message: "studentId is required" });
    }

    // Find enrollment and populate course details
    const enrollment = await Enrollment.findOne({ studentId })
      .populate("enrolledCourses.courseId", "title description") // populate course details
      .lean();

    if (!enrollment) {
      return res.status(404).json({ message: "No enrollment found for this student" });
    }

    // Transform response (optional for clarity)
    const enrolledCourses = enrollment.enrolledCourses.map((course) => ({
      courseId: course.courseId?._id || course.courseId,
      courseName: course.courseId?.title || "N/A",
      description: course.courseId?.description || "",
      selectedSubjects: course.selectedSubjects,
      enrollmentDate: course.enrollmentDate,
    }));

    res.status(200).json({
      message: "Enrolled courses fetched successfully",
      studentId,
      totalCourses: enrolledCourses.length,
      enrolledCourses,
    });
  } catch (error) {
    console.error("Error fetching enrolled courses:", error);
    res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};


// Get enrollment details
export const getEnrollment = async (req, res) => {
  try {
    const { studentId } = req.body;

    const enrollment = await Enrollment.findOne({ studentId })
      .populate("enrolledCourses.courseId", "title description");

    if (!enrollment) {
      return res.status(404).json({ message: "Enrollment not found" });
    }

    res.status(200).json({ enrollment });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};





