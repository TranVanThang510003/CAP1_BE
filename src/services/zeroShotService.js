const { connectToDB } = require('../config/db');
const sql = require('mssql');
const axios = require('axios');

class ZeroShotService {
  // Save user answers to the database
  async saveUserAnswers(userId, answers) {
    const pool = await connectToDB(); // Sử dụng connectToDB để lấy pool kết nối

    const query = `
      INSERT INTO [dbo].[ANSWER] (ANSWER_NAME, QUESTION_ID, USER_ID)
      VALUES (@AnswerName, @QuestionId, @UserId)
    `;

    const transaction = new sql.Transaction(pool);
    try {
      await transaction.begin();
      const request = new sql.Request(transaction);

      // Insert answers into the database
      for (const answer of answers) {
        await request
          .input('AnswerName', sql.VarChar, answer.answerName)
          .input('QuestionId', sql.Int, answer.questionId)
          .input('UserId', sql.Int, userId)
          .query(query);
      }

      await transaction.commit();
      return { message: 'User answers saved successfully' };
    } catch (err) {
      await transaction.rollback();
      throw new Error('Error saving user answers: ' + err.message);
    }
  }

  // Fetch user answers and classify them using the AI model
  async classifyUserAnswers(userId) {
    const pool = await connectToDB(); // Sử dụng connectToDB để lấy pool kết nối

    const query = `
      SELECT a.ANSWER_NAME
      FROM [dbo].[ANSWER] a
      WHERE a.USER_ID = @UserId
    `;

    try {
      const result = await pool.request().input('UserId', sql.Int, userId).query(query);
      const userAnswers = result.recordset.map(row => row.ANSWER_NAME);

      // Send answers to the Python AI classifier
      const response = await axios.post('http://127.0.0.1:5000/classify', {
        responses: userAnswers,
      });

      return response.data; // Return classification result
    } catch (err) {
      throw new Error('Error classifying user answers: ' + err.message);
    }
  }

  // Recommend tours based on classification results
  async recommendTours(classificationResult) {
    const pool = await connectToDB(); // Sử dụng connectToDB để lấy pool kết nối

    const query = `
      SELECT t.TOUR_ID, t.TOUR_NAME, t.DESCRIPTION, t.HIGHLIGHTS
      FROM [dbo].[TOUR] t
      INNER JOIN [dbo].[TOUR_TYPE] tt ON t.TOUR_TYPE_ID = tt.TOUR_TYPE_ID
      WHERE tt.TOUR_TYPE_NAME = @Category
    `;

    try {
      const result = await pool
        .request()
        .input('Category', sql.NVarChar, classificationResult.category)
        .query(query);

      return result.recordset; // Return the list of recommended tours
    } catch (err) {
      throw new Error('Error fetching recommended tours: ' + err.message);
    }
  }
}

module.exports = new ZeroShotService();
