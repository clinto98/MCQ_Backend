import twelve from "../Models/McqModel.js";
import PracticePlan from "../Models/PraticePlanModel.js";
import RandomQuestions from '../Models/RandomquestionsModel.js'
import MissedQuestions from '../Models/MissedquestionsModel.js'

export const createPraticePlan = async (req, res) => {

  try {
    const {
      userId,
      standard,
      syllabus,
      subject,
      totalQuestions,
      preferredTime,
      startDate,
      difficulty,
      endDate,
      skipdays,
    } = req.body;

    console.log("Received practice plan data:", req.body);

    if (
      !standard ||
      !syllabus ||
      !subject ||
      !totalQuestions ||
      !preferredTime ||
      !startDate ||
      !endDate ||
      !difficulty ||
      !skipdays
    ) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const questionCount = parseInt(totalQuestions) || 5;

    const totalNeeded = questionCount * 3;

    // Fetch total unique questions
    const matchedQuestions = await twelve.aggregate([
      {
        $match: {
          Standard: standard,
          syllabus: syllabus,
          subject: subject,
          difficulty: difficulty,

        },
      },
      { $sample: { size: totalNeeded } }, // fetch all at once
      {
        $project: {
          _id: 1,
          question: 1,
          options: 1,
          correctAnswer: 1,
        },
      },
    ]);


    if (matchedQuestions.length < totalNeeded) {
      return res.status(404).json({
        message: `Not enough questions found. Required ${totalNeeded}, found ${matchedQuestions.length}`,
      });
    }

    // Split into 3 sections
    const section1Questions = matchedQuestions.slice(0, questionCount).map((q, i) => ({
      questionId: q._id,
      number: i + 1,
    }));

    const section2Questions = matchedQuestions.slice(questionCount, questionCount * 2).map((q, i) => ({
      questionId: q._id,
      number: i + 1,
    }));

    const section3Questions = matchedQuestions.slice(questionCount * 2, questionCount * 3).map((q, i) => ({
      questionId: q._id,
      number: i + 1,
    }));


    // Create new practice plan
    const newPlan = new PracticePlan({
      userId,
      preferences: {
        standard,
        syllabus,
        subject,
        totalQuestions: totalNeeded,
        preferredTime,
        startDate,
        endDate,
        difficulty,
        skipdays
      },
      Section1: section1Questions,
      Section2: section2Questions,
      Section3: section3Questions,
    });

    await newPlan.save();

    return res.status(201).json({
      message: "Practice plan created successfully",
      plan: newPlan,
      planid: newPlan._id,
    });
  } catch (error) {
    console.error("Error creating practice plan: ", error);
    return res
      .status(500)
      .json({ message: "Server error", error: error.message });
  }
};

