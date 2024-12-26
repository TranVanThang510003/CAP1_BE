const db = require('../models');

exports.saveUserAnswers = async (userId, answers) => {
  const answerData = answers.map(answer => ({
    userId,
    questionId: answer.questionId,
    answer: answer.answer,
  }));

  await db.UserAnswer.bulkCreate(answerData);
};
