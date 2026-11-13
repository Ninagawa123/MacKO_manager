// EEPROM nibble layout for ICS 3.5/3.6.
// 64 nibbles (each stored as a byte 0-15) combine pair-wise into 32 effective bytes.

function nibblesToBytes(nibs) {
  const out = new Uint8Array(32);
  for (let i = 0; i < 32; i++) {
    out[i] = ((nibs[i * 2] & 0x0F) << 4) | (nibs[i * 2 + 1] & 0x0F);
  }
  return out;
}

function bytesToNibbles(bytes32) {
  const out = new Uint8Array(64);
  for (let i = 0; i < 32; i++) {
    out[i * 2]     = (bytes32[i] >> 4) & 0x0F;
    out[i * 2 + 1] = bytes32[i] & 0x0F;
  }
  return out;
}

// Kondo ICS 3.5/3.6 EEPROM byte map, matched against the Windows Manager
// readback. Stretch-family parameters are stored as 2× the UI value, so the
// `scale: 2` entries divide on decode and multiply on encode.
// Baud is NOT in EEPROM — baud change needs a separate command.
const EEPROM_MAP = {
  stretch:        { byte: 1,  kind: "u8", scale: 2 },
  speed:          { byte: 2,  kind: "u8" },
  punch:          { byte: 3,  kind: "u8" },
  deadband:       { byte: 4,  kind: "u8" },
  damping:        { byte: 5,  kind: "u8" },
  safetimer:      { byte: 6,  kind: "u8" },
  flag:           { byte: 7,  kind: "u8" },
  poslimitH:      { byte: 8,  kind: "u16be" },
  poslimitL:      { byte: 10, kind: "u16be" },
  temp:           { byte: 14, kind: "u8" },
  current:        { byte: 15, kind: "u8" },
  version:        { byte: 16, kind: "u8", readOnly: true },
  rspns:          { byte: 25, kind: "u8" },
  offset:         { byte: 26, kind: "i8" },
  id:             { byte: 28, kind: "id" },
  charStretch1:   { byte: 29, kind: "u8", scale: 2 },
  charStretch2:   { byte: 30, kind: "u8", scale: 2 },
  charStretch3:   { byte: 31, kind: "u8", scale: 2 },
};

const BAUD_CODES = [
  { value: 0,  bps: 1250000, label: "1.25Mbps" },
  { value: 1,  bps:  625000, label: "625Kbps"  },
  { value: 10, bps:  115200, label: "115.2Kbps"},
];

function decodeEeprom(nibs) {
  const b = nibblesToBytes(nibs);
  const out = {};
  for (const [k, m] of Object.entries(EEPROM_MAP)) {
    const raw = b[m.byte];
    let v;
    if (m.kind === "u8") v = raw;
    else if (m.kind === "i8") v = raw >= 128 ? raw - 256 : raw;
    else if (m.kind === "u16be") v = (b[m.byte] << 8) | b[m.byte + 1];
    else if (m.kind === "id") v = raw & 0x1F;
    if (m.scale && m.scale > 1) v = Math.round(v / m.scale);
    out[k] = v;
  }
  return out;
}

function encodeEeprom(currentNibs, dec) {
  const b = nibblesToBytes(currentNibs);
  for (const [k, m] of Object.entries(EEPROM_MAP)) {
    if (m.readOnly) continue;
    let v = dec[k];
    if (v === undefined || v === null || Number.isNaN(v)) continue;
    if (m.scale && m.scale > 1) v = v * m.scale;
    if (m.kind === "u8") b[m.byte] = v & 0xFF;
    else if (m.kind === "i8") b[m.byte] = (v < 0 ? v + 256 : v) & 0xFF;
    else if (m.kind === "u16be") {
      b[m.byte]     = (v >> 8) & 0xFF;
      b[m.byte + 1] = v & 0xFF;
    } else if (m.kind === "id") {
      b[m.byte] = (b[m.byte] & ~0x1F) | (v & 0x1F);
    }
  }
  const outNibs = bytesToNibbles(b);
  outNibs[0] = currentNibs[0];
  outNibs[1] = currentNibs[1];
  return outNibs;
}

// Flag byte bits for ICS 3.5/3.6.
// `inverted: true` → UI-checked corresponds to the bit being CLEAR (0).
const FLAG_BITS = [
  { bit: 0, key: "reverse",    i18n: "flag.reverse" },
  { bit: 1, key: "slave",      i18n: "flag.slave",       inverted: true },
  { bit: 2, key: "rotation",   i18n: "flag.rotation",    inverted: true },
  { bit: 3, key: "serial_only",i18n: "flag.serial_only", warn: true },
  { bit: 4, key: "pwm_mode",   i18n: "flag.pwm_mode" },
  { bit: 5, key: "resv5",      i18n: "flag.resv" },
  { bit: 6, key: "resv6",      i18n: "flag.resv" },
  { bit: 7, key: "resv7",      i18n: "flag.resv" },
];

window.EepromMap = { nibblesToBytes, bytesToNibbles, decodeEeprom, encodeEeprom, MAP: EEPROM_MAP, FLAG_BITS, BAUD_CODES };
