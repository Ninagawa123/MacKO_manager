// UI controller.
const $ = id => document.getElementById(id);

const state = {
  eeprom: new Uint8Array(64),
};

function setLang(lang) {
  localStorage.setItem("mackomgr.lang", lang);
  applyI18n();
  $("lang").value = lang;
}

function setConnected(on) {
  $("status-dot").className = "dot " + (on ? "on" : "off");
  $("status-text").textContent = t(on ? "status.connected" : "status.disconnected");
  $("btn-connect").disabled = on;
  $("btn-disconnect").disabled = !on;
}

function hex(u8) {
  return Array.from(u8).map(b => b.toString(16).padStart(2, "0")).join(" ");
}

function logLine(kind, data) {
  const out = $("log-out");
  const ts = new Date().toISOString().slice(11, 23);
  const useHex = $("log-hex").checked;
  const payload = data instanceof Uint8Array
    ? (useHex ? hex(data) : Array.from(data).join(","))
    : data;
  out.textContent += `[${ts}] ${kind.toUpperCase()}: ${payload}\n`;
  out.scrollTop = out.scrollHeight;
}

function buildEepromGrid() {
  const g = $("eeprom-grid");
  g.innerHTML = "";
  for (let i = 0; i < 64; i++) {
    const inp = document.createElement("input");
    inp.type = "number";
    inp.min = 0; inp.max = 255;
    inp.value = state.eeprom[i];
    inp.title = "offset " + i;
    inp.addEventListener("change", () => {
      state.eeprom[i] = parseInt(inp.value, 10) & 0xFF;
      refreshDecoded();
    });
    g.appendChild(inp);
  }
}

function syncEepromGrid() {
  const inputs = $("eeprom-grid").querySelectorAll("input");
  inputs.forEach((inp, i) => { inp.value = state.eeprom[i]; });
  refreshDecoded();
}

function buildBaudRadios() {
  const host = $("d-baud-radios");
  if (!host || host.children.length) return;
  for (const b of EepromMap.BAUD_CODES) {
    const label = document.createElement("label");
    const radio = document.createElement("input");
    radio.type = "radio";
    radio.name = "d-baud";
    radio.value = String(b.bps);
    label.appendChild(radio);
    label.appendChild(document.createTextNode(" " + b.label));
    host.appendChild(label);
  }
}

function syncBaudRadioFromDropdown() {
  const bps = parseInt($("baud").value, 10);
  document.querySelectorAll("#d-baud-radios input[type=radio]").forEach(r => {
    r.checked = (parseInt(r.value, 10) === bps);
  });
}

function buildFlagBits() {
  const host = $("d-flag-bits");
  if (!host || host.children.length) return;
  for (const fb of EepromMap.FLAG_BITS) {
    const label = document.createElement("label");
    if (fb.key.startsWith("resv")) label.classList.add("resv");
    if (fb.danger) label.classList.add("danger");
    if (fb.warn) label.classList.add("warn");
    const cb = document.createElement("input");
    cb.type = "checkbox";
    cb.id = "d-flag-b" + fb.bit;
    cb.dataset.flagBit = String(fb.bit);
    const span = document.createElement("span");
    span.dataset.i18n = fb.i18n;
    span.textContent = t(fb.i18n);
    label.appendChild(cb);
    label.appendChild(document.createTextNode(" "));
    label.appendChild(span);
    host.appendChild(label);
  }
}

function setFlagByte(byte) {
  for (const fb of EepromMap.FLAG_BITS) {
    const cb = $("d-flag-b" + fb.bit);
    if (!cb) continue;
    const bitSet = !!(byte & (1 << fb.bit));
    cb.checked = fb.inverted ? !bitSet : bitSet;
  }
  const hex = $("d-flag-hex");
  if (hex) hex.textContent = "0x" + (byte & 0xFF).toString(16).padStart(2, "0").toUpperCase();
}

function readFlagByte() {
  let byte = 0;
  for (const fb of EepromMap.FLAG_BITS) {
    const cb = $("d-flag-b" + fb.bit);
    if (!cb) continue;
    const bitSet = fb.inverted ? !cb.checked : cb.checked;
    if (bitSet) byte |= (1 << fb.bit);
  }
  return byte;
}

