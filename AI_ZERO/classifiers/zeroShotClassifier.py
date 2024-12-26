from flask import Flask, request, jsonify
from transformers import pipeline
from collections import Counter

# Khởi tạo Flask app
app = Flask(__name__)

# Khởi tạo mô hình Zero-Shot Classification
classifier = pipeline("zero-shot-classification", model="facebook/bart-large-mnli")

@app.route('/classify', methods=['POST'])
def classify():
    """
    Endpoint chính để nhận dữ liệu từ người dùng, phân loại câu trả lời bằng Zero-Shot Classification,
    và trả về danh mục phù hợp nhất.
    """
    try:
        # Lấy dữ liệu JSON từ yêu cầu POST
        data = request.json

        # Đảm bảo dữ liệu đầu vào chứa 'responses'
        if not data or 'responses' not in data:
            return jsonify({"error": "Invalid input, 'responses' key is required"}), 400

        responses = data.get('responses', [])

        # Kiểm tra xem 'responses' có phải danh sách không
        if not isinstance(responses, list) or len(responses) == 0:
            return jsonify({"error": "Invalid input, 'responses' must be a non-empty list"}), 400

        # Danh sách nhãn dùng cho Zero-Shot Classification
        candidate_labels = [
            "Tour mạo hiểm", "Tour văn hóa", "Tour nghỉ dưỡng", "Tour sinh thái", "Tour đi thuyền", 
            "Tour ẩm thực", "Khám phá đảo"
        ]

        # Lưu trữ kết quả phân loại
        classification_results = []

        # Phân loại từng câu trả lời
        for response in responses:
            if not response.strip():
                continue
            result = classifier(response, candidate_labels, multi_label=False)
            classification_results.append({
                "response": response,
                "labels": result["labels"],
                "scores": result["scores"]
            })

        # Tính toán nhãn phổ biến nhất (danh mục chính)
        all_labels = [result["labels"][0] for result in classification_results]
        most_common_label = Counter(all_labels).most_common(1)[0][0]

        return jsonify({
            "category": most_common_label,
            "details": classification_results
        })

    except Exception as e:
        return jsonify({"error": f"An error occurred: {str(e)}"}), 500


if __name__ == '__main__':
    app.run(port=5000, debug=True)
