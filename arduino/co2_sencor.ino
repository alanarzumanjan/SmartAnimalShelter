#include <Wire.h>
#include <SparkFun_SCD4x_Arduino_Library.h>
#include <WiFi.h>
#include <WebServer.h>
#include <Preferences.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

SCD4x scd;
WebServer server(80);
Preferences prefs;

// ================== CONFIG ==================
const char* ap_ssid = "CO2-SETUP";
const char* ap_password = "12345678";

IPAddress apIP(192, 168, 4, 1);
IPAddress apGW(192, 168, 4, 1);
IPAddress apSN(255, 255, 255, 0);

// !!! your backend URL
const char* API_URL = "https://oxide-level.id.lv";

// send interval
const unsigned long SEND_INTERVAL = 60000; // 60s
const unsigned long LOGIN_RETRY_MS = 8000;

// ================== PINS / LEDS ==================
int wifi_pin = 15;
const int leds[8] = {23, 32, 2, 19, 18, 5, 17, 16};
const int co2_levels[8] = {400, 600, 700, 800, 1000, 1200, 1400, 2000};
const bool led_on = true;

void set_led(int key, bool on);
void show_co2_Level(int co2);
void leds_off();

// ================== WIFI STATE ==================
String savedSsid = "";
String savedPass = "";
bool wifiConnecting = false;
unsigned long wifiAttemptStart = 0;
const unsigned long wifiTimeoutMs = 30000;

// ================== DEVICE AUTH STATE ==================
String deviceMAC = "";
String savedUsername = "";     // save username, NOT password
String deviceKey = "";         // X-Api-Key
bool enrolled = false;

// pending (from UI)
String pendingUsername = "";
String pendingPassword = "";

// ================== TIMERS ==================
unsigned long lastSendTime = 0;
unsigned long lastLoginAttempt = 0;

// ================== HELPERS ==================
String htmlIndex();
String jsonStatus();
String jsonScan();

void handleRoot();
void handleStatus();
void handleScan();

void startWifiConnect(const String& ssid, const String& pass);
void loadCreds();
void saveCreds(const String& ssid, const String& pass);
void updateWifiLed();

void loadAuthState();
void saveAuthState();
void clearAuthState();

bool apiLogin(const String& username, const String& password);
void sendMeasurement(int co2, float temp, float hum);

String escapeHtml(const String& s) {
  String out;
  out.reserve(s.length());
  for (size_t i = 0; i < s.length(); i++) {
    char c = s[i];
    if (c == '&') out += "&amp;";
    else if (c == '<') out += "&lt;";
    else if (c == '>') out += "&gt;";
    else if (c == '"') out += "&quot;";
    else if (c == '\'') out += "&#39;";
    else out += c;
  }
  return out;
}

String macToString(const uint8_t mac[6]) {
  char buf[18];
  snprintf(buf, sizeof(buf), "%02X:%02X:%02X:%02X:%02X:%02X",
           mac[0], mac[1], mac[2], mac[3], mac[4], mac[5]);
  return String(buf);
}

String getStaMac() {
  uint64_t chipid = ESP.getEfuseMac(); // 48-bit MAC in low bits
  uint8_t mac[6];
  mac[0] = (chipid >> 40) & 0xFF;
  mac[1] = (chipid >> 32) & 0xFF;
  mac[2] = (chipid >> 24) & 0xFF;
  mac[3] = (chipid >> 16) & 0xFF;
  mac[4] = (chipid >> 8)  & 0xFF;
  mac[5] = (chipid >> 0)  & 0xFF;

  char buf[18];
  snprintf(buf, sizeof(buf), "%02X:%02X:%02X:%02X:%02X:%02X",
           mac[0], mac[1], mac[2], mac[3], mac[4], mac[5]);
  return String(buf);
}


const char* wifiReasonToString(uint8_t r) {
  switch (r) {
    case WIFI_REASON_NO_AP_FOUND: return "NO_AP_FOUND (SSID not visible / 5GHz / hidden)";
    case WIFI_REASON_AUTH_FAIL: return "AUTH_FAIL (wrong password / WPA mismatch)";
    case WIFI_REASON_ASSOC_FAIL: return "ASSOC_FAIL";
    case WIFI_REASON_HANDSHAKE_TIMEOUT: return "HANDSHAKE_TIMEOUT";
    case WIFI_REASON_BEACON_TIMEOUT: return "BEACON_TIMEOUT";
    default: return "UNKNOWN";
  }
}

