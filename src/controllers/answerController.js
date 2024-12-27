const { saveUserAnswers } = require('../services/answerService');
const { analyzeUserAnswers } = require('../services/aiService');
const { getTour } = require('../services/tourService');

const saveAnswers = async (req, res) => {
  try {
    const { answers } = req.body;
    const userId = req.user.USER_ID;

    if (!answers || answers.length === 0) {
      return res.status(400).json({ message: 'Answers are required' });
    }

    await saveUserAnswers(userId, answers);
    res.status(201).json({ message: 'Answers saved successfully' });
  } catch (error) {
    console.error('Error saving answers:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}

const getSuggestedTours = async (req, res) => {
  try {
    const userId = req.user.USER_ID;

    const preferences = await analyzeUserAnswers(userId);
    const tours = await getTour(preferences);

    res.status(200).json({ tours });
  } catch (error) {
    console.error('Error fetching suggested tours:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}
module.exports = {getSuggestedTours, saveAnswers};