export const getPracticePlanQuestions = async (req, res) => {
  try {
    const { planId } = req.params;

    if (!planId) {
      return res.status(400).json({ message: "Plan ID is required" });
    }

    // Fetch practice plan with populated question data
    const plan = await PracticePlan.findById(planId)
      .populate({
        path: 'Section1.questionId',
        select: 'question options correctAnswer difficulty subject topic'
      })
      .populate({
        path: 'Section2.questionId',
        select: 'question options correctAnswer difficulty subject topic'
      })
      .populate({
        path: 'Section3.questionId',
        select: 'question options correctAnswer difficulty subject topic'
      })
      .populate('currentQuestion.questionId', 'question options correctAnswer');

    if (!plan) {
      return res.status(404).json({ message: "Practice plan not found" });
    }

    res.status(200).json({
      message: "Practice plan retrieved successfully",
      plan: plan
    });
  } catch (error) {
    console.error("Error retrieving practice plan:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

export const getQuestionBySectionAndIndex = async (req, res) => {
  try {
    const { planId, section, questionIndex } = req.params;

    if (!planId || !section || questionIndex === undefined) {
      return res.status(400).json({ message: "Plan ID, section, and question index are required" });
    }

    const plan = await PracticePlan.findById(planId);
    if (!plan) {
      return res.status(404).json({ message: "Practice plan not found" });
    }

    const sectionKey = `Section${section}`;
    const sectionQuestions = plan[sectionKey];

    if (!sectionQuestions?.[questionIndex]) {
      return res.status(400).json({ message: "Invalid section or question index" });
    }

    const currentQ = sectionQuestions[questionIndex];

    // Populate the question data
    const questionData = await twelve.findById(currentQ.questionId)
      .select('question options correctAnswer difficulty subject topic');

    if (!questionData) {
      return res.status(404).json({ message: "Question not found" });
    }

    res.status(200).json({
      message: "Question retrieved successfully",
      question: {
        ...questionData.toObject(),
        status: currentQ.status,
        answeredAt: currentQ.answeredAt,
        attempts: currentQ.attempts,
        number: currentQ.number
      }
    });
  } catch (error) {
    console.error("Error retrieving question:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

export const checkAnswerById = async (req, res) => {
  try {
    const questionId = req.params.id;
    const { userAnswer, userId } = req.body;

    if (!questionId || !userAnswer || !userId) {
      return res.status(400).json({
        message: "questionId, userAnswer and userId are required",
      });
    }

    // Fetch question
    const question = await twelve.findById(questionId);
    if (!question) {
      return res.status(404).json({ message: "Question not found" });
    }

    // Compare answers
    const isCorrect =
      question.correctAnswer.trim().toLowerCase() ===
      userAnswer.trim().toLowerCase();

    // ✅ Find active session
    const session = await RandomQuestions.findOne({ userId, isActive: true });
    if (!session) {
      return res.status(404).json({ message: "Active session not found" });
    }

    // ✅ Locate question in session (in any section)
    const updateQuestionStatus = (section) => {
      const idx = section.findIndex(
        (q) => q.questionId.toString() === questionId.toString()
      );
      if (idx !== -1) {
        section[idx].status = isCorrect ? "correct" : "incorrect";
        section[idx].attempts += 1;
        section[idx].answeredAt = new Date();
        return idx;
      }
      return -1;
    };

    let updatedIndex = updateQuestionStatus(session.Section1);
    let sectionNumber = 1;

    if (updatedIndex === -1) {
      updatedIndex = updateQuestionStatus(session.Section2);
      sectionNumber = 2;
    }
    if (updatedIndex === -1) {
      updatedIndex = updateQuestionStatus(session.Section3);
      sectionNumber = 3;
    }

    if (updatedIndex === -1) {
      return res.status(404).json({
        message: "Question not found in user session",
      });
    }

    // ✅ Update progress
    session.progress.completedQuestions += 1;
    if (isCorrect) session.progress.correctAnswers += 1;
    else session.progress.wrongAnswers += 1;

    // ✅ Move currentQuestion to the next one
    let nextSection = sectionNumber;
    let nextIndex = updatedIndex + 1;

    if (nextSection === 1 && nextIndex >= session.Section1.length) {
      nextSection = 2;
      nextIndex = 0;
    }
    if (nextSection === 2 && nextIndex >= session.Section2.length) {
      nextSection = 3;
      nextIndex = 0;
    }
    if (nextSection === 3 && nextIndex >= session.Section3.length) {
      // ✅ All completed
      session.progress.status = "completed";
      session.isActive = false;
    } else {
      session.progress.status = "in_progress";
    }

    // ✅ Save currentQuestion pointer
    session.currentQuestion = {
      section: nextSection,
      questionIndex: nextIndex,
      questionId:
        nextSection === 1
          ? session.Section1[nextIndex]?._id
          : nextSection === 2
            ? session.Section2[nextIndex]?._id
            : session.Section3[nextIndex]?._id,
    };

    await session.save();

    return res.status(200).json({
      message: "Answer checked and session updated",
      questionId: question._id,
      userAnswer,
      isCorrect,
      correctAnswer: isCorrect ? undefined : question.correctAnswer,
      progress: session.progress,
      currentQuestion: session.currentQuestion,
    });
  } catch (error) {
    console.error("Error checking answer by id:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};




// ✅ getRandomQuestion
export const getRandomQuestion = async (req, res) => {
  try {
    const { userId, subject } = req.body;

    if (!subject) {
      return res.status(400).json({ message: "Subject is required" });
    }

    const questionCount = 10;
    const totalNeeded = questionCount * 3;

    // 🔹 1. Resume if session exists
    let existingSession = await RandomQuestions.findOne({
      userId,
      subject,
      isActive: true,
    });

    if (existingSession) {
      // Load question details
      const allIds = [
        ...existingSession.Section1.map((q) => q.questionId),
        ...existingSession.Section2.map((q) => q.questionId),
        ...existingSession.Section3.map((q) => q.questionId),
      ];

      const fullQuestions = await twelve
        .find({ _id: { $in: allIds } })
        .select("_id question options correctAnswer");

      const mapWithDetails = (section) =>
        section.map((q) => {
          const details = fullQuestions.find(
            (fq) => fq._id.toString() === q.questionId.toString()
          );
          return {
            ...q.toObject(),
            question: details?.question,
            options: details?.options,
            correctAnswer: details?.correctAnswer,
          };
        });

      let current;
      if (existingSession.currentQuestion?.section === 1) {
        current =
          existingSession.Section1[existingSession.currentQuestion.questionIndex];
      } else if (existingSession.currentQuestion?.section === 2) {
        current =
          existingSession.Section2[existingSession.currentQuestion.questionIndex];
      } else if (existingSession.currentQuestion?.section === 3) {
        current =
          existingSession.Section3[existingSession.currentQuestion.questionIndex];
      }

      return res.status(200).json({
        message: "Resuming previous session",
        subject,
        Section1: mapWithDetails(existingSession.Section1),
        Section2: mapWithDetails(existingSession.Section2),
        Section3: mapWithDetails(existingSession.Section3),
        currentQuestion: current ? mapWithDetails([current])[0] : null,
        progress: existingSession.progress,
      });
    }

    // 🔹 2. Start a new session
    const randomQuestions = await twelve.aggregate([
      { $match: { subject } },
      { $sample: { size: totalNeeded } },
    ]);

    if (!randomQuestions.length) {
      return res.status(404).json({ message: "No questions found for this subject." });
    }

    const Section1 = randomQuestions.slice(0, questionCount).map((q, index) => ({
      questionId: q._id,
      number: index + 1,
      status: "pending",
      attempts: 0,
      question: q.question,
      options: q.options,
      correctAnswer: q.correctAnswer,
    }));

    const Section2 = randomQuestions
      .slice(questionCount, questionCount * 2)
      .map((q, index) => ({
        questionId: q._id,
        number: index + 1,
        status: "pending",
        attempts: 0,
        question: q.question,
        options: q.options,
        correctAnswer: q.correctAnswer,
      }));

    const Section3 = randomQuestions.slice(questionCount * 2).map((q, index) => ({
      questionId: q._id,
      number: index + 1,
      status: "pending",
      attempts: 0,
      question: q.question,
      options: q.options,
      correctAnswer: q.correctAnswer,
    }));

    const newSession = new RandomQuestions({
      userId,
      subject,
      Section1,
      Section2,
      Section3,
      currentQuestion: { section: 1, questionIndex: 0, questionId: Section1[0].questionId },
      isActive: true,
      progress: {
        completedQuestions: 0,
        correctAnswers: 0,
        wrongAnswers: 0,
        status: "not_started",
      },
    });

    await newSession.save();

    return res.status(201).json({
      message: "New session started",
      subject,
      Section1,
      Section2,
      Section3,
      currentQuestion: Section1[0],
      progress: newSession.progress,
    });
  } catch (error) {
    console.error("Error fetching question:", error);
    res.status(500).json({ message: "Error fetching question", error });
  }
};


export const getMissedQuestions = async (req, res) => {
  try {
    const { userId, subject } = req.body;

    if (!userId || !subject) {
      return res.status(400).json({ message: "User ID and subject are required" });
    }

    // 1. Get user's random session
    const randomSession = await RandomQuestions.findOne({ userId, subject, isActive: true });
    if (!randomSession) {
      return res.status(404).json({ message: "No active random session found" });
    }

    // 2. Collect only final incorrect + attempted > 1
    const allQuestions = [
      ...randomSession.Section1,
      ...randomSession.Section2,
      ...randomSession.Section3,
    ];

    const missed = allQuestions.filter(
      (q) => q.status === "incorrect" && q.attempts > 1 // ✅ only incorrect in final status
    );

    if (!missed.length) {
      return res.status(200).json({ message: "No missed questions found", questions: [] });
    }

    // 3. Fetch full details
    const questionIds = missed.map((q) => q.questionId);
    const questionDocs = await twelve.find({ _id: { $in: questionIds } })
      .select("_id question options correctAnswer");

    const detailedMissed = missed.map((q, i) => {
      const details = questionDocs.find(
        (d) => d._id.toString() === q.questionId.toString()
      );
      return {
        questionId: q.questionId,
        index: i + 1,
        attempts: q.attempts,
        answeredAt: q.answeredAt,
        status: "incorrect",
        question: details?.question,
        options: details?.options,
        correctAnswer: details?.correctAnswer,
      };
    });

    // 4. Save in MissedQuestions schema (upsert for user)
    let missedSession = await MissedQuestions.findOneAndUpdate(
      { userId, subject, isActive: true },
      {
        userId,
        subject,
        questions: detailedMissed,
        currentQuestion: {
          index: 0,
          questionId: detailedMissed[0].questionId,
        },
        progress: {
          completedQuestions: 0,
          correctAnswers: 0,
          wrongAnswers: 0,
          status: "in_progress",
        },
        isActive: true,
      },
      { upsert: true, new: true }
    );

    // 5. Current question details
    const currentQuestion = detailedMissed[0] || null;

    return res.status(200).json({
      message: "Missed questions fetched successfully",
      subject,
      questions: detailedMissed,
      currentQuestion,
      progress: missedSession.progress,
    });
  } catch (error) {
    console.error("Error fetching missed questions:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

export const createRandomQuestions = async (req, res) => {
  try {
    const { userId, subject } = req.body;

    if (!userId || !subject) {
      return res.status(400).json({ message: "User ID and subject are required" });
    }

    // ✅ Check if there's an active session for the same subject
    const existingActiveSession = await RandomQuestions.findOne({
      userId,
      subject,
      isActive: true,
    });

    if (existingActiveSession) {
      return res.status(400).json({
        message: "An active session already exists for this subject. Please complete it before starting a new one.",
        existingActiveSession
      });
    }

    // ✅ Check if there's an active session for other subjects, allow creating new one
    // No need to block if it's another subject

    const questionCount = 10; // 🔹 5 from each section
    const totalNeeded = questionCount * 3;

    // Fetch random questions for subject
    const randomQuestions = await twelve.aggregate([
      { $match: { subject } },
      { $sample: { size: totalNeeded } },
      {
        $project: {
          _id: 1,
          question: 1,
          options: 1,
          correctAnswer: 1,
          difficulty: 1,
          topic: 1,
        },
      },
    ]);

    if (randomQuestions.length < totalNeeded) {
      return res.status(404).json({
        message: `Not enough questions found. Required ${totalNeeded}, found ${randomQuestions.length}`,
      });
    }

    // Divide into 3 sections
    const section1 = randomQuestions.slice(0, questionCount).map((q, i) => ({
      questionId: q._id,
      number: i + 1,
    }));

    const section2 = randomQuestions.slice(questionCount, questionCount * 2).map((q, i) => ({
      questionId: q._id,
      number: i + 1,
    }));

    const section3 = randomQuestions.slice(questionCount * 2).map((q, i) => ({
      questionId: q._id,
      number: i + 1,
    }));

    // Save new session
    const newSession = new RandomQuestions({
      userId,
      subject,
      Section1: section1,
      Section2: section2,
      Section3: section3,
      currentQuestion: {
        section: 1,
        questionIndex: 0,
        questionId: section1[0].questionId,
      },
      isActive: true,
      progress: { status: "in_progress" },
    });

    await newSession.save();

    return res.status(201).json({
      message: "Random question session created successfully",
      sessionId: newSession._id,
    });
  } catch (error) {
    console.error("Error creating random questions:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};



export const GetRandomQuestions = async (req, res) => {
  try {
    const { userId } = req.params;

    const session = await RandomQuestions.findOne({ userId, isActive: true })
      .populate({
        path: "Section1.questionId",
        select: "question options correctAnswer",
      })
      .populate({
        path: "Section2.questionId",
        select: "question options correctAnswer",
      })
      .populate({
        path: "Section3.questionId",
        select: "question options correctAnswer",
      })
      .populate("currentQuestion.questionId", "question options correctAnswer");

    if (!session) {
      return res.status(404).json({ message: "No active session found" });
    }

    // 🔹 Normalize options before sending
    const normalizeOptions = (options) =>
      options.map((opt) => {
        if (typeof opt === "string") return { text: opt };
        if (opt && typeof opt === "object") {
          if (opt.text) return opt;
          if (opt.diagramUrl) return opt;
          const joined = Object.keys(opt)
            .filter((k) => !isNaN(k))
            .sort((a, b) => a - b)
            .map((k) => opt[k])
            .join("");
          return { text: joined };
        }
        return { text: "" };
      });

    const mapSection = (section) =>
      section.map((q) => ({
        ...q.toObject(),
        question: q.questionId?.question,
        options: normalizeOptions(q.questionId?.options || []),
        correctAnswer: q.questionId?.correctAnswer,
      }));

    res.status(200).json({
      message: "Session retrieved",
      subject: session.subject,
      Section1: mapSection(session.Section1),
      Section2: mapSection(session.Section2),
      Section3: mapSection(session.Section3),
      currentQuestion: {
        ...session.currentQuestion.toObject(),
        question: session.currentQuestion.questionId?.question,
        options: normalizeOptions(session.currentQuestion.questionId?.options || []),
        correctAnswer: session.currentQuestion.questionId?.correctAnswer,
      },
      progress: session.progress,
    });
  } catch (error) {
    console.error("Error in getRandomSession:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};




