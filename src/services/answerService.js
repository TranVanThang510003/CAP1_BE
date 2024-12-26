const { connectToDB } = require('../config/db');

exports.saveUserAnswers = async (userId, answers) => {
  const pool = await connectToDB();

  const query = `
    INSERT INTO [dbo].[ANSWER] (ANSWER_NAME, QUESTION_ID, USER_ID)
    VALUES (@AnswerName, @QuestionId, @UserId)
  `;

  const transaction = new sql.Transaction(pool);
  try {
    await transaction.begin();
    const request = new sql.Request(transaction);

    for (const answer of answers) {
      await request
        .input('AnswerName', sql.VarChar, answer.ANSWER_NAME)
        .input('QuestionId', sql.Int, answer.QUESTION_ID)
        .input('UserId', sql.Int, userId)
        .query(query);
    }

    await transaction.commit();
  } catch (error) {
    await transaction.rollback();
    throw new Error('Error saving answers: ' + error.message);
  }
};
