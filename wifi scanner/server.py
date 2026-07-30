"""
Wi-Fi Scanner Backend Server
Cross-platform (Windows / macOS / Linux) real hardware scanning.
Flask API bridge between the web frontend and the wireless adapter.

Run:  python server.py
API:  http://localhost:5000
"""
import subprocess
import platform
import re
import sys
from datetime import datetime
from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
import os

app = Flask(__name__)
CORS(app)

# ── OS Detection ────────────────────────────────────────────
OS_TYPE = platform.system().lower()          # "windows", "darwin", "linux"
OS_NAME = platform.platform()               # full description string
IS_WINDOWS = OS_TYPE == "windows"
IS_MACOS = OS_TYPE == "darwin"
IS_LINUX = OS_TYPE == "linux"

# ── State ───────────────────────────────────────────────────
target_bssid = None
last_scan_cache = []
last_scan_time = 0


# ── Unit Conversion ─────────────────────────────────────────
def pct_to_dbm(pct):
    """Convert Wi-Fi signal percentage to dBm (Windows netsh convention).
    Formula: dBm = (percentage / 2) - 100
    Valid range: 0 % → -100 dBm, 100 % → -50 dBm.
    """
    return round((pct / 2) - 100)


def channel_to_band(channel):
    """Determine frequency band from channel number.
    2.4 GHz: channels 1-14
    5 GHz:   channels 15-196
    6 GHz:   channels 1-233 (Wi-Fi 6E, reported as "6 GHz" by some OSes)
    """
    try:
        ch = int(channel)
    except (ValueError, TypeError):
        return "2.4 GHz"
    if ch <= 14:
        return "2.4 GHz"
    if ch <= 196:
        return "5.0 GHz"
    return "6 GHz"


# ── Platform-Specific Scanners ──────────────────────────────
def _scan_windows():
    """Windows: netsh wlan show networks mode=bssid
    Returns raw UTF-8 text output.
    Raises CalledProcessError if Wi-Fi is off or netsh fails.
    """
    raw = subprocess.check_output(
        "netsh wlan show networks mode=bssid",
        shell=True, stderr=subprocess.PIPE, timeout=15
    ).decode("utf-8", errors="replace")

    networks = []
    current = None

    for line in raw.splitlines():
        stripped = line.strip()
        if not stripped:
            continue

        # New network block starts with "SSID N :"
        if re.match(r"^SSID\s+\d+\s*:", stripped):
            if current and current.get("bssid"):
                networks.append(current)
            current = {
                "ssid": "", "bssid": "", "rssi": 0,
                "band": "2.4 GHz", "channel": 0,
                "auth": "", "cipher": "",
            }
            val = stripped.split(":", 1)[-1].strip()
            if val:
                current["ssid"] = val

        elif stripped.startswith("BSSID") and current:
            mac = re.search(
                r"([0-9A-Fa-f]{2}[:-]){5}[0-9A-Fa-f]{2}", stripped
            )
            if mac:
                current["bssid"] = mac.group().upper()

        elif "Signal" in stripped and current:
            m = re.search(r"(\d+)\s*%", stripped)
            if m:
                pct = int(m.group(1))
                current["rssi"] = pct_to_dbm(pct)

        elif "Channel" in stripped and current:
            m = re.search(r":\s*(\d+)", stripped)
            if m:
                ch = int(m.group(1))
                current["channel"] = ch
                current["band"] = channel_to_band(ch)

        elif "Authentication" in stripped and current:
            current["auth"] = stripped.split(":", 1)[-1].strip()

        elif "Encryption" in stripped and current:
            current["cipher"] = stripped.split(":", 1)[-1].strip()

    if current and current.get("bssid"):
        networks.append(current)

    return networks


