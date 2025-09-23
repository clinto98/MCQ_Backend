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
            years = [], // [2024, 2023]
            units = [], // paper.unit filter
            totalQuestions = 10, // across all sections
            includeFrequentlyAsked,
            includeAttempted,
        } = req.body;

        if (!userId || !subject) {
            return res.status(400).json({ message: "userId and subject are required" });
        }

        const perSection = Math.max(1, Math.floor(totalQuestions / 3));
        const targetTotal = perSection * 3; // normalize to 3 sections

        // Base match for papers
        const match = {
            subject,
            syllabus,
            standard,
        };
        if (years?.length) match.examYear = { $in: years };
        if (units?.length) match.unit = { $in: units };
        // if (includeFrequentlyAsked) match.FrequentlyAsked = true;


        console.log("match", match);


        // Collect pool of question references {paperId, idx, question}
        // Collect pool of question references {paperId, idx, question}
        const papers = await PreviousQuestionPaper.find(match)
            .select("questions examYear unit difficulty subject syllabus standard")
            .lean();

            console.log("papers", papers);
            

        let pool = [];
        papers.forEach((paper) => {
            let questions = paper.questions;

            if (includeFrequentlyAsked) {
                // Filter only frequently asked questions if needed
                questions = questions.filter(q => q.FrequentlyAsked === true);
            }

            questions.forEach((q, idx) => {
                pool.push({ paperId: paper._id, idx, q });
            });
        });

        console.log("pooll", pool);


        // If includeAttempted, restrict pool to user's previously attempted questions
        if (includeAttempted) {
            const hist = await PreviousyearQuestions.find({ userId, subject })
                .select("Section1 Section2 Section3")
                .lean();
            const attemptedSet = new Set();
            hist.forEach((s) => {
                [...s.Section1, ...s.Section2, ...s.Section3].forEach((x) => {
                    // key on paperId + paperQuestionIndex
                    attemptedSet.add(`${x.questionId.toString()}_${x.paperQuestionIndex}`);
                });
            });
            pool = pool.filter((p) => attemptedSet.has(`${p.paperId.toString()}_${p.idx}`));
        }

        if (pool.length === 0) {
            return res.status(404).json({ message: "No questions matched given filters" });
        }

        // shuffle
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

        // deactivate current active
        await PreviousyearQuestions.updateMany({ userId, subject, isActive: true }, { isActive: false });

        // create session
        const session = new PreviousyearQuestions({
            userId,
            subject,
            Section1,
            Section2,
            Section3,
            currentQuestion: {
                section: 1,
                questionIndex: 0,
                questionId: Section1[0]?.questionId || null,
            },
            progress: {
                completedQuestions: 0,
                correctAnswers: 0,
                wrongAnswers: 0,
                status: "not_started",
            },
            isActive: true,
        });

        await session.save();

        return res.status(201).json({
            message: "Previous year session created",
            sessionId: session._id,
            perSection,
            totalQuestions: targetTotal,
        });
    } catch (error) {
        console.error("Error generating PYQ session:", error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

// Get a fully populated session (with actual question texts/options)
export const getPreviousYearSession = async (req, res) => {
    try {
        const { userId } = req.params;
        const { subject , syllabus , standard  } = req.body;

        if (!userId) {
            return res.status(400).json({ message: "userId is required" });
        }
        if (!subject || !syllabus || !standard) {
            return res.status(400).json({ message: "userId, subject, syllabus and standard are required" });
        }
        const session = await PreviousyearQuestions.findOne({ userId , isActive: true })
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
        const { userId, paperId, paperQuestionIndex, userAnswer } = req.body;
        if (!userId || !paperId || paperQuestionIndex === undefined || !userAnswer) {
            return res.status(400).json({ message: "userId, paperId, paperQuestionIndex, userAnswer required" });
        }

        const paper = await PreviousQuestionPaper.findById(paperId).lean();
        if (!paper) return res.status(404).json({ message: "Paper not found" });
        const pq = paper.questions?.[paperQuestionIndex];
        if (!pq) return res.status(404).json({ message: "Question not found in paper" });

        const isCorrect = pq.correctAnswer.trim().toLowerCase() === String(userAnswer).trim().toLowerCase();

        // locate active session
        const session = await PreviousyearQuestions.findOne({ userId, isActive: true });
        if (!session) return res.status(404).json({ message: "Active session not found" });

        const updateInSection = (sectionArr) => {
            const idx = sectionArr.findIndex((x) => x.questionId.toString() === paperId && x.paperQuestionIndex === Number(paperQuestionIndex));
            if (idx !== -1) {
                sectionArr[idx].status = isCorrect ? "correct" : "incorrect";
                sectionArr[idx].attempts += 1;
                sectionArr[idx].answeredAt = new Date();
                return idx;
            }
            return -1;
        };

        let sec = 1; let idx = updateInSection(session.Section1);
        if (idx === -1) { sec = 2; idx = updateInSection(session.Section2); }
        if (idx === -1) { sec = 3; idx = updateInSection(session.Section3); }
        if (idx === -1) return res.status(404).json({ message: "Question not found in session" });

        session.progress.completedQuestions += 1;
        if (isCorrect) session.progress.correctAnswers += 1; else session.progress.wrongAnswers += 1;

        // advance pointer
        let nextSection = sec; let nextIndex = idx + 1;
        if (nextSection === 1 && nextIndex >= session.Section1.length) { nextSection = 2; nextIndex = 0; }
        if (nextSection === 2 && nextIndex >= session.Section2.length) { nextSection = 3; nextIndex = 0; }
        if (nextSection === 3 && nextIndex >= session.Section3.length) { session.progress.status = "completed"; session.isActive = false; }
        else { session.progress.status = "in_progress"; }

        session.currentQuestion = {
            section: nextSection,
            questionIndex: nextIndex,
            questionId:
                nextSection === 1 ? session.Section1[nextIndex]?.questionId :
                    nextSection === 2 ? session.Section2[nextIndex]?.questionId :
                        session.Section3[nextIndex]?.questionId,
        };

        await session.save();

        return res.status(200).json({
            message: "Answer checked",
            isCorrect,
            correctAnswer: isCorrect ? undefined : pq.correctAnswer,
            progress: session.progress,
            currentQuestion: session.currentQuestion,
        });
    } catch (error) {
        console.error("Error checking PYQ answer:", error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

function shuffleArray(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}
