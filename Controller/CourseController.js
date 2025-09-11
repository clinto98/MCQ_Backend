import Course from "../Models/CourseModel.js";


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


export const getAllCourses = async (req, res) => {
  try {
    const { classStandard } = req.body
    
    console.log("data",req.body);
   

    if (!classStandard) {
      return res.status(400).json({ message: "Standard is required" });
    }

   
    const courses = await Course.find({ standerd: classStandard }).sort({ createdAt: -1 });

    if (!courses || courses.length === 0) {
      return res.status(404).json({ message: "No courses found for this standard" });
    }

    res.status(200).json({
      message: "Courses retrieved successfully",
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