// ================== WEB HANDLERS ==================
void handleRoot() {
  server.send(200, "text/html; charset=utf-8", htmlIndex());
}

void handleStatus() {
  server.send(200, "application/json; charset=utf-8", jsonStatus());
}

void handleScan() {
  server.send(200, "application/json; charset=utf-8", jsonScan());
}

void handleWifiPost() {
  if (!server.hasArg("ssid")) {
    server.send(400, "application/json", "{\"ok\":false,\"error\":\"missing ssid\"}");
    return;
  }

  String ssid = server.arg("ssid");
  String pass = server.arg("pass");
  ssid.trim();

  if (ssid.length() < 1) {
    server.send(400, "application/json", "{\"ok\":false,\"error\":\"ssid empty\"}");
    return;
  }

  saveCreds(ssid, pass);
  savedSsid = ssid;
  savedPass = pass;

  startWifiConnect(savedSsid, savedPass);
  server.send(200, "application/json; charset=utf-8", "{\"ok\":true}");
}

void handleWifiClear() {
  prefs.begin("co2", false);
  prefs.remove("ssid");
  prefs.remove("pass");
  prefs.end();

  savedSsid = "";
  savedPass = "";

  WiFi.disconnect(true, false);
  wifiConnecting = false;
  updateWifiLed();

  server.send(200, "application/json; charset=utf-8", "{\"ok\":true}");
}

// POST /auth  (username+password)
void handleAuthPost() {
  if (!server.hasArg("username") || !server.hasArg("password")) {
    server.send(400, "application/json", "{\"ok\":false,\"error\":\"missing username/password\"}");
    return;
  }

  String u = server.arg("username");
  String p = server.arg("password");
  u.trim();

  if (u.length() < 1 || p.length() < 1) {
    server.send(400, "application/json", "{\"ok\":false,\"error\":\"empty username/password\"}");
    return;
  }

  pendingUsername = u;
  pendingPassword = p;

  bool ok = false;
  if (WiFi.status() == WL_CONNECTED) {
    ok = apiLogin(pendingUsername, pendingPassword);
    pendingPassword = "";
  }

  if (ok) {
    server.send(200, "application/json; charset=utf-8", "{\"ok\":true,\"enrolled\":true}");
  } else {
    if (WiFi.status() != WL_CONNECTED) {
      server.send(200, "application/json; charset=utf-8", "{\"ok\":true,\"queued\":true,\"note\":\"WiFi not connected yet\"}");
    } else {
      server.send(401, "application/json; charset=utf-8", "{\"ok\":false,\"error\":\"login failed\"}");
    }
  }
}

void handleAuthClear() {
  clearAuthState();
  server.send(200, "application/json; charset=utf-8", "{\"ok\":true}");
}

// ================== SETUP ==================
void setup() {
  Serial.begin(115200);
  delay(200);

  WiFi.onEvent([](WiFiEvent_t event, WiFiEventInfo_t info) {
    if (event == ARDUINO_EVENT_WIFI_STA_DISCONNECTED) {
      uint8_t reason = info.wifi_sta_disconnected.reason;
      Serial.print("❌ STA DISCONNECTED. Reason: ");
      Serial.print(reason);
      Serial.print(" -> ");
      Serial.println(wifiReasonToString(reason));
    }
  });

  leds_off();
  pinMode(wifi_pin, OUTPUT);
  digitalWrite(wifi_pin, LOW);

  // IMPORTANT: get MAC after WiFi is up in STA mode
  WiFi.mode(WIFI_AP_STA);
  deviceMAC = getStaMac();
  Serial.print("Device MAC: ");
  Serial.println(deviceMAC);

  loadCreds();
  loadAuthState();

  // AP + STA
  WiFi.softAPConfig(apIP, apGW, apSN);
  bool apOk = WiFi.softAP(ap_ssid, ap_password);

  Serial.println();
  if (!apOk) {
    Serial.println("❌ SoftAP start failed!");
  } else {
    Serial.println("✅ SoftAP started!");
    Serial.print("📡 AP SSID: "); Serial.println(ap_ssid);
    Serial.print("🌐 AP IP:   "); Serial.println(WiFi.softAPIP());
  }

  if (savedSsid.length() > 0) startWifiConnect(savedSsid, savedPass);

  // routes
  server.on("/", handleRoot);
  server.on("/status", HTTP_GET, handleStatus);
  server.on("/scan", HTTP_GET, handleScan);

  server.on("/wifi", HTTP_POST, handleWifiPost);
  server.on("/wifi/clear", HTTP_POST, handleWifiClear);

  server.on("/auth", HTTP_POST, handleAuthPost);
  server.on("/auth/clear", HTTP_POST, handleAuthClear);

  server.begin();
  Serial.println("✅ HTTP server started (http://192.168.4.1)");

  // sensor init
  Wire.begin();
  if (!scd.begin(Wire)) {
    Serial.println("❌ SCD41 not detected!");
  } else {
    scd.startPeriodicMeasurement();
    Serial.println("✅ SCD41 ready");
    delay(5000);
  }
}

