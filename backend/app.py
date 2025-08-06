import os
from flask import Flask, request, jsonify
from flask_cors import CORS
from predictor import predict_price_master
import traceback

app = Flask(__name__)
CORS(app)

@app.route('/')  
def health_check():
    return "✅ Le serveur backend est en ligne et prêt à recevoir des prédictions !"
@app.route('/predict', methods=['POST'])
def predict():
    try:
        data = request.get_json()
        mode = data.get('prediction_mode', 'level') 
        prediction = predict_price_master(data, prediction_mode=mode)
        prediction_py = float(prediction)
        return jsonify({'predicted_price': prediction_py})
    except Exception as e:
        print(f"❌ ERREUR: {e}")
        print(traceback.format_exc())
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port)
