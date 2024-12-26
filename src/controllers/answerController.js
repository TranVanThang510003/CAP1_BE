const { saveUserAnswers } = require('../services/answerService');
const { analyzeUserAnswers } = require('../services/aiService');
const { getFilteredTours } = require('../services/tourService');

exports.saveAnswers = async (req, res) => {
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
};

exports.getSuggestedTours = async (req, res) => {
  try {
    const userId = req.user.USER_ID;

    const preferences = await analyzeUserAnswers(userId);
    const tours = await getFilteredTours(preferences);

    res.status(200).json({ tours });
  } catch (error) {
    console.error('Error fetching suggested tours:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
