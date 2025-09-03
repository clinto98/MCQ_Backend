import twelve from "../Models/McqModel.js";
import cloudinary from '../Utils/Cloudinary.js'



export const createTwelfthQuestion = async (req, res) => {
  try {
    const {
      courseName,
      statement,
      subQuestions,
      question,
      options,
      correctAnswer,
      difficulty,
      subject,
      topic,
      syllabus,
      Standard,
      category,
      explainerVideoUrl,
      slideDocumentUrl,
      sourceType,
    } = req.body;

   
    const processedOptions = await Promise.all(
      options.map(async (op) => {
        let diagramUrl = op.diagramUrl || null; // take existing url if provided

        if (op.imageFile) {
          const uploadRes = await cloudinary.uploader.upload(op.imageFile, {
            folder: "mcq_options",
          });
          diagramUrl = uploadRes.secure_url;
        }

        return { text: op.text, diagramUrl };
      })
    );

    const newQuestion = new twelve({
      courseName,
      statement,
      subQuestions,
      question,
      options: processedOptions,
      correctAnswer,
      difficulty,
      subject,
      topic,
      syllabus,
      Standard,
      category,
      explainerVideoUrl,
      slideDocumentUrl,
      sourceType,
    });

    await newQuestion.save();
    res.status(201).json({
      message: "Question created successfully",
      question: newQuestion,
    });
  } catch (error) {
    console.error("Error creating question:", error);
    res.status(500).json({ message: "Error creating question", error });
  }
};


export const createBulkTwelfthQuestions = async (req, res) => {
  
  try {
    const { questions } = req.body;

    if (!questions || !Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({ message: "Questions array is required" });
    }

    // Validate each question
    const invalid = questions.find(
      (q) =>
        !q.courseId ||
        !q.question ||
        !q.options ||
        !q.correctAnswer ||
        !q.subject ||
        !q.topic ||
        !q.syllabus
    );

    if (invalid) {
      return res
        .status(400)
        .json({ message: "Some questions are missing required fields" });
    }

    // Insert all questions
    const newQuestions = await twelve.insertMany(questions);

    res
      .status(201)
      .json({
        message: "Bulk questions created successfully",
        count: newQuestions.length,
        questions: newQuestions,
      });
  } catch (error) {
    res.status(500).json({ message: "Error creating bulk questions", error: error.message });
  }
};
