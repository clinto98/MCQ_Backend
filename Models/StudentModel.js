
import mongoose from "mongoose";


const studentSchema = new mongoose.Schema(
  {
    FullName: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
    },
    countryCode: {
      type: String,
      // required: true,
      trim: true,
    },
    phoneNumber: {
      type: String,
      // required: true,
    },
    // parentFirstName: {
    //   type: String,
    //   required: true,
    //   trim: true,
    // },
    //    parentMiddleName: {
    //   type: String,
    //   trim: true,
    // },
    // parentLastName: {
    //   type: String,
    //   required: true,
    //   trim: true,
    // },
    // parentEmail: {
    //   type: String,
    //   required: true,
    //   lowercase: true,
    //   trim: true,
    // },
    // parentId: {
    //   type: mongoose.Schema.Types.ObjectId,
    //   ref: "Parent",
    //   default: null,
    // },
    schoolName: {
      type: String,
      // required: true,
      trim: true,
    },
    country: {
      type: String,
      // required: true,
      trim: true,
    },
    dateofBirth: {
      type: String,
      // required: true,
    },
    Gender: {
      type: String,
    },
    Nationality: {
      type: String,
      // required: true,
      trim: true,
    },
    state: {
      type: String,
      // required: true,
      trim: true,
    },
    classStandard: {
      type: String,
      trim: true,
    },
    syllabus: {
      type: String,
      trim: true,
    },
    // isParentLinked: {
    //   type: Boolean,
    //   default: false,
    // },
    leadSource: {
      type: String,
      default: null,
    },
    leadOwner: {
      type: String,
      default: null,
    },
    lastLoginDate: Date,
    referralCode: {
      type: String,
      // unique: true,
    },
    referredBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      default: null,
    },
    referralBonusEarned: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

export default mongoose.model("Student", studentSchema);
