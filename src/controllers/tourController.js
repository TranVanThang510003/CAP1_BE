const { analyzeUserAnswers } = require('../services/aiService');
const { getFilteredTours } = require('../services/tourService');

exports.getSuggestedTours = async (req, res) => {
  try {
    const userId = req.user.id;

    const preferences = await analyzeUserAnswers(userId);

    const tours = await getFilteredTours(preferences);

    res.status(200).json({ tours });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
