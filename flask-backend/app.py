from flask import Flask, jsonify, request
from flask_cors import CORS
import yfinance as yf
import numpy as np
import pandas as pd
import datetime


app = Flask(__name__)
CORS(app, resources={r"/stock/*": {"origins": "http://localhost:3000"}})

@app.before_request
def log_request():
    print(f"➡️  {request.method} {request.path}")


@app.route('/stock/<string:symbol>/fields', methods=['GET'])
def show_available_fields(symbol):
    stock = yf.Ticker(symbol)
    data = stock.info
    return jsonify(list(data.keys()))

@app.route('/stock/<string:symbol>/field/<string:field>', methods=['GET'])
def show_field_value(symbol, field):
    stock = yf.Ticker(symbol)
    data = stock.info
    if field in data:
        return jsonify({field: data[field]})
    else:
        return jsonify({"error": "Field not found"}), 404

@app.route('/stock/<string:symbol>/recommendation', methods=['GET'])
def stock_recommendation(symbol):
    stock = yf.Ticker(symbol)
    data = stock.info

    if 'regularMarketPrice' not in data:
        return jsonify({"error": "Stock data not available"}), 404
    
    price = data.get('regularMarketPrice')
    low = data.get('fiftyTwoWeekLow')
    high = data.get('fiftyTwoWeekHigh')

    if not all([price, low, high]):
        return jsonify({"error": "Insufficient data for recommendation"}), 404
    
    ratio = (price - low) / (high - low)
    if ratio < 0.3:
        recommendation = "Buy - undervalued"
    elif ratio > 0.7:
        recommendation = "Sell - overpriced"
    else:
        recommendation = "Hold"

    return jsonify({
        "symbol": symbol,
        "price": price,
        "fiftyTwoWeekLow": low,
        "fiftyTwoWeekHigh": high,
        "positionRatio": round(ratio, 2),
        "recommendation": recommendation
    })
    
@app.route('/stock/<string:symbol>/ema-recommendation', methods=['GET'])
def ema_recommendation(symbol):
    try:
        stock = yf.Ticker(symbol)
        df = stock.history(period="7d", interval="4h")

        if df.empty or 'Close' not in df:
            return jsonify({"error": "No data available"}), 404
        
        df['EMA10'] = df['Close'].ewm(span=10, adjust=False).mean()
        df['EMA55'] = df['Close'].ewm(span=55, adjust=False).mean()

        current_price = df['Close'].iloc[-1]
        ema55 = df['EMA55'].iloc[-1]

        percent_diff = (current_price - ema55) / ema55

        if percent_diff < 0.02:
            recommendation = "Buy - undervalued"
        else:
            recommendation = "Consider waiting - overpriced"

        return jsonify({
            "symbol": symbol,
            "currentPrice": current_price,
            "EMA55": ema55,
            "percentDifference": round(percent_diff * 100, 2),
            "recommendation": recommendation
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    
@app.route('/stock/<string:symbol>/history', methods=['GET'])
def stock_history(symbol):
    try:
        stock = yf.Ticker(symbol)
        df = stock.history(period="1y", interval="4h")
        if df.empty or 'Close' not in df:
            return jsonify({"error": "No data available"}), 404
        
        df['EMA55'] = df['Close'].ewm(span=55, adjust=False).mean()

        history_data = [
            {
                "datetime": row.Index.strftime('%Y-%m-%d %H:%M'),
                "open": round(row.Open, 2),
                "high": round(row.High, 2),
                "low": round(row.Low, 2),
                "close": round(row.Close, 2),
                "EMA55": round(row.EMA55, 2) if not pd.isna(row.EMA55) else None
            }
            for row in df.itertuples()
        ]

        return jsonify(history_data)
    
    except Exception as e:
        return jsonify({"error": str(e)}), 500


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5050, debug=True)