import TodaysQuestions from "../Models/TodaysQuestionModel.js";
import twelve from "../Models/McqModel.js";


export const createTodaysQuestions = async (req, res) => {
  try {
    const { userId, subject, syllabus, standard } = req.body;

    if (!userId || !subject || !syllabus || !standard) {
      return res.status(400).json({ message: "userId, subject, syllabus and standard are required" });
    }

    // ✅ Check for existing active session
    const existing = await TodaysQuestions.findOne({
      userId,
      subject,
      syllabus,
      standard,
      isActive: true,
    });

    if (existing) {
      return res.status(200).json({
        message: "Today's questions already created for this subject. Complete it before generating again.",
        quizId: existing._id,
      });
    }

    // ✅ Get 10 random questions
    const totalNeeded = 10;

    const randomQuestions = await twelve.aggregate([
      { $match: { subject, syllabus, Standard: standard } },
      { $sample: { size: totalNeeded } },
    ]);
    

    const Section1 = randomQuestions.map((q, i) => ({
      questionId: q._id,
      number: i + 1,
    }));

    const newSession = new TodaysQuestions({
      userId,
      subject,
      syllabus,
      standard,
      Section1,
      currentQuestion: { section: 1, questionIndex: 0, questionId: Section1[0].questionId },
      isActive: true,
      progress: { status: "not_started" },
    });

    await newSession.save();

    return res.status(201).json({
      message: "Today's Questions created successfully",
      quizId: newSession._id,
    });
  } catch (error) {
    console.error("Error creating today's questions:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};



// Get "Today's Questions" (resume if exists)
export const getTodaysQuestions = async (req, res) => {
  try {
    const { userId, subject, syllabus, standard } = req.body;

    if (!userId || !subject || !syllabus || !standard) {
      return res.status(400).json({ message: "userId, subject, syllabus and standard are required" });
    }

    // ✅ Resume session if exists
    const session = await TodaysQuestions.findOne({ userId, subject, syllabus, standard, isActive: true });
    if (!session) {
      return res.status(404).json({ message: "No active Today's Questions found" });
    }

    const allIds = session.Section1.map((q) => q.questionId);
    const fullQuestions = await twelve.find({ _id: { $in: allIds } }).select("_id question options correctAnswer").lean();
    const fqMap = new Map(fullQuestions.map((fq) => [fq._id.toString(), fq]));

    const Section1 = session.Section1.map((q) => ({
      ...q.toObject(),
      question: fqMap.get(q.questionId.toString())?.question ?? null,
      options: fqMap.get(q.questionId.toString())?.options ?? null,
      correctAnswer: fqMap.get(q.questionId.toString())?.correctAnswer ?? null,
    }));

    // add current question details
    let current = null;
    if (session.currentQuestion?.questionId) {
      const cq = Section1[session.currentQuestion.questionIndex];
      current = cq || null;
    }

    return res.status(200).json({
      message: "Today's Questions resumed",
      quizId: session._id,
      Section1,
      currentQuestion: current,
      progress: session.progress,
    });
  } catch (error) {
    console.error("Error getting today's questions:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};



// Check an answer for "Today's Questions"
export const checkTodaysAnswerById = async (req, res) => {
  try {
    const {questionId} = req.params;
    const { userAnswer, userId } = req.body;

    if (!questionId || !userAnswer || !userId) {
      return res.status(400).json({ message: "questionId, userAnswer and userId are required" });
    }

    const question = await twelve.findById(questionId);
    if (!question) {
      return res.status(404).json({ message: "Question not found" });
    }

    const isCorrect = question.correctAnswer.trim().toLowerCase() === userAnswer.trim().toLowerCase();

    const session = await TodaysQuestions.findOne({ userId, isActive: true });
    if (!session) {
      return res.status(404).json({ message: "Active session not found" });
    }

    // update Section1
    const idx = session.Section1.findIndex((q) => q.questionId.toString() === questionId.toString());
    if (idx === -1) {
      return res.status(404).json({ message: "Question not part of today's session" });
    }

    session.Section1[idx].status = isCorrect ? "correct" : "incorrect";
    session.Section1[idx].attempts += 1;
    session.Section1[idx].answeredAt = new Date();

    // update progress
    session.progress.completedQuestions += 1;

    if (isCorrect) {
      session.progress.correctAnswers += 1;

      // ✅ store correct question
      session.progress.correctAnswerList.push(questionId);

    } else {
      session.progress.wrongAnswers += 1;

      // ✅ store wrong question + selected option
      session.progress.wrongAnswerList.push({
        questionId,
        selectedOption: userAnswer,
        answeredAt: new Date(),
      });
    }

    // move current pointer
    let nextIndex = idx + 1;
    if (nextIndex >= session.Section1.length) {
      session.progress.status = "completed";
      session.isActive = false;
    } else {
      session.progress.status = "in_progress";
      session.currentQuestion = {
        section: 1,
        questionIndex: nextIndex,
        questionId: session.Section1[nextIndex].questionId,
      };
    }

    await session.save();

    return res.status(200).json({
      message: "Answer checked and updated",
      isCorrect,
      correctAnswer: isCorrect ? undefined : question.correctAnswer,
      progress: session.progress,
      currentQuestion: session.currentQuestion,
    });
  } catch (error) {
    console.error("Error checking today's question:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

export const getTodaysAnalysisReport = async (req, res) => {
  try {
    const { quizId } = req.params;

    // ✅ Fetch session
    const session = await TodaysQuestions.findById(quizId).lean();
    if (!session) {
      return res.status(404).json({ message: "Today's session not found" });
    }

    const {
      progress: {
        completedQuestions,
        correctAnswers,
        wrongAnswers,
        correctAnswerList = [],
        wrongAnswerList = [],
      },
    } = session;

    const correctIds = correctAnswerList.map(id => id.toString());
    const wrongIds = wrongAnswerList.map(item => item.questionId.toString());

    const scorePercentage =
      completedQuestions > 0
        ? ((correctAnswers / completedQuestions) * 100).toFixed(2)
        : 0;

    // ✅ Fetch detailed question data
    const allQuestionIds = [...correctIds, ...wrongIds];

    const questionsData = await twelve.find(
      { _id: { $in: allQuestionIds } },
      { question: 1, correctAnswer: 1, topic: 1, explanation: 1 }
    ).lean();

    // ✅ Topic Accuracy Calculation
    const topicStats = {};
    questionsData.forEach((q) => {
      if (!topicStats[q.topic]) topicStats[q.topic] = { total: 0, correct: 0 };
      topicStats[q.topic].total++;
      if (correctIds.includes(q._id.toString())) {
        topicStats[q.topic].correct++;
      }
    });

    const topicPerformance = Object.keys(topicStats).map((topic) => ({
      topic,
      correctPercent: (
        (topicStats[topic].correct / topicStats[topic].total) * 100
      ).toFixed(0),
    }));

    // ✅ Correct Question Review
    const correctQuestions = questionsData
      .filter((q) => correctIds.includes(q._id.toString()))
      .map((q) => ({
        questionId: q._id,
        question: q.question,
        correctAnswer: q.correctAnswer,
        topic: q.topic,
      }));

    // ✅ Wrong Question Review
    const wrongQuestions = wrongAnswerList.map((item) => {
      const q = questionsData.find(
        (qq) => qq._id.toString() === item.questionId.toString()
      );
      return {
        questionId: q._id,
        question: q.question,
        topic: q.topic,
        selectedOption: item.selectedOption,
        correctAnswer: q.correctAnswer,
        explanation: q.explanation,
        answeredAt: item.answeredAt,
      };
    });

    return res.status(200).json({
      message: "Today's session analysis generated successfully",
      quizId,

      summary: {
        completedQuestions,
        correctAnswers,
        wrongAnswers,
        scorePercentage: scorePercentage + "%",
      },

      topicPerformance,

      review: {
        correctQuestions,
        wrongQuestions,
      },
    });
  } catch (error) {
    console.error("Error fetching today's analysis:", error);
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};
