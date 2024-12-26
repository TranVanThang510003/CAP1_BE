const axios = require('axios');

exports.analyzeUserAnswers = async (userId) => {
  try {
    const response = await axios.post(`${process.env.AI_URL}/analyze`, { userId });
    return response.data.preferences; // Return preferences
  } catch (error) {
    console.error('Error analyzing user answers:', error);
    throw new Error('AI service unavailable');
  }
};
