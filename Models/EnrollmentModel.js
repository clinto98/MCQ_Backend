import mongoose from "mongoose";

const enrolledCourseSchema = new mongoose.Schema({
  courseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Course",
    required: true,
  },
  selectedSubjects: {
    type: [String],
    default: [],
  },
  enrollmentDate: {
    type: Date,
    default: Date.now,
  },
});

const enrollmentSchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: true,
    },
    enrolledCourses: [enrolledCourseSchema],
  },
  { timestamps: true }
);

export default mongoose.model("Enrollment", enrollmentSchema);
