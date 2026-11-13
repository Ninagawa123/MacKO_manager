// ICS 3.5/3.6 protocol — Kondo Kagaku KRS servos.
// Half-duplex: every TX byte echoes back before the servo response bytes arrive.
// Command byte top nibble = CMD; low 5 bits = ID (0..31).

const CMD_POS   = 0x80;
const CMD_READ  = 0xA0;
const CMD_WRITE = 0xC0;
const CMD_ID    = 0xE0;

const SC_EEPROM  = 0x00;
const SC_STRETCH = 0x01;
const SC_SPEED   = 0x02;
const SC_CURRENT = 0x03;
const SC_TEMP    = 0x04;

const SUBCMD = { stretch: SC_STRETCH, speed: SC_SPEED, current: SC_CURRENT, temp: SC_TEMP };

function idByte(cmd, id) { return (cmd & 0xE0) | (id & 0x1F); }

const Ics = {
  async setPosition(serial, id, pos) {
    const tx = new Uint8Array([
      idByte(CMD_POS, id),
      (pos >> 7) & 0x7F,
      pos & 0x7F,
    ]);
    const rx = await serial.txrx(tx, 3);
    const retPos = ((rx[1] & 0x7F) << 7) | (rx[2] & 0x7F);
    return retPos;
  },

  async readParam(serial, id, sc, timeoutMs = 300) {
    const tx = new Uint8Array([ idByte(CMD_READ, id), sc & 0x7F ]);
    const rx = await serial.txrx(tx, 3, timeoutMs);
    return rx[2];
  },

  async writeParam(serial, id, sc, val) {
    const tx = new Uint8Array([ idByte(CMD_WRITE, id), sc & 0x7F, val & 0x7F ]);
    const rx = await serial.txrx(tx, 3);
    return rx[2];
  },

  async readId(serial) {
    const tx = new Uint8Array([ 0xFF, 0x00, 0x00, 0x00 ]);
    const rx = await serial.txrx(tx, 1, 500);
    return rx[0] & 0x1F;
  },

  async writeId(serial, newId) {
    const tx = new Uint8Array([ idByte(CMD_ID, newId), 0x01, 0x01, 0x01 ]);
    const rx = await serial.txrx(tx, 1, 500);
    return rx[0] & 0x1F;
  },

  async readEeprom(serial, id) {
    const tx = new Uint8Array([ idByte(CMD_READ, id), SC_EEPROM ]);
    const rx = await serial.txrx(tx, 66, 800);
    return rx.slice(2, 66);
  },

  async writeEeprom(serial, id, data64) {
    if (data64.length !== 64) throw new Error("EEPROM must be 64 bytes");
    const tx = new Uint8Array(2 + 64);
    tx[0] = idByte(CMD_WRITE, id);
    tx[1] = SC_EEPROM;
    tx.set(data64, 2);
    const rx = await serial.txrx(tx, 2, 800);
    return rx[1];
  },
};

window.Ics = Ics;
window.ICS_SUBCMD = SUBCMD;
