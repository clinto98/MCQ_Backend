import Subject from "../Models/SubjectModel.js";

export const createOrUpdateSubjects = async (req, res) => {
  try {
    const { courseId, subjects } = req.body;

    if (!courseId || !Array.isArray(subjects) || subjects.length === 0) {
      return res.status(400).json({
        message: "courseId and subjects (non-empty array) are required",
      });
    }

    // Check if a subject document already exists for the course
    let subjectDoc = await Subject.findOne({ courseId });

    if (subjectDoc) {
      // Merge subjects (avoid duplicates)
      const mergedSubjects = Array.from(
        new Set([...subjectDoc.Subjects, ...subjects])
      );
      subjectDoc.Subjects = mergedSubjects;
      await subjectDoc.save();
    } else {
      // Create new entry for this course
      subjectDoc = await Subject.create({
        courseId,
        Subjects: [...new Set(subjects)],
      });
    }

    res.status(200).json({
      message: "Subjects added/updated successfully",
      data: subjectDoc,
    });
  } catch (error) {
    console.error("Error creating/updating subjects:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};



export const getSubjectsByCourseId = async (req, res) => {
  try {
    const { courseId } = req.body;

    if (!courseId || (Array.isArray(courseId) && courseId.length === 0)) {
      return res.status(400).json({ message: "courseId (single or array) is required" });
    }

    // Convert to array if single id passed
    const courseIds = Array.isArray(courseId) ? courseId : [courseId];

    // Fetch all subjects matching any of the given courseIds
    const subjectDocs = await Subject.find({ courseId: { $in: courseIds } })
      .populate("courseId", "title description")
      .lean();

    if (!subjectDocs || subjectDocs.length === 0) {
      return res.status(404).json({ message: "No subjects found for given course(s)" });
    }

    // Combine all subject names from each course
    const allSubjects = subjectDocs.flatMap((doc) => doc.Subjects);

    // Filter unique subjects only
    const SubjectDoc = [...new Set(allSubjects.map((s) => s.trim()))];

    res.status(200).json({
      message: "Subjects fetched successfully",
      courses: subjectDocs.map((doc) => ({
        courseId: doc.courseId._id,
        title: doc.courseId.title,
        description: doc.courseId.description,
      })),
      data: SubjectDoc,
    });
  } catch (error) {
    console.error("Error fetching subjects:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
