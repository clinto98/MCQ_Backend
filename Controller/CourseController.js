import Course from "../Models/CourseModel.js";
import Enrollment from "../Models/EnrollmentModel.js";


export const createCourse = async (req, res) => {
  try {
    const { title, description, category, standerd, syllabus, startDate, endDate } = req.body;

    if (!title || !syllabus) {
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
    });

    await newCourse.save();
    res.status(201).json({ message: "Course created successfully", course: newCourse });
  } catch (error) {
    res.status(500).json({ message: "Error creating course", error: error.message });
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
export const enrollCourses = async (req, res) => {
  try {
    const { studentId, courseId, subjects } = req.body;

    // Validate request
    if (!studentId || !courseId || !Array.isArray(subjects) || subjects.length === 0) {
      return res.status(400).json({
        message: "studentId, courseId, and subjects (non-empty array) are required",
      });
    }

    // Find existing enrollment for the student
    let enrollment = await Enrollment.findOne({ studentId });

    if (!enrollment) {
      // If no enrollment, create new one
      enrollment = new Enrollment({
        studentId,
        enrolledCourses: [
          {
            courseId,
            selectedSubjects: [...new Set(subjects)],
          },
        ],
      });
    } else {
      // Find if the course already exists
      const existingCourseIndex = enrollment.enrolledCourses.findIndex(
        (c) => c.courseId.toString() === courseId
      );

      if (existingCourseIndex !== -1) {
        // Course already exists → merge subjects and prevent duplicates
        const existingSubjects = enrollment.enrolledCourses[existingCourseIndex].selectedSubjects;

        const mergedSubjects = Array.from(new Set([...existingSubjects, ...subjects]));

        // Only update if new subjects are added (prevent duplicate saving)
        if (mergedSubjects.length !== existingSubjects.length) {
          enrollment.enrolledCourses[existingCourseIndex].selectedSubjects = mergedSubjects;
        }
      } else {
        // Add new course enrollment only if it's not already there
        enrollment.enrolledCourses.push({
          courseId,
          selectedSubjects: [...new Set(subjects)],
        });
      }
    }

    // Save the document
    await enrollment.save();

    res.status(200).json({
      message: "Enrollment updated successfully",
      enrollment,
    });
  } catch (error) {
    console.error("Error during enrollment:", error);
    res.status(500).json({ message: "Server error", error: error.message });
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