// ================== LOOP ==================
void loop() {
  server.handleClient();

  if (wifiConnecting) {
    if (WiFi.status() == WL_CONNECTED) {
      wifiConnecting = false;
      Serial.print("✅ Connected! IP: ");
      Serial.println(WiFi.localIP());
      updateWifiLed();
    } else if (millis() - wifiAttemptStart > wifiTimeoutMs) {
      wifiConnecting = false;
      Serial.println("❌ WiFi connect timeout");
      updateWifiLed();
    }
  } else {
    updateWifiLed();
  }

  if (!enrolled && WiFi.status() == WL_CONNECTED &&
      pendingUsername.length() > 0 && pendingPassword.length() > 0) {
    if (millis() - lastLoginAttempt >= LOGIN_RETRY_MS) {
      lastLoginAttempt = millis();
      Serial.println("[AUTH] Pending login attempt...");
      bool ok = apiLogin(pendingUsername, pendingPassword);
      pendingPassword = "";
      if (!ok) {
        Serial.println("[AUTH] Login failed. Re-enter credentials in web UI.");
        pendingUsername = "";
      }
    }
  }

  // ---- SENSOR LOOP ----
  static unsigned long lastRead = 0;
  const unsigned long intervalMs = 5000;

  if (millis() - lastRead >= intervalMs) {
    lastRead = millis();

    if (scd.readMeasurement()) {
      int co2 = scd.getCO2();
      float t = scd.getTemperature();
      float h = scd.getHumidity();

      show_co2_Level(co2);
      set_led(0, true);

      Serial.print("CO2: "); Serial.print(co2); Serial.println(" ppm");
      Serial.print("Temp: "); Serial.print(t, 1); Serial.println(" C");
      Serial.print("Hum: "); Serial.print(h, 1); Serial.println(" %");
      Serial.println();

      if (enrolled && deviceKey.length() > 0 && WiFi.status() == WL_CONNECTED) {
        if (millis() - lastSendTime >= SEND_INTERVAL) {
          lastSendTime = millis();
          sendMeasurement(co2, t, h);
        }
      }
    } else {
      Serial.println("⚠️ No new SCD4x data yet");
    }
  }

  delay(5);
}

// ================== WIFI FUNCS ==================
void startWifiConnect(const String& ssid, const String& pass) {
  Serial.println();
  Serial.println("========== WiFi CONNECT ==========");
  Serial.print("SSID: "); Serial.println(ssid);
  Serial.print("PASS LEN: "); Serial.println(pass.length());

  WiFi.setSleep(false);
  WiFi.persistent(false);

  // clean restart STA side, DO NOT erase stored credentials
  WiFi.disconnect(true, false);
  delay(300);

  WiFi.mode(WIFI_AP_STA);
  delay(50);

  WiFi.begin(ssid.c_str(), pass.c_str());
  WiFi.setAutoReconnect(true);

  wifiConnecting = true;
  wifiAttemptStart = millis();
  updateWifiLed();
}

void loadCreds() {
  prefs.begin("co2", true);
  savedSsid = prefs.getString("ssid", "");
  savedPass = prefs.getString("pass", "");
  prefs.end();

  if (savedSsid.length() > 0) {
    Serial.print("🔑 Saved SSID found: ");
    Serial.println(savedSsid);
  } else {
    Serial.println("ℹ️ No saved WiFi credentials yet");
  }
}

void saveCreds(const String& ssid, const String& pass) {
  prefs.begin("co2", false);
  prefs.putString("ssid", ssid);
  prefs.putString("pass", pass);
  prefs.end();
}