def _scan_macos():
    """macOS: airport -s (Apple80211 framework)
    Tab/space separated table: SSID BSSID RSSI CHANNEL HT CC SECURITY
    First line is the header row.
    """
    airport_path = (
        "/System/Library/PrivateFrameworks/Apple80211.framework"
        "/Versions/Current/Resources/airport"
    )
    raw = subprocess.check_output(
        [airport_path, "-s"],
        stderr=subprocess.PIPE, timeout=15
    ).decode("utf-8", errors="replace")

    networks = []
    lines = raw.strip().splitlines()
    if not lines:
        return networks

    # Skip header line
    for line in lines[1:]:
        # Split on whitespace, but SSID can contain spaces so we parse carefully.
        # airport -s fixed-width columns:
        #   SSID (up to 33 chars), BSSID, RSSI, CHANNEL, ...
        # Use a regex that matches: optional spaces+SSID, then BSSID MAC, then numbers
        m = re.match(
            r"^\s*(.{1,33})\s+"
            r"([0-9A-Fa-f]{2}(?::[0-9A-Fa-f]{2}){5})\s+"
            r"(-?\d+)\s+"
            r"(\d+)",
            line,
        )
        if not m:
            continue

        ssid = m.group(1).strip()
        bssid = m.group(2).upper()
        rssi = int(m.group(3))            # already in dBm on macOS
        channel = int(m.group(4))

        networks.append({
            "ssid": ssid,
            "bssid": bssid,
            "rssi": rssi,
            "band": channel_to_band(channel),
            "channel": channel,
            "auth": "",
            "cipher": "",
        })

    return networks


def _scan_linux():
    """Linux: nmcli -f BSSID,SSID,SIGNAL,CHAN device wifi
    Comma-separated values, BSSID may be empty for connected AP.
    SIGNAL is in percentage (0-100).
    """
    raw = subprocess.check_output(
        ["nmcli", "-f", "BSSID,SSID,SIGNAL,CHAN", "device", "wifi"],
        stderr=subprocess.PIPE, timeout=15
    ).decode("utf-8", errors="replace")

    networks = []
    lines = raw.strip().splitlines()
    if not lines:
        return networks

    # Skip header
    for line in lines[1:]:
        # nmcli uses two-space separator for BSSID field
        # Format: BSSID  SSID  SIGNAL  CHAN
        parts = [p.strip() for p in re.split(r"\s{2,}", line.strip())]
        if len(parts) < 4:
            continue

        bssid_raw = parts[0]
        ssid = parts[1]
        signal_pct = parts[2]
        channel = parts[3]

        # nmcli shows "AA:BB:CC:DD:EE:FF (wlan0)" — extract just MAC
        mac = re.search(
            r"([0-9A-Fa-f]{2}:){5}[0-9A-Fa-f]{2}", bssid_raw
        )
        bssid = mac.group().upper() if mac else ""

        # Skip if no BSSID (sometimes appears as "--")
        if not bssid or bssid == "--":
            continue

        try:
            rssi = pct_to_dbm(int(signal_pct))
        except ValueError:
            rssi = -100

        try:
            ch = int(channel)
        except ValueError:
            ch = 0

        networks.append({
            "ssid": ssid,
            "bssid": bssid,
            "rssi": rssi,
            "band": channel_to_band(ch),
            "channel": ch,
            "auth": "",
            "cipher": "",
        })

    return networks


# ── Unified Scanner ─────────────────────────────────────────
def perform_wifi_scan():
    """Detect OS, run the correct scan command, parse results.
    Returns (networks_list, error_string_or_None).
    """
    global last_scan_cache, last_scan_time

    try:
        if IS_WINDOWS:
            networks = _scan_windows()
        elif IS_MACOS:
            networks = _scan_macos()
        elif IS_LINUX:
            networks = _scan_linux()
        else:
            return [], f"Unsupported OS: {OS_TYPE}"

        last_scan_cache = networks
        last_scan_time = datetime.now().timestamp()
        return networks, None

    except FileNotFoundError as e:
        cmd = {"windows": "netsh", "darwin": "airport", "linux": "nmcli"}.get(
            OS_TYPE, "unknown"
        )
        return [], f"Command not found: {cmd} — is the Wi-Fi tool installed? ({e})"

    except subprocess.CalledProcessError as e:
        stderr = (e.stderr or b"").decode("utf-8", errors="replace").strip()
        if IS_WINDOWS:
            if "not available" in stderr.lower() or "wi-fi" in stderr.lower():
                return [], "Wi-Fi interface unavailable — adapter may be off"
        elif IS_LINUX:
            if "no Wi-Fi" in stderr.lower() or "not wireless" in stderr.lower():
                return [], "Wi-Fi interface unavailable — no wireless device found"
        return [], f"Scan command failed (exit {e.returncode}): {stderr or 'unknown error'}"

    except subprocess.TimeoutExpired:
        return [], "Scan timed out after 15 seconds"

    except OSError as e:
        return [], f"OS error: {e}"


