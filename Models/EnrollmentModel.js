import mongoose from "mongoose";

const enrollmentSchema = new mongoose.Schema({
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Student",
    required: true,
  },
  enrolledCourses: [
    {
      courseId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Course",
        required: true,
      },
      selectedSubjects: [
        {
          type: String,
          trim: true,
        },
      ],
      enrollmentDate: {
        type: Date,
        default: Date.now,
      },
    },
  ],
}, { timestamps: true });

export default mongoose.model("Enrollment", enrollmentSchema);
