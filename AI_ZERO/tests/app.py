from flask import Flask
from AI_ZERO.classifiers.zeroShotClassifier import app as zero_shot_app

# Khởi tạo Flask App
app = Flask(__name__)

# Đăng ký Blueprint cho Zero-Shot Classification
app.register_blueprint(zero_shot_app, url_prefix='/api/ai')

# Route kiểm tra server
@app.route('/')
def home():
    return "API Server is running successfully!"

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
