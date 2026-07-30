"""
Bridge: Runs a scan, exports JSON, and injects it into the web heatmap.
Usage: python bridge.py [--bssid AA:BB:CC:DD:EE:FF] [--grid]
"""
import sys
import os
import json
import argparse

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from scanner import WifiScanner

WEB_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "index.html")


def inject_data_into_web(scan_file, web_file=WEB_FILE):
    """Read scan JSON and inject it as a JS variable into index.html."""
    with open(scan_file, "r") as f:
        scan_data = f.read()

    with open(web_file, "r") as f:
        html = f.read()

    inject_marker = "// __SCANNER_DATA_INJECT__"
    inject_block = f"""
const REAL_SCAN_DATA = {scan_data};
function loadRealScanData() {{
  if (!REAL_SCAN_DATA || !REAL_SCAN_DATA.data_points) return;
  const pts = REAL_SCAN_DATA.data_points;
  realScanPoints = pts.map(p => ({{ x: p.x, y: p.y, rssi: p.rssi }}));
  console.log(`[Scanner] Loaded ${{pts.length}} real data points`);
}}
loadRealScanData();
// __SCANNER_DATA_INJECT__
"""
    if inject_marker in html:
        html = html.split(inject_marker)[0] + inject_marker

    html = html.replace(inject_marker, inject_block)

    with open(web_file, "w") as f:
        f.write(html)
    print(f"[✓] Injected scan data into {web_file}")


def main():
    parser = argparse.ArgumentParser(description="Wi-Fi Scanner → Web Heatmap Bridge")
    parser.add_argument("--bssid", help="Target AP BSSID (MAC)")
    parser.add_argument("--grid", action="store_true", help="Run grid scan")
    parser.add_argument("--quick", action="store_true", help="Single point scan")
    args = parser.parse_args()

    scanner = WifiScanner(target_bssid=args.bssid)

    if args.grid:
        print("Grid scan mode — follow prompts")
        xs = float(input("X start (m): "))
        ys = float(input("Y start (m): "))
        xe = float(input("X end   (m): "))
        ye = float(input("Y end   (m): "))
        step = float(input("Step (m, default 1): ") or "1")
        delay = float(input("Delay (s, default 2): ") or "2")
        scanner.record_grid(xs, ys, xe, ye, step=step, delay=delay)

    elif args.quick:
        scanner.record_point(0, 0)

    else:
        scanner.interactive_mode()

    if scanner.data_points:
        json_path = scanner.export_json()
        if json_path:
            inject_data_into_web(json_path)
            print("[*] Open index.html to see real scan data on the heatmap.")
    else:
        print("[!] No data collected.")


if __name__ == "__main__":
    main()
