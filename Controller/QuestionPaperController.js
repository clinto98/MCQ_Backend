import PreviousQuestionPaper from "../Models/QuestionPaperModel.js"
import dotenv from "dotenv";

dotenv.config();


export const addPreviousQuestionPaper = async (req, res) => {
  try {
    let papers = [];

    if (Array.isArray(req.body)) {
      papers = req.body;
    } else {
      papers = [req.body];
    }

    // Validate all papers
    for (const paper of papers) {
      const {
        examYear,
        examType,
        subject,
        syllabus,
        standard,
        paperName,
        sourceType,
        questions,
        notes,
        unit,
      } = paper;

      if (
        !examYear ||
        !examType ||
        !subject ||
        !syllabus ||
        !standard ||
        !paperName ||
        !questions ||
        !unit
      ) {
        return res.status(400).json({ message: "Missing required fields" });
      }
    }

    // Format & insert many at once
    const formattedPapers = papers.map((paper) => ({
      ...paper,
      sourceType: paper.sourceType || "Manual",
      notes: paper.notes || null,
      questions: Array.isArray(paper.questions)
        ? paper.questions
        : [paper.questions],
    }));

    const savedPapers = await PreviousQuestionPaper.insertMany(formattedPapers);

    return res.status(201).json({
      message: "Previous question paper(s) added successfully",
      papers: savedPapers,
    });
  } catch (error) {
    console.error("Error adding previous question paper:", error);
    return res.status(500).json({ message: "Server error", error });
  }
};


export const receiveQuestionPapers = async (req, res) => {
  try {
    // 🔒 Authenticate request using a secret key
    const apiKey = req.header("X-API-KEY");
    if (!apiKey || apiKey !== process.env.QUESTION_PORTAL_KEY) {
      return res.status(403).json({ message: "Unauthorized: Invalid API Key" });
    }
    
    let papers = [];
    if (Array.isArray(req.body)) papers = req.body;
    else papers = [req.body];

    // ✅ Validate all papers
    for (const paper of papers) {
      const {
        examYear,
        examType,
        subject,
        syllabus,
        standard,
        paperName,
        questions,
        course,
      } = paper;

      if (
        !examYear ||
        !examType ||
        !subject ||
        !syllabus ||
        !standard ||
        !paperName ||
        !questions ||
        !course
      ) {
        return res.status(400).json({
          message:
            "Missing required fields. Please include examYear, examType, subject, syllabus, standard, paperName, questions, and course.",
        });
      }
    }

    // 🧩 Format papers before inserting
    const formattedPapers = papers.map((paper) => ({
      ...paper,
      sourceType: paper.sourceType || "Manual",
      notes: paper.notes || null,
      questions: Array.isArray(paper.questions)
        ? paper.questions
        : [paper.questions],
    }));

    // 💾 Save to DB
    const savedPapers = await PreviousQuestionPaper.insertMany(formattedPapers);

    res.status(201).json({
      message: "✅ Question papers received and stored successfully.",
      count: savedPapers.length,
      data: savedPapers,
    });
  } catch (error) {
    console.error("❌ Error receiving question papers:", error);
    res.status(500).json({
      message: "Server error while saving question papers",
      error: error.message,
    });
  }
};