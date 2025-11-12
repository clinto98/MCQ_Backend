import PreviousQuestionPaper from "../Models/QuestionPaperModel.js";
import PreviousyearQuestions from "../Models/Previousyearquestion.js";

// Generate a previous-year session with 3 sections based on filters
export const generatePreviousYearSession = async (req, res) => {
  try {
    const {
      userId,
      subject,
      syllabus,
      standard,
      years = [],
      units = [],
      totalQuestions = 10,
      includeFrequentlyAsked,
      includeAttempted,
    } = req.body;

    if (!userId || !subject) {
      return res.status(400).json({ message: "userId and subject are required" });
    }

    // 🔎 Step 1: Check if ANY active session exists for this user/subject/syllabus/standard
    const activeSession = await PreviousyearQuestions.findOne({
      userId,
      subject,
      syllabus,
      standard,
      isActive: true,
    });

    if (activeSession) {
      return res.status(200).json({
        message: "Active session already exists",
        sessionId: activeSession._id,
        perSection: Math.max(1, Math.floor(totalQuestions / 3)),
        totalQuestions:
          activeSession.Section1.length +
          activeSession.Section2.length +
          activeSession.Section3.length,
        currentQuestion: activeSession.currentQuestion,
        preferences: activeSession.preferences,
      });
    }

    // 🔹 Step 2: If no active session, then create a new one
    const perSection = Math.max(1, Math.floor(totalQuestions / 3));
    const targetTotal = perSection * 3;

    const match = { subject, syllabus, standard };
    if (years?.length) match.examYear = { $in: years };
    if (units?.length) match.unit = { $in: units };

    console.log(match)

    const papers = await PreviousQuestionPaper.find(match)
      .select("questions examYear unit difficulty subject syllabus standard")
      .lean();
console.log(papers)
    let pool = [];
    papers.forEach((paper) => {
      let questions = paper.questions;
      if (includeFrequentlyAsked) {
        questions = questions.filter((q) => q.FrequentlyAsked === true);
      }
      questions.forEach((q, idx) => {
        pool.push({ paperId: paper._id, idx, q });
      });
    });

    if (includeAttempted) {
      const hist = await PreviousyearQuestions.find({ userId, subject })
        .select("Section1 Section2 Section3")
        .lean();
      const attemptedSet = new Set();
      hist.forEach((s) => {
        [...s.Section1, ...s.Section2, ...s.Section3].forEach((x) => {
          attemptedSet.add(`${x.questionId.toString()}_${x.paperQuestionIndex}`);
        });
      });
      pool = pool.filter(
        (p) => !attemptedSet.has(`${p.paperId.toString()}_${p.idx}`)
      );
    }

    if (pool.length === 0) {
      return res.status(404).json({ message: "No questions matched given filters" });
    }

    pool = shuffleArray(pool);

    const chosen = pool.slice(0, targetTotal);
    const s1 = chosen.slice(0, perSection);
    const s2 = chosen.slice(perSection, perSection * 2);
    const s3 = chosen.slice(perSection * 2, perSection * 3);

    const Section1 = s1.map((item, i) => ({
      questionId: item.paperId,
      paperQuestionIndex: item.idx,
      number: i + 1,
      status: "pending",
      attempts: 0,
    }));
    const Section2 = s2.map((item, i) => ({
      questionId: item.paperId,
      paperQuestionIndex: item.idx,
      number: i + 1,
      status: "pending",
      attempts: 0,
    }));
    const Section3 = s3.map((item, i) => ({
      questionId: item.paperId,
      paperQuestionIndex: item.idx,
      number: i + 1,
      status: "pending",
      attempts: 0,
    }));

    const currentQuestion = {
      section: 1,
      questionIndex: 0,
      questionId: Section1[0]?.questionId || null,
    };

    const session = new PreviousyearQuestions({
      userId,
      subject,
      syllabus,
      standard,
      Section1,
      Section2,
      Section3,
      currentQuestion,
      progress: {
        completedQuestions: 0,
        correctAnswers: 0,
        wrongAnswers: 0,
        status: "not_started",
      },
      preferences: {
        years,
        units,
        includeFrequentlyAsked: !!includeFrequentlyAsked,
        includeAttempted: !!includeAttempted,
        totalQuestions,
      },
      isActive: true,
    });

    await session.save();

    return res.status(201).json({
      message: "Previous year session created",
      sessionId: session._id,
      perSection,
      totalQuestions: targetTotal,
      currentQuestion,
    });
  } catch (error) {
    console.error("Error generating PYQ session:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};



// Get a fully populated session (with actual question texts/options)
export const getPreviousYearSession = async (req, res) => {
  try {

<<<<<<< HEAD
    const { userId, subject, syllabus, standard } = req.body;
=======
        if (!userId) {
            return res.status(400).json({ message: "userId is required" });
        }
        if (!subject || !syllabus || !standard) {
            return res.status(400).json({ message: "userId, subject, syllabus and standard are required" });
        }
        const session = await PreviousyearQuestions.findOne({ userId, isActive: true , subject })
            .lean();
        if (!session) return res.status(404).json({ message: "No active session found" });
>>>>>>> ee0aaee24a7a4314b703244821dbf961e62cd899

    if (!userId) {
      return res.status(400).json({ message: "userId is required" });
    }
    if (!subject || !syllabus || !standard) {
      return res.status(400).json({ message: "userId, subject, syllabus and standard are required" });
    }
    const session = await PreviousyearQuestions.findOne({ userId, isActive: true })
      .lean();
    if (!session) return res.status(404).json({ message: "No active session found" });

    // collect paper ids
    const paperIds = [
      ...session.Section1.map((x) => x.questionId),
      ...session.Section2.map((x) => x.questionId),
      ...session.Section3.map((x) => x.questionId),
    ];
    const unique = [...new Set(paperIds.map((id) => id.toString()))];
    const papers = await PreviousQuestionPaper.find({ _id: { $in: unique } }).lean();

    const indexById = new Map(papers.map((p) => [p._id.toString(), p]));

    const mapSection = (arr) =>
      arr.map((x) => {
        const paper = indexById.get(x.questionId.toString());
        const pq = paper?.questions?.[x.paperQuestionIndex];
        return {
          ...x,
          question: pq?.question,
          options: pq?.options || [],
          correctAnswer: pq?.correctAnswer,
        };
      });

    return res.status(200).json({
      message: "Session retrieved",
      Section1: mapSection(session.Section1),
      Section2: mapSection(session.Section2),
      Section3: mapSection(session.Section3),
      currentQuestion: session.currentQuestion,
      progress: session.progress,
    });
  } catch (error) {
    console.error("Error getting PYQ session:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Check answer by pointing to paper + index
export const checkPreviousYearAnswer = async (req, res) => {
  try {
<<<<<<< HEAD
    const { questionId } = req.params;
=======
    const { questionId } = req.params; // this is question._id inside paper.questions[]
>>>>>>> ee0aaee24a7a4314b703244821dbf961e62cd899
    const { userId, userAnswer } = req.body;

    if (!userId || !questionId || !userAnswer) {
      return res.status(400).json({
        message: "userId, quizId, and userAnswer are required",
      });
    }

<<<<<<< HEAD
    // ✅ 1. Find the paper that contains this question
    const paperDocument = await PreviousQuestionPaper.findOne({
      "questions._id": questionId,
    });

    console.log("paer",paperDocument);
    

    if (!paperDocument) {
      return res.status(404).json({ message: "Question not found in any PYQ paper" });
    }

    // ✅ 2. Extract the question object
    const pquestion = paperDocument.questions.find(
      (q) => q._id.toString() === questionId.toString()
    );

    if (!pquestion) {
      return res.status(404).json({ message: "Question data missing in paper" });
    }

    // ✅ 3. Extract correct answer text safely
    const correctAnswerText = (
      (pquestion.correctAnswer?.text || pquestion.correctAnswer || "")
        .trim()
        .toLowerCase()
    );
    const userAnswerText = userAnswer.trim().toLowerCase();

    const isCorrect = correctAnswerText === userAnswerText;

    // ✅ 4. Find the active session
=======
    // ✅ Find active PYQ session
>>>>>>> ee0aaee24a7a4314b703244821dbf961e62cd899
    const session = await PreviousyearQuestions.findOne({ userId, isActive: true });
    if (!session) {
      return res.status(404).json({ message: "Active session not found" });
    }

<<<<<<< HEAD
    // ✅ 5. Locate question in session mapping
    const sectionKeys = ["Section1", "Section2", "Section3"];
    let sectionKeyFound = null;
    let questionIndex = -1;

    for (const key of sectionKeys) {
      questionIndex = session[key].findIndex(
        (q) =>
          q.questionId.toString() === questionId.toString() ||
          q.paperQuestionId?.toString() === questionId.toString()
      );

      if (questionIndex !== -1) {
        sectionKeyFound = key;
        break;
      }
    }

    if (!sectionKeyFound) {
      return res.status(404).json({
        message:
          "Question not found in session mapping — check if your session stores correct questionId",
      });
    }

    // ✅ 6. Update session question
    const qRef = session[sectionKeyFound][questionIndex];
    qRef.status = isCorrect ? "correct" : "incorrect";
    qRef.attempts = (qRef.attempts || 0) + 1;
    qRef.answeredAt = new Date();
    qRef.userAnswer = userAnswer;
=======
    // ✅ Flatten session questions
    const allQuestions = [
      ...session.Section1.map((q) => ({ ...q.toObject(), section: 1 })),
      ...session.Section2.map((q) => ({ ...q.toObject(), section: 2 })),
      ...session.Section3.map((q) => ({ ...q.toObject(), section: 3 })),
    ];

    // ✅ Find question reference inside session
    const target = allQuestions.find((q) => q.questionId.toString() === questionId);
    if (!target) {
      return res.status(404).json({ message: "Question not found in session" });
    }

    // ✅ Fetch the question from the paper using nested query
    const paperDoc = await PreviousQuestionPaper.findById( "questionId");
console.log(paperDoc);

    if (!paperDoc) {
      return res.status(404).json({ message: "Question not found in paper" });
    }

    // ✅ Compare answer
    const isCorrect =
      pquestion.correctAnswer.trim().toLowerCase() ===
      userAnswer.trim().toLowerCase();

    // ✅ Update session section entry
    const sectionKey = `Section${target.section}`;
    const idx = session[sectionKey].findIndex(
      (q) => q.questionId.toString() === questionId
    );

    session[sectionKey][idx].status = isCorrect ? "correct" : "incorrect";
    session[sectionKey][idx].attempts += 1;
    session[sectionKey][idx].answeredAt = new Date();
    session[sectionKey][idx].userAnswer = userAnswer;
>>>>>>> ee0aaee24a7a4314b703244821dbf961e62cd899

    // ✅ 7. Update session progress
    session.progress.completedQuestions += 1;

    if (isCorrect) {
      session.progress.correctAnswers += 1;
      session.progress.correctAnswerList.push(questionId);
    } else {
      session.progress.wrongAnswers += 1;
      session.progress.wrongAnswerList.push({
        questionId,
        selectedOption: userAnswer,
        answeredAt: new Date(),
      });
    }

<<<<<<< HEAD
    // ✅ 8. Move question pointer
    let { section, questionIndex: idx } = session.currentQuestion;
    idx++;
=======
    // ✅ Move current question pointer like your other controllers
    let { section, questionIndex } = session.currentQuestion;
    questionIndex++;
>>>>>>> ee0aaee24a7a4314b703244821dbf961e62cd899

    if (section === 1 && questionIndex >= session.Section1.length) {
      section = 2;
      questionIndex = 0;
    }
<<<<<<< HEAD

    if (section > 3 || !session[`Section${section}`] || session[`Section${section}`].length === 0) {
=======
    if (section === 2 && questionIndex >= session.Section2.length) {
      section = 3;
      questionIndex = 0;
    }
    if (section === 3 && questionIndex >= session.Section3.length) {
      // ✅ Session complete
>>>>>>> ee0aaee24a7a4314b703244821dbf961e62cd899
      session.progress.status = "completed";
      session.isActive = false;
      session.currentQuestion = { section: null, questionIndex: null, questionId: null };
    } else {
      session.progress.status = "in_progress";
      session.currentQuestion = {
        section,
        questionIndex,
        questionId: session[`Section${section}`][questionIndex].questionId,
      };
    }

    await session.save();

    // ✅ 9. Respond
    return res.status(200).json({
<<<<<<< HEAD
      message: "Answer checked successfully",
      paperId: paperDocument._id,
      questionId: pquestion._id,
=======
      message: "Answer checked",
      questionId,
>>>>>>> ee0aaee24a7a4314b703244821dbf961e62cd899
      userAnswer,
      isCorrect,
      correctAnswer: isCorrect ? undefined : correctAnswerText,
      progress: session.progress,
      currentQuestion: session.currentQuestion,
    });
  } catch (error) {
    console.error("Error checking PYQ answer:", error);
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};




<<<<<<< HEAD

=======
>>>>>>> ee0aaee24a7a4314b703244821dbf961e62cd899
function shuffleArray(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}



export const GetAllUnits = async (req, res) => {
  try {
    const { subject, syllabus, standard } = req.body;
    if (!subject || !syllabus || !standard) {
      return res.status(400).json({ message: "subject, syllabus and standard are required" });
    }
    const units = await PreviousQuestionPaper.distinct("unit", { subject, syllabus, standard });
    res.status(200).json({ message: "Units fetched successfully", units });
  } catch (error) {
    console.error("Error retrieving topics:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
}