from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
import subprocess
import re
import os

TEMPLATE_DIR = os.path.dirname(os.path.abspath(__file__))
app = Flask(__name__, static_folder=TEMPLATE_DIR, static_url_path='')
CORS(app)
target_bssid = None

@app.route('/')
def serve_homepage():
    return send_from_directory(TEMPLATE_DIR, 'index.html')

@app.route('/api/scan', methods=['GET'])
def scan_networks():
    try:
        result = subprocess.run(
            ['netsh', 'wlan', 'show', 'networks', 'mode=bssid'],
            capture_output=True, text=True, timeout=10
        )
        output = result.stdout

        ssid_blocks = re.split(r'\r?\n\s*SSID \d+\s*:', output)
        networks = []

        for block in ssid_blocks[1:]:
            ssid_m = re.search(r'^\s*(.*?)\s*$', block, re.MULTILINE)
            ssid = ssid_m.group(1).strip() if ssid_m else ''

            bssids = re.findall(r'BSSID\s+\d+\s*:\s*([0-9A-Fa-f:]{17})', block)
            signals = re.findall(r'Signal\s*:\s*(\d+)%', block)
            radios = re.findall(r'Radio type\s*:\s*(.+)', block)

            for i in range(len(bssids)):
                pct = int(signals[i]) if i < len(signals) else 0
                rssi = round((pct / 2) - 100)
                radio = radios[i].strip() if i < len(radios) else ''
                pct_val = int(signals[i]) if i < len(signals) else 0
                band = '5.0 GHz' if radio in ('802.11ac', '802.11ax') and pct_val > 0 else '2.4 GHz'

                networks.append({
                    'ssid': ssid or '(Hidden)',
                    'bssid': bssids[i].upper(),
                    'rssi': rssi,
                    'band': band
                })

        return jsonify({'status': 'success', 'networks': networks}), 200

    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500

@app.route('/api/set-target', methods=['POST'])
def set_target():
    global target_bssid
    data = request.get_json()
    if not data or 'bssid' not in data:
        return jsonify({'status': 'error', 'message': 'bssid required'}), 400
    target_bssid = data['bssid']
    print(f"[TARGET LOCKED] {target_bssid}")
    return jsonify({'status': 'success', 'message': f'Locked onto {target_bssid}'}), 200

if __name__ == '__main__':
    print("\n" + "=" * 60)
    print(" [ONLINE] WI-FI 3D PROPAGATION BACKEND - REAL HARDWARE")
    print(f" Project Folder: {TEMPLATE_DIR}")
    print("=" * 60 + "\n")
    app.run(host='0.0.0.0', port=5000, debug=True)
