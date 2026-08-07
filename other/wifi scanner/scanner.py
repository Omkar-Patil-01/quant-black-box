"""
Wi-Fi Signal Propagation Scanner
Reads real RSSI data from Windows netsh, records at grid coordinates,
and exports data for heatmap visualization.
"""
import subprocess
import re
import json
import time
import os
import csv
from datetime import datetime

try:
    import pandas as pd
    HAS_PANDAS = True
except ImportError:
    HAS_PANDAS = False

try:
    import numpy as np
    HAS_NUMPY = True
except ImportError:
    HAS_NUMPY = False


class WifiScanner:
    def __init__(self, target_bssid=None):
        self.target_bssid = target_bssid.upper() if target_bssid else None
        self.data_points = []
        self.scan_log = []
        self.output_dir = os.path.dirname(os.path.abspath(__file__))

    # ── Core scan ──────────────────────────────────────────────
    def scan_networks(self):
        """Run netsh and parse every visible BSSID into a dict list."""
        try:
            raw = subprocess.check_output(
                "netsh wlan show networks mode=bssid",
                shell=True, stderr=subprocess.DEVNULL
            ).decode("utf-8", errors="replace")
        except subprocess.CalledProcessError:
            print("[!] netsh failed — is Wi-Fi adapter enabled?")
            return []

        networks = []
        current = None

        for line in raw.splitlines():
            line = line.strip()
            if not line:
                continue

            # New network block
            if line.startswith("SSID") and "BSSID" not in line:
                if current:
                    networks.append(current)
                current = {"ssid": "", "bssid": "", "signal": 0, "rssi": 0,
                           "channel": "", "auth": "", "cipher": ""}
                val = line.split(":", 1)[-1].strip()
                if val:
                    current["ssid"] = val

            elif "BSSID" in line and current:
                mac = re.search(r"([0-9A-Fa-f]{2}[:-]){5}[0-9A-Fa-f]{2}", line)
                if mac:
                    current["bssid"] = mac.group().upper()

            elif "Signal" in line and current:
                pct = re.search(r"(\d+)\s*%", line)
                if pct:
                    current["signal"] = int(pct.group(1))
                    current["rssi"] = self._pct_to_dbm(current["signal"])

            elif "Channel" in line and current:
                ch = re.search(r":\s*(\d+)", line)
                if ch:
                    current["channel"] = ch.group(1)

            elif "Authentication" in line and current:
                current["auth"] = line.split(":", 1)[-1].strip()

            elif "Encryption" in line and current:
                current["cipher"] = line.split(":", 1)[-1].strip()

        if current:
            networks.append(current)

        return networks

    def get_rssi_for_target_ap(self, target_bssid=None):
        """Return RSSI (dBm) for the target AP, or the strongest if None."""
        bssid = (target_bssid or self.target_bssid)
        if bssid:
            bssid = bssid.upper()

        networks = self.scan_networks()

        if not networks:
            print("[!] No networks found.")
            return None

        # Filter to target BSSID if specified
        if bssid:
            matches = [n for n in networks if n["bssid"] == bssid]
            if not matches:
                print(f"[!] BSSID {bssid} not found in scan.")
                print("    Visible BSSIDs:")
                for n in networks:
                    print(f"      {n['bssid']}  {n['ssid']}")
                return None
            best = matches[0]
        else:
            best = max(networks, key=lambda n: n["rssi"])
            print(f"[*] No target BSSID set — using strongest: {best['ssid']} ({best['bssid']})")

        return best["rssi"]

    def scan_all(self):
        """Return full scan results as list of dicts."""
        return self.scan_networks()

    # ── Recording ──────────────────────────────────────────────
    def record_point(self, x, y, target_bssid=None, label=""):
        """Scan and record an (x, y, rssi) data point."""
        rssi = self.get_rssi_for_target_ap(target_bssid)
        if rssi is None:
            return None

        point = {
            "x": round(x, 2),
            "y": round(y, 2),
            "rssi": rssi,
            "label": label,
            "timestamp": datetime.now().isoformat(),
        }
        self.data_points.append(point)
        self.scan_log.append(point)
        print(f"[+] Recorded ({x:.1f}, {y:.1f}) → {rssi} dBm")
        return point

    def record_grid(self, x_start, y_start, x_end, y_end,
                    step=1.0, target_bssid=None, delay=2.0):
        """Walk a rectangular grid and record at each step.

        Args:
            x_start, y_start : grid origin (meters)
            x_end, y_end     : grid corner (meters)
            step             : spacing between points (meters)
            target_bssid     : MAC to filter (None = strongest)
            delay            : seconds between scans (let adapter settle)
        """
        x_steps = int(abs(x_end - x_start) / step) + 1
        y_steps = int(abs(y_end - y_start) / step) + 1
        x_dir = 1 if x_end >= x_start else -1
        y_dir = 1 if y_end >= y_start else -1

        total = x_steps * y_steps
        print(f"[*] Grid scan: {x_steps}x{y_steps} = {total} points, "
              f"step={step}m, delay={delay}s")

        idx = 0
        y = y_start
        for yi in range(y_steps):
            x = x_start
            for xi in range(x_steps):
                idx += 1
                print(f"  [{idx}/{total}]", end=" ")
                self.record_point(x, y, target_bssid)
                x += step * x_dir
                if idx < total:
                    time.sleep(delay)
            y += step * y_dir

        print(f"[✓] Grid scan complete — {len(self.data_points)} points recorded.")

    # ── Export ─────────────────────────────────────────────────
    def export_csv(self, filename=None):
        """Export data_points to CSV."""
        if not self.data_points:
            print("[!] No data to export.")
            return None
        filename = filename or f"scan_{datetime.now():%Y%m%d_%H%M%S}.csv"
        filepath = os.path.join(self.output_dir, filename)

        with open(filepath, "w", newline="") as f:
            writer = csv.DictWriter(f, fieldnames=["x", "y", "rssi", "label", "timestamp"])
            writer.writeheader()
            writer.writerows(self.data_points)
        print(f"[✓] Exported {len(self.data_points)} points → {filepath}")
        return filepath

    def export_json(self, filename=None):
        """Export data_points to JSON for the web heatmap."""
        if not self.data_points:
            print("[!] No data to export.")
            return None
        filename = filename or f"scan_{datetime.now():%Y%m%d_%H%M%S}.json"
        filepath = os.path.join(self.output_dir, filename)

        output = {
            "scan_info": {
                "target_bssid": self.target_bssid,
                "total_points": len(self.data_points),
                "scan_time": datetime.now().isoformat(),
            },
            "data_points": self.data_points,
        }
        with open(filepath, "w") as f:
            json.dump(output, f, indent=2)
        print(f"[✓] Exported JSON → {filepath}")
        return filepath

    def export_numpy(self):
        """Return data as numpy arrays (x, y, rssi) for interpolation."""
        if not HAS_NUMPY:
            print("[!] numpy not installed.")
            return None, None, None
        if not self.data_points:
            return None, None, None
        arr = np.array([[p["x"], p["y"], p["rssi"]] for p in self.data_points])
        return arr[:, 0], arr[:, 1], arr[:, 2]

    def to_dataframe(self):
        """Return data as a pandas DataFrame."""
        if not HAS_PANDAS:
            print("[!] pandas not installed.")
            return None
        return pd.DataFrame(self.data_points)

    # ── Utilities ──────────────────────────────────────────────
    @staticmethod
    def _pct_to_dbm(pct):
        """Convert Windows signal percentage to approximate dBm."""
        return round((pct / 2) - 100)

    def summary(self):
        """Print summary statistics."""
        if not self.data_points:
            print("[!] No data points recorded.")
            return
        rssis = [p["rssi"] for p in self.data_points]
        print(f"\n{'='*40}")
        print(f"  SCAN SUMMARY")
        print(f"{'='*40}")
        print(f"  Points recorded : {len(rssis)}")
        print(f"  RSSI range      : {min(rssis)} to {max(rssis)} dBm")
        if HAS_NUMPY:
            print(f"  RSSI mean       : {np.mean(rssis):.1f} dBm")
            print(f"  RSSI std dev    : {np.std(rssis):.1f} dB")
        print(f"  Target BSSID    : {self.target_bssid or 'Any (strongest)'}")
        print(f"{'='*40}\n")

    def clear(self):
        """Clear all recorded data."""
        self.data_points.clear()
        self.scan_log.clear()
        print("[*] Data cleared.")

    # ── Interactive CLI ────────────────────────────────────────
    def interactive_mode(self):
        """Simple CLI for manual point recording."""
        print("\n" + "=" * 50)
        print("  Wi-Fi Scanner — Interactive Mode")
        print("=" * 50)
        print("  Commands:")
        print("    scan            — quick scan (no location)")
        print("    list            — list visible networks")
        print("    set <BSSID>     — set target AP")
        print("    rec <x> <y>     — record point at (x, y)")
        print("    grid            — walk a grid pattern")
        print("    save csv/json   — export data")
        print("    summary         — show stats")
        print("    clear           — clear all data")
        print("    quit            — exit")
        print("=" * 50 + "\n")

        while True:
            try:
                cmd = input("wifi> ").strip()
            except (EOFError, KeyboardInterrupt):
                break

            if not cmd:
                continue
            parts = cmd.split()
            action = parts[0].lower()

            if action == "quit" or action == "exit":
                break

            elif action == "scan":
                results = self.scan_all()
                for n in results:
                    print(f"  {n['rssi']:>4} dBm  {n['bssid']}  {n['ssid']}")

            elif action == "list":
                results = self.scan_all()
                if not results:
                    print("  No networks found.")
                for i, n in enumerate(results, 1):
                    marker = " ◀ TARGET" if self.target_bssid and n["bssid"] == self.target_bssid else ""
                    print(f"  {i}. {n['ssid']:<30} {n['bssid']}  "
                          f"Ch:{n['channel']:<4} {n['rssi']:>4} dBm{marker}")

            elif action == "set" and len(parts) >= 2:
                self.target_bssid = parts[1].upper()
                print(f"  Target set to {self.target_bssid}")

            elif action == "rec" and len(parts) >= 3:
                try:
                    x, y = float(parts[1]), float(parts[2])
                    self.record_point(x, y)
                except ValueError:
                    print("  Usage: rec <x_meters> <y_meters>")

            elif action == "grid":
                try:
                    xs = float(input("  X start (m): "))
                    ys = float(input("  Y start (m): "))
                    xe = float(input("  X end   (m): "))
                    ye = float(input("  Y end   (m): "))
                    step = float(input("  Step    (m, default 1): ") or "1")
                    delay = float(input("  Delay   (s, default 2): ") or "2")
                    self.record_grid(xs, ys, xe, ye, step=step, delay=delay)
                except ValueError:
                    print("  Invalid input.")

            elif action == "save":
                fmt = parts[1] if len(parts) > 1 else "csv"
                if fmt == "json":
                    self.export_json()
                else:
                    self.export_csv()

            elif action == "summary":
                self.summary()

            elif action == "clear":
                self.clear()

            else:
                print("  Unknown command. Type 'quit' to exit.")

        print("[*] Goodbye.")


# ── Standalone execution ───────────────────────────────────
if __name__ == "__main__":
    scanner = WifiScanner()
    scanner.interactive_mode()
