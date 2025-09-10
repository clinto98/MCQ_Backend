import PreviousQuestionPaper from "../Models/PreviousQuestionModel.js";


export const addPreviousQuestionPaper = async (req, res) => {
    try {
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
        } = req.body;

        // Validate required fields
        if (!examYear || !examType || !subject || !syllabus || !standard || !paperName || !questions) {
            return res.status(400).json({ message: "Missing required fields" });
        }

        // Ensure questions is an array even if a single object is sent
        const questionsArray = Array.isArray(questions) ? questions : [questions];

        // Create new document
        const newPaper = new PreviousQuestionPaper({
            examYear,
            examType,
            subject,
            syllabus,
            standard,
            paperName,
            sourceType: sourceType || "Manual",
            questions: questionsArray,
            notes: notes || null,
        });

        await newPaper.save();

        return res.status(201).json({
            message: "Previous question paper added successfully",
            paper: newPaper
        });
    } catch (error) {
        console.error("Error adding previous question paper:", error);
        return res.status(500).json({ message: "Server error", error });
    }
};
