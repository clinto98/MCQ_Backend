import twelve from "../Models/McqModel.js";
import PracticePlan from "../Models/PraticePlanModel.js";
import mongoose from "mongoose";
import RandomQuestions from '../Models/RandomquestionsModel.js'

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

    const questionId = req.params.id
    const { userAnswer } = req.body;


    if (!questionId || !userAnswer) {
      return res.status(400).json({
        message: "questionId and userAnswer are required",
      });
    }

    // Fetch question by id
    const question = await twelve.findById(questionId);
    if (!question) {
      return res.status(404).json({ message: "Question not found" });
    }

    // Compare answers (case-insensitive & trimmed)
    const isCorrect =
      question.correctAnswer.trim().toLowerCase() ===
      userAnswer.trim().toLowerCase();

    // Response with full question data (optional, can exclude correctAnswer if needed)
    return res.status(200).json({
      message: "Answer checked successfully",
      questionId: question._id,
      question: question.question,
      options: question.options,
      userAnswer,
      isCorrect,
      correctAnswer: isCorrect ? undefined : question.correctAnswer, // hide if correct
    });
  } catch (error) {
    console.error("Error checking answer by id:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};




export const getRandomQuestion = async (req, res) => {
  try {
    console.log("dataa");

    const { userId, subject } = req.body;
    console.log(req.body);

    if (!subject) {
      return res.status(400).json({ message: "Subject is required" });
    }

    const questionCount = 10;
    const totalNeeded = questionCount * 3 - 1;


    // Fetch random questions
    const matchedQuestions = await twelve.aggregate([
      {
        $match: {
          subject: subject, // avoid duplicate
        },
      },
      { $sample: { size: totalNeeded } },
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
        message: `Not enough questions found for subject ${subject}. Required ${totalNeeded}, found ${matchedQuestions.length}`,
      });
    }

    // Insert fixed question into section1
    const section1Questions = [...matchedQuestions.slice(0, questionCount - 1)];
    const section2Questions = matchedQuestions.slice(questionCount - 1, questionCount * 2 - 1);
    const section3Questions = matchedQuestions.slice(questionCount * 2 - 1, questionCount * 3 - 1);

    const section1 = section1Questions.map((q, i) => ({
      questionId: q._id,
      number: i + 1,
      question: q.question,
      options: q.options,
      correctAnswer: q.correctAnswer,
    }));

    const section2 = section2Questions.map((q, i) => ({
      questionId: q._id,
      number: i + 1,
      question: q.question,
      options: q.options,
      correctAnswer: q.correctAnswer,
    }));

    const section3 = section3Questions.map((q, i) => ({
      questionId: q._id,
      number: i + 1,
      question: q.question,
      options: q.options,
      correctAnswer: q.correctAnswer,
    }));

    const randomQuestionsDoc = new RandomQuestions({
      userId,
      subject,
      Section1: section1,
      Section2: section2,
      Section3: section3,
      currentQuestion: {
        section: 1,
        questionIndex: 0,
        questionId: section1.length > 0 ? section1[0].questionId : null,
      },
      progress: {
        completedQuestions: 0,
        correctAnswers: 0,
        wrongAnswers: 0,
        status: "not_started",
      },
      isActive: true,
    });

    await randomQuestionsDoc.save();

    return res.status(200).json({
      message: "Random questions retrieved successfully",
      subject: subject,
      Section1: section1,
      Section2: section2,
      Section3: section3,
    });
  } catch (error) {
    console.error("Error fetching random questions: ", error);
    return res
      .status(500)
      .json({ message: "Server error", error: error.message });
  }
};


export const MissedQuestions = async (req, res) => {

  try {



  } catch (error) {


  }

}



export const MockExamQuiz = async (req, res) => {

  try {


  } catch (error) {


  }

}


export const TimedQuiz = async (req, res) => {

  try {


  } catch (error) {


  }
}