function refreshDecoded() {
  const d = EepromMap.decodeEeprom(state.eeprom);
  for (const key of Object.keys(EepromMap.MAP)) {
    if (key === "flag") { setFlagByte(d.flag); continue; }
    const el = $("d-" + key);
    if (el) el.value = d[key];
  }
}

function collectDecoded() {
  const out = {};
  for (const key of Object.keys(EepromMap.MAP)) {
    if (key === "flag") { out.flag = readFlagByte(); continue; }
    const el = $("d-" + key);
    if (!el) continue;
    const v = parseInt(el.value, 10);
    if (!Number.isNaN(v)) out[key] = v;
  }
  return out;
}

function applyDecodedToEeprom() {
  const dec = collectDecoded();
  state.eeprom = EepromMap.encodeEeprom(state.eeprom, dec);
  const inputs = $("eeprom-grid").querySelectorAll("input");
  inputs.forEach((inp, i) => { inp.value = state.eeprom[i]; });
}

async function connect() {
  try {
    const baud = parseInt($("baud").value, 10);
    icsSerial.onLog = (kind, data) => logLine(kind, data);
    await icsSerial.open(baud);
    setConnected(true);
    logLine("info", t("msg.connected"));
  } catch (e) {
    logLine("err", e.message);
  }
}

async function disconnect() {
  await icsSerial.close();
  setConnected(false);
  logLine("info", t("msg.disconnected"));
}

async function sendPosition(val) {
  const id = parseInt($("servo-id").value, 10);
  try {
    const got = await Ics.setPosition(icsSerial, id, val);
    $("pos-current").textContent = got;
  } catch (e) { logLine("err", e.message); }
}

const contSend = { pending: null, inflight: false };
async function sendPositionContinuous(val) {
  contSend.pending = val;
  if (contSend.inflight) return;
  contSend.inflight = true;
  while (contSend.pending !== null) {
    const v = contSend.pending;
    contSend.pending = null;
    try { await sendPosition(v); } catch {}
  }
  contSend.inflight = false;
}

// Bundled Kondo factory-default .sdt presets.
// NOTE: public GitHub release does NOT include the Kondo-copyrighted files.
// Users who own the Windows ICS Manager can copy the .sdt files from the
// installer's "初期値(initial value)" folder into ./presets/.
const PRESET_MODELS = [
  "KRS-2542HV", "KRS-2542R2", "KRS-2552R2", "KRS-2552RHV",
  "KRS-2572HV", "KRS-2572R2",
  "KRS-3204", "KRS-3204R2", "KRS-3301_3302", "KRS-3304", "KRS-3304R2",
  "KRS-4031HV", "KRS-4032HV", "KRS-4033HV", "KRS-4034HV",
  "KRS-5054_5053_5034_5033_5032",
  "KRS-6003R", "KRS-6003R2HV_6104", "KRS-9004HV",
];

function populatePresetModels() {
  const sel = $("preset-model");
  if (!sel || sel.children.length) return;
  for (const m of PRESET_MODELS) {
    const opt = document.createElement("option");
    opt.value = m; opt.textContent = m;
    sel.appendChild(opt);
  }
  const last = localStorage.getItem("mackomgr.lastModel");
  if (last && PRESET_MODELS.includes(last)) sel.value = last;
}

async function loadPresetSdt(model) {
  const url = "presets/" + encodeURIComponent(model) + ".sdt";
  const r = await fetch(url);
  if (!r.ok) throw new Error(`Preset fetch failed: ${model} (${r.status}) — see presets/README.md`);
  const text = await r.text();
  return SdtIO.parseSdt(text);
}

async function loadPresetToUi() {
  const model = $("preset-model").value;
  localStorage.setItem("mackomgr.lastModel", model);
  try {
    const { data } = await loadPresetSdt(model);
    state.eeprom = data;
    syncEepromGrid();
    logLine("info", `${t("msg.sdtloaded")}: ${model} (preset)`);
  } catch (e) { logLine("err", e.message); }
}