void updateWifiLed() {
  digitalWrite(wifi_pin, WiFi.status() == WL_CONNECTED ? HIGH : LOW);
}

// ================== AUTH STATE (prefs) ==================
void loadAuthState() {
  prefs.begin("co2", true);
  savedUsername = prefs.getString("username", "");
  deviceKey = prefs.getString("deviceKey", "");
  enrolled = prefs.getBool("enrolled", false);
  prefs.end();

  if (deviceKey.length() > 0) enrolled = true;

  Serial.println("Auth state:");
  Serial.print("  username: "); Serial.println(savedUsername);
  Serial.print("  enrolled: "); Serial.println(enrolled ? "true" : "false");
  Serial.print("  hasKey:   "); Serial.println(deviceKey.length() > 0 ? "YES" : "NO");
}

void saveAuthState() {
  prefs.begin("co2", false);
  prefs.putString("username", savedUsername);
  prefs.putString("deviceKey", deviceKey);
  prefs.putBool("enrolled", enrolled);
  prefs.end();
  Serial.println("💾 Auth state saved");
}

void clearAuthState() {
  prefs.begin("co2", false);
  prefs.remove("username");
  prefs.remove("deviceKey");
  prefs.remove("enrolled");
  prefs.end();

  savedUsername = "";
  deviceKey = "";
  enrolled = false;
  pendingUsername = "";
  pendingPassword = "";
}

// ================== API: LOGIN ==================
bool apiLogin(const String& username, const String& password) {
  if (WiFi.status() != WL_CONNECTED) return false;

  HTTPClient http;
  http.begin(String(API_URL) + "/device-users/login");
  http.addHeader("Content-Type", "application/json");

  StaticJsonDocument<256> doc;
  doc["mac"] = deviceMAC;
  doc["username"] = username;
  doc["password"] = password;

  String payload;
  serializeJson(doc, payload);

  Serial.println("[AUTH] POST /device-users/login ...");
  int code = http.POST(payload);
  String resp = http.getString();
  http.end();

  Serial.print("[AUTH] HTTP ");
  Serial.println(code);
  if (resp.length()) Serial.println(resp);

  if (code != 200) return false;

  StaticJsonDocument<512> out;
  auto err = deserializeJson(out, resp);
  if (err) {
    Serial.print("[AUTH] JSON parse error: ");
    Serial.println(err.c_str());
    return false;
  }

  bool keyIssued = out["keyIssued"] | out["KeyIssued"] | false;
  const char* key = out["deviceKey"] | out["DeviceKey"] | (const char*)nullptr;

  savedUsername = username;

  if (keyIssued && key && String(key).length() > 0) {
    deviceKey = String(key);
    enrolled = true;
    saveAuthState();
    Serial.println("[AUTH] ✅ DeviceKey received & saved!");
    return true;
  }

  if (!keyIssued) {
    if (deviceKey.length() > 0) {
      enrolled = true;
      saveAuthState();
      Serial.println("[AUTH] ✅ Already enrolled (key exists locally).");
      return true;
    }

    Serial.println("[AUTH] ⚠️ Server says already enrolled, but deviceKey is missing locally.");
    enrolled = false;
    saveAuthState();
    return false;
  }

  return false;
}

// ================== API: SEND MEASUREMENT ==================
void sendMeasurement(int co2, float temp, float hum) {
  if (deviceKey.length() == 0) {
    Serial.println("[API] ✗ deviceKey empty, cannot send");
    return;
  }
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("[API] ✗ WiFi not connected");
    return;
  }

  HTTPClient http;
  http.begin(String(API_URL) + "/measurements");
  http.addHeader("Content-Type", "application/json");
  http.addHeader("X-Api-Key", deviceKey);

  StaticJsonDocument<256> doc;
  doc["deviceId"] = deviceMAC;
  doc["co2"] = co2;
  doc["temperature"] = temp;
  doc["humidity"] = hum;

  String payload;
  serializeJson(doc, payload);

  int httpCode = http.POST(payload);
  String resp = http.getString();
  http.end();

  Serial.print("[API] Send measurement: ");
  Serial.print(httpCode);
  Serial.println(httpCode == 200 ? " ✅" : " ✗");
  Serial.print("[MEAS] deviceId used: ");
  Serial.println(deviceMAC);
  if (resp.length()) Serial.println(resp);

  if (httpCode == 401) {
    Serial.println("[API] ⚠️ Unauthorized. Clearing enrolled flag.");
    enrolled = false;
    saveAuthState();
  }
}

