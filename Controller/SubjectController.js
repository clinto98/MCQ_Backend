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

    if (!courseId) {
      return res.status(400).json({ message: "courseId is required" });
    }

    const subjectDoc = await Subject.findOne({ courseId }).populate(
      "courseId",
      "title description"
    );

    if (!subjectDoc) {
      return res.status(404).json({
        message: "No subjects found for this course",
      });
    }

    res.status(200).json({
      message: "Subjects fetched successfully",
      data: subjectDoc,
    });
  } catch (error) {
    console.error("Error fetching subjects:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