async function factoryResetServo() {
  if (!icsSerial.isOpen()) {
    logLine("err", t("msg.autoBaudNeedConnect"));
    return;
  }
  const model = $("preset-model").value;
  const id = parseInt($("servo-id").value, 10);
  const msg = t("eeprom.factoryConfirm").replace("{model}", model).replace("{id}", id);
  if (!confirm(msg)) return;
  try {
    const { data } = await loadPresetSdt(model);
    state.eeprom = data;
    syncEepromGrid();
    await Ics.writeEeprom(icsSerial, id, state.eeprom);
    localStorage.setItem("mackomgr.lastModel", model);
    logLine("info", `${t("msg.wrote")}: factory reset → ${model}`);
  } catch (e) { logLine("err", e.message); }
}

async function autoDetectBaud() {
  const btn = $("btn-baud-auto");
  btn.disabled = true;
  const wasOpen = icsSerial.isOpen();
  const hintId = parseInt($("servo-id").value, 10);
  const bauds = [1250000, 625000, 115200];
  const ids = [hintId, ...Array.from({length: 32}, (_, i) => i).filter(i => i !== hintId)];
  const found = { baud: null, id: null, stretch: null };
  try {
    if (!wasOpen) {
      icsSerial.onLog = (kind, data) => logLine(kind, data);
      await icsSerial.open(115200);
    }
    logLine("info", t("msg.autoBaudStart"));
    outer: for (const b of bauds) {
      await icsSerial.setBaud(b);
      await new Promise(r => setTimeout(r, 20));
      logLine("info", `… ${b} bps`);
      for (const id of ids) {
        try {
          const v = await Ics.readParam(icsSerial, id, ICS_SUBCMD.stretch, 80);
          if (v >= 1 && v <= 127) {
            found.baud = b; found.id = id; found.stretch = v;
            break outer;
          }
        } catch {}
      }
    }
    if (found.baud !== null) {
      $("baud").value = String(found.baud);
      $("servo-id").value = String(found.id);
      $("id-current").textContent = "ID = " + found.id;
      syncBaudRadioFromDropdown();
      setConnected(true);
      logLine("info", `${t("msg.autoBaudOk")}: baud=${found.baud}, id=${found.id} (stretch=${found.stretch})`);
      return;
    }
    logLine("err", t("msg.autoBaudFail"));
    if (!wasOpen) {
      await icsSerial.close();
      setConnected(false);
    }
  } catch (e) {
    logLine("err", e.message);
    if (!wasOpen) {
      try { await icsSerial.close(); } catch {}
      setConnected(false);
    }
  } finally {
    btn.disabled = false;
  }
}