// ================== UI: STATUS JSON ==================
String jsonStatus() {
  wl_status_t s = WiFi.status();
  String st;
  if (s == WL_CONNECTED) st = "connected";
  else if (wifiConnecting) st = "connecting";
  else st = "disconnected";

  String ip = (s == WL_CONNECTED) ? WiFi.localIP().toString() : "";
  String apip = WiFi.softAPIP().toString();

  String ssid = WiFi.SSID();
  if (s != WL_CONNECTED && savedSsid.length() > 0) ssid = savedSsid;

  String json = "{";
  json += "\"state\":\"" + st + "\",";
  json += "\"ssid\":\"" + escapeHtml(ssid) + "\",";
  json += "\"ip\":\"" + ip + "\",";
  json += "\"ap_ip\":\"" + apip + "\",";
  json += "\"mac\":\"" + deviceMAC + "\",";
  json += "\"enrolled\":" + String(enrolled ? "true" : "false") + ",";
  json += "\"hasKey\":" + String(deviceKey.length() > 0 ? "true" : "false") + ",";
  json += "\"username\":\"" + escapeHtml(savedUsername) + "\"";
  json += "}";
  return json;
}

// ================== UI: SCAN JSON ==================
String jsonScan() {
  int n = WiFi.scanNetworks(false, true); // async=false, show_hidden=true

  String json = "{";
  json += "\"count\":" + String(n) + ",";
  json += "\"networks\":[";
  for (int i = 0; i < n; i++) {
    if (i) json += ",";
    String ssid = WiFi.SSID(i);
    int32_t rssi = WiFi.RSSI(i);
    wifi_auth_mode_t enc = WiFi.encryptionType(i);
    bool open = (enc == WIFI_AUTH_OPEN);

    json += "{";
    json += "\"ssid\":\"" + escapeHtml(ssid) + "\",";
    json += "\"rssi\":" + String(rssi) + ",";
    json += "\"open\":" + String(open ? "true" : "false");
    json += "}";
  }
  json += "]}";

  WiFi.scanDelete();
  return json;
}

