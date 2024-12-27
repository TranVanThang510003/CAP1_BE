const ZeroShotService = require('../services/zeroShotService'); // Import ZeroShotService instance

class ZeroShotController {
  // Xử lý câu trả lời của người dùng
  async handleUserAnswers(req, res) {
    try {
      // Lấy dữ liệu từ body của request
      const { userId, answers } = req.body;

      if (!userId || !answers || !Array.isArray(answers)) {
        return res.status(400).json({ error: 'Invalid request data. `userId` and `answers` are required.' });
      }

      // Lưu câu trả lời của người dùng
      await zeroShotService.saveUserAnswers(userId, answers);

      // Phân loại câu trả lời
      const classificationResult = await zeroShotService.classifyUserAnswers(userId);

      // Đề xuất tour dựa trên kết quả phân loại
      const tours = await zeroShotService.recommendTours(classificationResult);

      // Trả về phản hồi cho client
      res.status(200).json({ 
        message: 'User answers processed successfully', 
        classification: classificationResult, 
        recommendations: tours 
      });
    } catch (err) {
      console.error('Error handling user answers:', err.message);
      res.status(500).json({ error: 'Internal server error', details: err.message });
    }
  }
}

// Xuất class ZeroShotController
module.exports = new ZeroShotController();