function wireUp() {
  $("lang").addEventListener("change", e => setLang(e.target.value));
  $("btn-connect").addEventListener("click", connect);
  $("btn-disconnect").addEventListener("click", disconnect);
  $("btn-baud-auto").addEventListener("click", autoDetectBaud);

  $("pos-slider").addEventListener("input", e => {
    $("pos-value").value = e.target.value;
    if ($("pos-continuous").checked && icsSerial.isOpen()) {
      sendPositionContinuous(parseInt(e.target.value, 10));
    }
  });
  $("pos-value").addEventListener("input", e => {
    $("pos-slider").value = e.target.value;
    if ($("pos-continuous").checked && icsSerial.isOpen()) {
      sendPositionContinuous(parseInt(e.target.value, 10));
    }
  });
  $("btn-pos-send").addEventListener("click", () => sendPosition(parseInt($("pos-value").value, 10)));
  $("btn-pos-center").addEventListener("click", () => {
    $("pos-slider").value = 7500;
    $("pos-value").value = 7500;
    sendPosition(7500);
  });
  $("btn-pos-free").addEventListener("click", () => {
    $("pos-continuous").checked = false;
    sendPosition(0);
  });

  document.querySelectorAll(".p-read").forEach(btn => btn.addEventListener("click", async () => {
    const id = parseInt($("servo-id").value, 10);
    const key = btn.dataset.param;
    try {
      const v = await Ics.readParam(icsSerial, id, ICS_SUBCMD[key]);
      $("p-" + key).value = v;
      logLine("info", `${key} = ${v}`);
    } catch (e) { logLine("err", e.message); }
  }));
  document.querySelectorAll(".p-write").forEach(btn => btn.addEventListener("click", async () => {
    const id = parseInt($("servo-id").value, 10);
    const key = btn.dataset.param;
    const v = parseInt($("p-" + key).value, 10);
    try {
      await Ics.writeParam(icsSerial, id, ICS_SUBCMD[key], v);
      logLine("info", t("msg.wrote") + ` ${key}=${v}`);
    } catch (e) { logLine("err", e.message); }
  }));

  $("btn-id-read").addEventListener("click", async () => {
    try {
      const id = await Ics.readId(icsSerial);
      $("id-current").textContent = "ID = " + id;
      $("servo-id").value = id;
    } catch (e) { logLine("err", e.message); }
  });
  $("btn-id-write").addEventListener("click", async () => {
    const newId = parseInt($("id-new").value, 10);
    try {
      const got = await Ics.writeId(icsSerial, newId);
      $("id-current").textContent = "ID = " + got;
      $("id-result").textContent = "wrote → " + got;
      $("servo-id").value = got;
    } catch (e) { logLine("err", e.message); }
  });

  $("btn-eeprom-read").addEventListener("click", async () => {
    const id = parseInt($("servo-id").value, 10);
    try {
      const data = await Ics.readEeprom(icsSerial, id);
      state.eeprom = data;
      syncEepromGrid();
      logLine("info", t("msg.read"));
    } catch (e) { logLine("err", e.message); }
  });

  populatePresetModels();
  $("btn-preset-load").addEventListener("click", loadPresetToUi);
  $("btn-factory-reset").addEventListener("click", factoryResetServo);

  document.querySelectorAll("#eeprom-decoded .dec").forEach(el => {
    el.addEventListener("change", applyDecodedToEeprom);
  });
  document.querySelectorAll("#d-flag-bits input[type=checkbox]").forEach(cb => {
    cb.addEventListener("change", () => {
      setFlagByte(readFlagByte());
      applyDecodedToEeprom();
    });
  });
  document.querySelectorAll("#d-baud-radios input[type=radio]").forEach(r => {
    r.addEventListener("change", () => {
      $("baud").value = r.value;
    });
  });
  $("baud").addEventListener("change", syncBaudRadioFromDropdown);

  $("btn-eeprom-write").addEventListener("click", async () => {
    applyDecodedToEeprom();
    const id = parseInt($("servo-id").value, 10);
    try {
      await Ics.writeEeprom(icsSerial, id, state.eeprom);
      logLine("info", t("msg.wrote"));
    } catch (e) { logLine("err", e.message); }
  });

  $("btn-sdt-load").addEventListener("click", () => $("file-sdt").click());
  $("file-sdt").addEventListener("change", async e => {
    const f = e.target.files[0];
    if (!f) return;
    const text = await f.text();
    try {
      const { data } = SdtIO.parseSdt(text);
      state.eeprom = data;
      syncEepromGrid();
      logLine("info", t("msg.sdtloaded") + ": " + f.name);
    } catch (err) { logLine("err", err.message); }
    e.target.value = "";
  });
  $("btn-sdt-save").addEventListener("click", () => {
    const text = SdtIO.serializeSdt(state.eeprom, 0);
    const blob = new Blob([text], { type: "application/xml" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "servo.sdt";
    a.click();
    logLine("info", t("msg.sdtsaved"));
  });

  $("btn-log-clear").addEventListener("click", () => $("log-out").textContent = "");
}

document.addEventListener("DOMContentLoaded", () => {
  buildFlagBits();
  buildBaudRadios();
  syncBaudRadioFromDropdown();
  setLang(localStorage.getItem("mackomgr.lang") || "ja");
  wireUp();
  state.eeprom.fill(0);
  buildEepromGrid();
  refreshDecoded();
  if (!("usb" in navigator)) {
    logLine("err", "WebUSB not available. Use Chrome (not Safari) on macOS/Linux.");
  }
});
