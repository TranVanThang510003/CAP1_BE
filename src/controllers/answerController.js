const { saveUserAnswers } = require('../services/answerService');

exports.saveAnswers = async (req, res) => {
  try {
    const { answers } = req.body;
    const userId = req.user.id;

    if (!answers || answers.length === 0) {
      return res.status(400).json({ message: 'Answers are required' });
    }

    await saveUserAnswers(userId, answers);

    res.status(201).json({ message: 'Answers saved successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
