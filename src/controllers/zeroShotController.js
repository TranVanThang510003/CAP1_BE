const zeroShotService = require('../service/zeroShotService');

class ZeroShotController {
  async handleUserAnswers(req, res) {
    try {
      const { userId, answers } = req.body;

      // Save user answers
      await zeroShotService.saveUserAnswers(userId, answers);

      // Classify answers
      const classificationResult = await zeroShotService.classifyUserAnswers(userId);

      // Recommend tours
      const tours = await zeroShotService.recommendTours(classificationResult);

      res.status(200).json({ classification: classificationResult, recommendations: tours });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
}

module.exports = new ZeroShotController();