// ================== UI: HTML ==================
String htmlIndex() {
  String presetSsid = escapeHtml(savedSsid);
  String presetUser = escapeHtml(savedUsername);

  String html = R"HTML(
<!doctype html>
<html>
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>CO2 Setup</title>
  <style>
    body{font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial;margin:0;background:#0b1020;color:#e8ecff}
    .wrap{max-width:980px;margin:0 auto;padding:24px}
    .grid{display:grid;grid-template-columns:1.1fr 0.9fr;gap:16px}
    .card{background:#121a33;border:1px solid #23305c;border-radius:18px;padding:18px;box-shadow:0 10px 30px rgba(0,0,0,.25)}
    h1{margin:0 0 8px;font-size:22px}
    p{margin:6px 0;color:#b7c1ff}
    label{display:block;margin:10px 0 6px;color:#cfd6ff;font-size:13px}
    input,select{width:100%;padding:12px;border-radius:12px;border:1px solid #2b3a77;background:#0f1530;color:#e8ecff;outline:none}
    input:focus,select:focus{border-color:#5b7cfa}
    .row{display:flex;gap:10px;align-items:center;margin-top:12px;flex-wrap:wrap}
    button{border:0;border-radius:14px;padding:12px 14px;font-weight:700;cursor:pointer}
    .primary{background:linear-gradient(135deg,#3b82f6,#22d3ee);color:#061022}
    .ghost{background:#1b2750;color:#e8ecff;border:1px solid #2b3a77}
    .danger{background:#3b1d24;color:#ffd7dd;border:1px solid #5c2330}
    .pill{display:inline-flex;gap:8px;align-items:center;padding:8px 10px;border-radius:999px;background:#0f1530;border:1px solid #2b3a77}
    .dot{width:10px;height:10px;border-radius:999px;background:#666}
    .small{font-size:13px;color:#b7c1ff}
    code{background:#0f1530;padding:2px 6px;border-radius:10px}
    .ok{color:#22c55e}
    .warn{color:#f59e0b}
    .bad{color:#ef4444}
    .badge{display:inline-flex;align-items:center;gap:8px;padding:6px 10px;border-radius:999px;border:1px solid #2b3a77;background:#0f1530;color:#cfd6ff;font-size:12px}
    @media (max-width: 920px){ .grid{grid-template-columns:1fr} }
  </style>
</head>
<body>
  <div class="wrap">
    <div class="card" style="margin-bottom:16px">
      <h1>🌱 CO2 Meter Setup</h1>
      <p>Connect to Wi-Fi <b>CO2-SETUP</b> and open <code>http://192.168.4.1</code>.</p>
    </div>

    <div class="grid">
      <div class="card">
        <h1>1) Wi-Fi</h1>
        <p class="small">Pick a network from scan (recommended) or type SSID manually.</p>

        <div class="row">
          <button class="ghost" onclick="scanNetworks()">Scan networks</button>
          <span id="scanInfo" class="badge">Not scanned yet</span>
        </div>

        <label>Networks (from scan)</label>
        <select id="ssidSelect" onchange="pickNetwork()">
          <option value="">-- Scan first --</option>
        </select>

        <label>Wi-Fi SSID</label>
        <input id="ssid" placeholder="Network name" value="__SSID__" />

        <label>Wi-Fi Password</label>
        <input id="pass" placeholder="password (empty for open network)" type="password" />

        <div class="row">
          <button class="primary" onclick="saveWifi()">Connect</button>
          <button class="ghost" onclick="clearWifi()">Clear saved</button>
        </div>

        <p id="wifiMsg" class="small" style="margin-top:12px"></p>

        <hr style="border:0;border-top:1px solid #23305c;margin:16px 0">

        <h1>2) Device login</h1>
        <p class="small">Enter your site credentials. Device will request <b>deviceKey</b> and then start sending measurements.</p>

        <label>Username</label>
        <input id="username" placeholder="e.g. danila" value="__USER__" />

        <label>Password</label>
        <input id="password" placeholder="password" type="password" />

        <div class="row">
          <button class="primary" onclick="loginDevice()">Login device</button>
          <button class="danger" onclick="clearAuth()">Clear device key</button>
        </div>

        <p id="authMsg" class="small" style="margin-top:12px"></p>
      </div>

      <div class="card">
        <h1>Status</h1>
        <div class="pill" style="margin:10px 0">
          <span class="dot" id="dot"></span>
          <span id="state">loading...</span>
        </div>
        <p class="small"><b>SSID:</b> <span id="curSsid">-</span></p>
        <p class="small"><b>Device IP:</b> <span id="curIp">-</span></p>
        <p class="small"><b>AP IP:</b> <span id="apIp">-</span></p>
        <p class="small"><b>MAC:</b> <span id="mac">-</span></p>
        <p class="small"><b>Enrolled:</b> <span id="enrolled">-</span></p>
        <p class="small"><b>Has key:</b> <span id="hasKey">-</span></p>
        <p class="small"><b>User:</b> <span id="userOut">-</span></p>

        <p class="small" style="margin-top:12px">WiFi LED (pin 15) is ON only when state=connected.</p>
      </div>
    </div>
  </div>

<script>
let lastScan = [];

async function refresh(){
  try{
    const r = await fetch('/status');
    const j = await r.json();

    document.getElementById('state').textContent = j.state;
    document.getElementById('curSsid').textContent = j.ssid || '-';
    document.getElementById('curIp').textContent = j.ip || '-';
    document.getElementById('apIp').textContent = j.ap_ip || '-';
    document.getElementById('mac').textContent = j.mac || '-';
    document.getElementById('userOut').textContent = j.username || '-';

    const dot = document.getElementById('dot');
    if (j.state === 'connected') dot.style.background = '#22c55e';
    else if (j.state === 'connecting') dot.style.background = '#f59e0b';
    else dot.style.background = '#ef4444';

    const enrolled = document.getElementById('enrolled');
    enrolled.textContent = j.enrolled ? '✅ Yes' : '❌ No';
    enrolled.className = 'small ' + (j.enrolled ? 'ok' : 'bad');

    const hasKey = document.getElementById('hasKey');
    hasKey.textContent = j.hasKey ? '✅ Yes' : '❌ No';
    hasKey.className = 'small ' + (j.hasKey ? 'ok' : 'bad');

  }catch(e){}
}
setInterval(refresh, 1200);
refresh();

async function scanNetworks(){
  const info = document.getElementById('scanInfo');
  info.textContent = 'Scanning...';
  try{
    const r = await fetch('/scan');
    const j = await r.json();
    lastScan = (j.networks || []).filter(x => x && typeof x.ssid === 'string');

    // Sort by RSSI desc (stronger first)
    lastScan.sort((a,b) => (b.rssi||-999) - (a.rssi||-999));

    const sel = document.getElementById('ssidSelect');
    sel.innerHTML = '';
    const opt0 = document.createElement('option');
    opt0.value = '';
    opt0.textContent = `-- Found: ${j.count || 0} --`;
    sel.appendChild(opt0);

    for(const n of lastScan){
      const opt = document.createElement('option');
      opt.value = n.ssid;
      const lock = n.open ? 'Open' : 'Locked';
      opt.textContent = `${n.ssid}   (${lock}, ${n.rssi} dBm)`;
      sel.appendChild(opt);
    }

    info.textContent = `Found: ${lastScan.length}`;
  }catch(e){
    info.textContent = 'Scan failed';
  }
}

function pickNetwork(){
  const sel = document.getElementById('ssidSelect');
  const ssid = sel.value || '';
  if(!ssid) return;

  document.getElementById('ssid').value = ssid;

  const n = lastScan.find(x => x.ssid === ssid);
  const info = document.getElementById('scanInfo');
  if(n){
    info.textContent = `${n.open ? 'Open' : 'Locked'} · ${n.rssi} dBm`;
  }
}

async function saveWifi(){
  const ssid = document.getElementById('ssid').value.trim();
  const pass = document.getElementById('pass').value;
  const msg = document.getElementById('wifiMsg');
  msg.textContent = 'Sending...';

  const body = new URLSearchParams();
  body.append('ssid', ssid);
  body.append('pass', pass);

  const r = await fetch('/wifi', { method:'POST', headers:{'Content-Type':'application/x-www-form-urlencoded'}, body });
  const j = await r.json().catch(()=>({ok:false}));
  msg.textContent = j.ok ? 'Saved. Connecting... (wait 5-30s)' : ('Error: ' + (j.error || 'unknown'));
}

async function clearWifi(){
  const msg = document.getElementById('wifiMsg');
  msg.textContent = 'Clearing...';
  const r = await fetch('/wifi/clear', { method:'POST' });
  const j = await r.json().catch(()=>({ok:false}));
  msg.textContent = j.ok ? 'Cleared. Now disconnected.' : 'Failed to clear.';
}

async function loginDevice(){
  const u = document.getElementById('username').value.trim();
  const p = document.getElementById('password').value;
  const msg = document.getElementById('authMsg');
  msg.textContent = 'Logging in...';

  const body = new URLSearchParams();
  body.append('username', u);
  body.append('password', p);

  const r = await fetch('/auth', { method:'POST', headers:{'Content-Type':'application/x-www-form-urlencoded'}, body });
  const j = await r.json().catch(()=>({ok:false}));

  if (r.status === 200 && j.ok) {
    if (j.enrolled) msg.textContent = '✅ Device enrolled! It will start sending data.';
    else if (j.queued) msg.textContent = '✅ Saved. WiFi not connected yet — will login after WiFi connects.';
    else msg.textContent = '✅ Done.';
    document.getElementById('password').value = '';
  } else {
    msg.textContent = '❌ Login failed. Check username/password.';
  }
}

async function clearAuth(){
  const msg = document.getElementById('authMsg');
  msg.textContent = 'Clearing device key...';
  const r = await fetch('/auth/clear', { method:'POST' });
  const j = await r.json().catch(()=>({ok:false}));
  msg.textContent = j.ok ? '✅ Cleared. Login again to get new key.' : '❌ Failed.';
}
</script>
</body>
</html>
)HTML";

  html.replace("__SSID__", presetSsid);
  html.replace("__USER__", presetUser);
  return html;
}

// ================== LEDS ==================
void leds_off(){
  for (int i = 0; i < 8; i++) {
    pinMode(leds[i], OUTPUT);
    set_led(i, false);
  }
  set_led(0, true);
}

void set_led(int key, bool on) {
  if (key < 0 || key >= 8) return;
  if (led_on) digitalWrite(leds[key], on ? HIGH : LOW);
  else        digitalWrite(leds[key], on ? LOW : HIGH);
}

void show_co2_Level(int co2) {
  for (int i = 0; i < 8; i++) set_led(i, co2 >= co2_levels[i]);
}