def get_rssi_for_bssid(bssid):
    """Get RSSI for a specific BSSID from a live scan."""
    networks, err = perform_wifi_scan()
    if err:
        return None
    for n in networks:
        if n["bssid"].upper() == bssid.upper():
            return n["rssi"]
    return None


def get_scan_error_payload(err_msg):
    """Standard error response matching the required JSON structure."""
    return jsonify({
        "status": "error",
        "message": err_msg or "Wi-Fi interface unavailable",
        "os": OS_TYPE,
        "timestamp": datetime.now().isoformat(),
    })


# ── API Endpoints ──────────────────────────────────────────
TEMPLATE_DIR = os.path.dirname(os.path.abspath(__file__))


@app.route("/")
def serve_homepage():
    return send_from_directory(TEMPLATE_DIR, "index.html")


@app.route("/api/scan", methods=["GET"])
def api_scan():
    """GET /api/scan — Trigger a real Wi-Fi scan and return networks."""
    networks, err = perform_wifi_scan()
    if err:
        return get_scan_error_payload(err), 503

    return jsonify({
        "status": "success",
        "networks": networks,
        "count": len(networks),
        "os": OS_TYPE,
        "scan_time": datetime.now().isoformat(),
        "target_bssid": target_bssid,
    })


@app.route("/api/set-target", methods=["POST"])
def api_set_target():
    """POST /api/set-target — Lock onto a specific BSSID.
    Body: { "bssid": "AA:BB:CC:DD:EE:FF" }
    Set to empty string or "NONE" to clear.
    """
    global target_bssid

    data = request.get_json(silent=True)
    if not data or "bssid" not in data:
        return jsonify({
            "status": "error",
            "message": "Missing 'bssid' in request body",
        }), 400

    bssid = data["bssid"].strip().upper()

    if bssid in ("", "NONE"):
        target_bssid = None
        return jsonify({
            "status": "success",
            "message": "Target cleared",
            "target_bssid": None,
        })

    if not re.match(r"^([0-9A-F]{2}:){5}[0-9A-F]{2}$", bssid):
        return jsonify({
            "status": "error",
            "message": f"Invalid BSSID format: {bssid}",
        }), 400

    target_bssid = bssid
    return jsonify({
        "status": "success",
        "message": f"Target locked to {bssid}",
        "target_bssid": target_bssid,
    })


@app.route("/api/target", methods=["GET"])
def api_get_target():
    """GET /api/target — Return the current target BSSID."""
    return jsonify({
        "status": "success",
        "target_bssid": target_bssid,
    })


@app.route("/api/scan-target", methods=["GET"])
def api_scan_target():
    """GET /api/scan-target — Scan and return only the target AP's RSSI."""
    if not target_bssid:
        return jsonify({
            "status": "error",
            "message": "No target BSSID set. Use /api/set-target first.",
        }), 400

    rssi = get_rssi_for_bssid(target_bssid)
    if rssi is None:
        return jsonify({
            "status": "error",
            "message": f"Target {target_bssid} not found in current scan.",
        }), 404

    return jsonify({
        "status": "success",
        "bssid": target_bssid,
        "rssi": rssi,
        "scan_time": datetime.now().isoformat(),
    })


@app.route("/api/health", methods=["GET"])
def api_health():
    """GET /api/health — Server health and OS info."""
    return jsonify({
        "status": "success",
        "server": "running",
        "os": OS_TYPE,
        "os_info": OS_NAME,
        "python": sys.version.split()[0],
        "timestamp": datetime.now().isoformat(),
    })


# ── Entry ──────────────────────────────────────────────────
if __name__ == "__main__":
    print("=" * 56)
    print("  Wi-Fi Scanner API Server (Cross-Platform)")
    print(f"  OS detected: {OS_TYPE.upper()} ({OS_NAME})")
    print(f"  Python:      {sys.version.split()[0]}")
    print("  http://localhost:5000")
    print("=" * 56)
    print("  GET  /api/scan          — Scan all networks")
    print("  POST /api/set-target     — Lock onto a BSSID")
    print("  GET  /api/target         — Get current target")
    print("  GET  /api/scan-target    — Scan target only")
    print("  GET  /api/health         — Health check + OS info")
    print("=" * 56)
    app.run(host="0.0.0.0", port=5000, debug=True)
