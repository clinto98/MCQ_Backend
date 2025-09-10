import twelve from "../Models/McqModel.js";
import cloudinary from '../Utils/Cloudinary.js';
import MockQuestions from "../Models/MockQuestionModel.js";
import FlaggedQuestion from "../Models/FlaggedquestionsModel.js";
import TimeQuestions from "../Models/TimeQuestionModel.js";


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


export const MockBattle = async (req, res) => {
  try {
    let { StudentId, Standard, syllabus, Subject, FrequentlyAsked, ExamSimulation, topic } = req.body;

    console.log(req.body);

    // Convert booleans from string if needed
    FrequentlyAsked = FrequentlyAsked === "true" || FrequentlyAsked === true;
    ExamSimulation = ExamSimulation === "true" || ExamSimulation === true;

    // Validate input
    if (!StudentId || !Subject || !Standard || !syllabus || !topic || !Array.isArray(topic)) {
      return res.status(400).json({ message: "Some fields are missing or invalid" });
    }

    // Build the match condition
    const matchCondition = {
      subject: Subject,
      topic: { $in: topic },
      Standard: Standard,
      syllabus: syllabus
    };

    if (FrequentlyAsked) {
      matchCondition.FrequentlyAsked = true; // Add filter only if FrequentlyAsked is true
    }
    // If FrequentlyAsked is false or not specified, do not add this filter

    // Aggregation pipeline
    const questionsByTopic = await twelve.aggregate([
      {
        $match: matchCondition
      },
      {
        $group: {
          _id: "$topic",
          questions: { $push: "$$ROOT" }
        }
      },
      {
        $project: {
          topic: "$_id",
          questions: { $slice: ["$questions", 10] }, // Limit to 50 questions per topic
          _id: 0
        }
      }
    ]);

    if (questionsByTopic.length === 0) {
      return res.status(404).json({ message: "No questions found for the selected topics." });
    }

    const quizTopics = questionsByTopic.map(item => ({
      topic: item.topic,
      questions: item.questions,
      timeLimit: 30
    }));

    const totalTime = quizTopics.length * 30;

    // Save the mock quiz instance
    const mockQuiz = await MockQuestions.create({
      userId: StudentId,
      subject: Subject,
      Standard: Standard,   // Added Standard here
      syllabus: syllabus,
      FrequentlyAsked: FrequentlyAsked,
      ExamSimulation: ExamSimulation,
      timeLimit: totalTime,
      questions: quizTopics.flatMap((topic, topicIndex) =>
        topic.questions.map((question, index) => ({
          questionId: question._id,
          index: index,
          status: "pending",
          answeredAt: null,
          attempts: 0
        }))
      )
    });

    return res.status(200).json({
      message: "Mock quiz generated successfully.",
      quizId: mockQuiz._id,
      totalTime: totalTime,
      topic: quizTopics
    });

  } catch (error) {
    console.error("MockBattle error:", error);
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};


export const flagQuestion = async (req, res) => {
  try {
    const { userId, questionId } = req.body;

    // Validate input
    if (!userId || !questionId) {
      return res.status(400).json({ message: "Some fields are missing or invalid" });
    }

    // Convert questionId to ObjectId
    const questionObjectId = new mongoose.Types.ObjectId(questionId);

    // Find if a flagged question document exists for this user and subject
    let flaggedDoc = await FlaggedQuestion.findOne({ userId });

    if (!flaggedDoc) {
      // Create new flagged question document
      flaggedDoc = new FlaggedQuestion({
        userId,
        questions: [{
          questionId: questionObjectId,
          index: 0,
          status: "pending",
          answeredAt: null,
          attempts: 0
        }]
      });
    } else {
      // Check if the question already exists in the array
      const exists = flaggedDoc.questions.some(q => q.questionId.equals(questionObjectId));
      if (exists) {
        return res.status(200).json({ message: "Question already flagged.", flaggedQuestion: flaggedDoc });
      }
      // Add new question
      flaggedDoc.questions.push({
        questionId: questionObjectId,
        index: flaggedDoc.questions.length,
        status: "pending",
        answeredAt: null,
        attempts: 0
      });
    }

    // Save the document
    await flaggedDoc.save();

    return res.status(200).json({
      message: "Question flagged successfully.",
      flaggedQuestion: flaggedDoc
    });

  } catch (error) {
    console.error("flagQuestion error:", error);
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};


export const createTimeQuiz = async (req, res) => {
  try {
    const { StudentId, Standard, syllabus, Subject, challangeTime, WrongQuestionsLimit } = req.body;

    if (!StudentId || !Subject || !challangeTime || !WrongQuestionsLimit) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const questionCountPerSection = 10;
    const totalQuestions = Math.floor((challangeTime * 60) / 30); // 30 sec per question
    const numberOfSections = Math.ceil(totalQuestions / questionCountPerSection);
    const totalNeeded = numberOfSections * questionCountPerSection;

    const randomQuestions = await twelve.aggregate([
      { $match: { subject: Subject } },
      { $sample: { size: totalNeeded } }
    ]);

    if (randomQuestions.length === 0) {
      return res.status(404).json({ message: "No questions available for this subject" });
    }

    // Group questions into sections using reduce
    const sections = randomQuestions.reduce((acc, question, index) => {
      const sectionIndex = Math.floor(index / questionCountPerSection);
      if (!acc[sectionIndex]) {
        acc[sectionIndex] = { questions: [] };
      }
      acc[sectionIndex].questions.push({
        questionId: question._id,
        index: acc[sectionIndex].questions.length,
        status: "pending",
        attempts: 0,
        answeredAt: null,
      });
      return acc;
    }, []);

    const newQuiz = new TimeQuestions({
      userId: StudentId,
      subject: Subject,
      Standard,
      syllabus,
      challangeTime,
      WrongQuestionsLimit,
      timeLimit: challangeTime,
      sections,
      currentQuestion: {
        sectionIndex: 0,
        questionIndex: 0
      },
      progress: {
        completedQuestions: 0,
        correctAnswers: 0,
        wrongAnswers: 0,
        status: "not_started",
      },
      isActive: true,
    });

    await newQuiz.save();

    return res.status(201).json({
      message: "Timed quiz created successfully",
      quizId: newQuiz._id,
      sections: newQuiz.sections,
      currentQuestion: newQuiz.sections[0]?.questions[0] || null,
      progress: newQuiz.progress,
    });

  } catch (error) {
    console.error("Error creating timed quiz:", error);
    return res.status(500).json({ message: "Server error", error });
  }
};


export const submitTimeAnswer = async (req, res) => {
  try {
    const { quizId, sectionIndex, questionIndex, answer } = req.body;

    const quiz = await TimeQuestions.findById(quizId);

    if (!quiz || !quiz.isActive) {
      return res.status(404).json({ message: "Quiz not found or inactive" });
    }

    const section = quiz.sections[sectionIndex];
    if (!section) {
      return res.status(400).json({ message: "Invalid section index" });
    }

    const questionEntry = section.questions[questionIndex];
    if (!questionEntry || questionEntry.status !== "pending") {
      return res.status(400).json({ message: "Invalid or already answered question" });
    }

    const question = await twelve.findById(questionEntry.questionId);

    if (!question) {
      return res.status(404).json({ message: "Question not found" });
    }

    // Check if answer is correct
    const isCorrect = question.correctAnswer === answer;

    // Update question status
    questionEntry.status = isCorrect ? "correct" : "incorrect";
    questionEntry.answeredAt = new Date();
    questionEntry.attempts += 1;

    // Update quiz progress
    quiz.progress.completedQuestions += 1;
    if (isCorrect) {
      quiz.progress.correctAnswers += 1;
    } else {
      quiz.progress.wrongAnswers += 1;
    }

    // Check if wrong limit is exceeded
    if (quiz.progress.wrongAnswers >= quiz.WrongQuestionsLimit) {
      quiz.isActive = false;
      await quiz.save();
      return res.status(400).json({ message: "Wrong answer limit exceeded", quiz });
    }

    // Move to next question
    let nextSectionIndex = sectionIndex;
    let nextQuestionIndex = questionIndex + 1;

    if (nextQuestionIndex >= section.questions.length) {
      nextSectionIndex += 1;
      nextQuestionIndex = 0;
    }

    if (nextSectionIndex >= quiz.sections.length) {
      quiz.progress.status = "completed";
      quiz.isActive = false;
    } else {
      quiz.currentQuestion.sectionIndex = nextSectionIndex;
      quiz.currentQuestion.questionIndex = nextQuestionIndex;
      if (quiz.progress.status === "not_started") {
        quiz.progress.status = "in_progress";
      }
    }

    await quiz.save();

    const nextSection = quiz.sections[quiz.currentQuestion.sectionIndex];
    const nextQuestion = nextSection?.questions[quiz.currentQuestion.questionIndex] || null;

    return res.status(200).json({
      message: isCorrect ? "Correct answer" : "Incorrect answer",
      quiz,
      nextQuestion,
    });

  } catch (error) {
    console.error("Error submitting answer:", error);
    return res.status(500).json({ message: "Server error", error });
  }
};



