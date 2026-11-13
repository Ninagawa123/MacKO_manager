// WebUSB-based FTDI driver for Kondo ICS USB Adapter HS.
// Kondo re-flashed the FT232R EEPROM with their own VID/PID so neither Apple's
// AppleUSBFTDI nor FTDI's VCP matches it, and no /dev/cu.* appears. We bypass
// the kernel driver entirely by talking to the FT232R via Chrome WebUSB:
// FTDI vendor control requests for baud/line/flow + bulk endpoints for data.
// Half-duplex echo is still consumed because the ICS bus loops TX back onto RX.

const KONDO_VID = 0x165c;
const KONDO_PID = 0x0006;

const FTDI_RESET      = 0x00;
const FTDI_MODEM_CTRL = 0x01;
const FTDI_SET_FLOW   = 0x02;
const FTDI_SET_BAUD   = 0x03;
const FTDI_SET_DATA   = 0x04;

const FTDI_PORT = 1;

function ftdiBaudParams(baud) {
  if (baud >= 3000000) return { value: 0, index: FTDI_PORT };
  if (baud >= 2000000) return { value: 1, index: FTDI_PORT };
  if (baud >= 1500000) return { value: 2, index: FTDI_PORT };
  const fracCode = [0, 3, 2, 4, 1, 5, 6, 7];
  const div8 = Math.round(3000000 * 8 / baud);
  const intPart = div8 >> 3;
  const fracPart = div8 & 7;
  const encoded = (intPart & 0x3FFF) | (fracCode[fracPart] << 14);
  const value = encoded & 0xFFFF;
  const divisorHi = (encoded >> 16) & 0xFF;
  const index = (divisorHi << 8) | FTDI_PORT;
  return { value, index };
}

function ftdiLineParams(dataBits, parity, stopBits) {
  const parityCode = { none: 0, odd: 1, even: 2, mark: 3, space: 4 }[parity] ?? 2;
  const stopCode   = { 1: 0, 1.5: 1, 2: 2 }[stopBits] ?? 0;
  return (dataBits & 0x0F) | (parityCode << 8) | (stopCode << 11);
}

class IcsSerial {
  constructor() {
    this.device = null;
    this.rxBuf = [];
    this.rxWaiters = [];
    this.readLoopRunning = false;
    this.inEp = 1;
    this.outEp = 2;
    this.onLog = () => {};
  }

  async _vendorOut(request, value, index) {
    const r = await this.device.controlTransferOut({
      requestType: "vendor",
      recipient: "device",
      request, value, index
    });
    if (r.status !== "ok") throw new Error(`control OUT req=${request} failed: ${r.status}`);
  }

  async open(baud) {
    if (!("usb" in navigator)) throw new Error("WebUSB unavailable — use Chrome.");

    const known = await navigator.usb.getDevices();
    this.device = known.find(d => d.vendorId === KONDO_VID && d.productId === KONDO_PID) || null;
    if (!this.device) {
      this.device = await navigator.usb.requestDevice({
        filters: [{ vendorId: KONDO_VID, productId: KONDO_PID }]
      });
    }
    await this.device.open();
    if (!this.device.configuration) await this.device.selectConfiguration(1);
    await this.device.claimInterface(0);

    const alt = this.device.configuration.interfaces[0].alternate;
    for (const ep of alt.endpoints) {
      if (ep.type === "bulk") {
        if (ep.direction === "in")  this.inEp  = ep.endpointNumber;
        if (ep.direction === "out") this.outEp = ep.endpointNumber;
      }
    }

    await this._vendorOut(FTDI_RESET,    0x0000, FTDI_PORT);
    const b = ftdiBaudParams(baud);
    await this._vendorOut(FTDI_SET_BAUD, b.value, b.index);
    await this._vendorOut(FTDI_SET_DATA, ftdiLineParams(8, "even", 1), FTDI_PORT);
    await this._vendorOut(FTDI_SET_FLOW, 0x0000, FTDI_PORT);
    await this._vendorOut(FTDI_RESET, 1, FTDI_PORT);
    await this._vendorOut(FTDI_RESET, 2, FTDI_PORT);

    this.rxBuf = [];
    this.rxWaiters = [];
    this.readLoopRunning = true;
    this._readLoop();
  }

  async setBaud(baud) {
    if (!this.device) throw new Error("not open");
    const b = ftdiBaudParams(baud);
    await this._vendorOut(FTDI_SET_BAUD, b.value, b.index);
    await this._vendorOut(FTDI_RESET, 1, FTDI_PORT);
    await this._vendorOut(FTDI_RESET, 2, FTDI_PORT);
    this.rxBuf = [];
  }

  async close() {
    this.readLoopRunning = false;
    try { if (this.device) await this.device.releaseInterface(0); } catch {}
    try { if (this.device) await this.device.close(); } catch {}
    this.device = null;
    this.rxBuf = [];
    this.rxWaiters.forEach(w => w.reject(new Error("closed")));
    this.rxWaiters = [];
  }

  async _readLoop() {
    while (this.readLoopRunning && this.device) {
      try {
        const r = await this.device.transferIn(this.inEp, 64);
        if (r.status !== "ok") continue;
        if (r.data.byteLength > 2) {
          const dv = r.data;
          const u8 = new Uint8Array(dv.buffer, dv.byteOffset + 2, dv.byteLength - 2);
          if (u8.length) {
            this.onLog("rx", u8);
            for (const b of u8) this.rxBuf.push(b);
            this._drainWaiters();
          }
        }
      } catch (e) {
        if (this.readLoopRunning) this.onLog("err", "readloop: " + e.message);
        break;
      }
    }
  }

  _drainWaiters() {
    for (const w of this.rxWaiters) {
      if (this.rxBuf.length >= w.n) {
        w.done = true;
        w.resolve(new Uint8Array(this.rxBuf.splice(0, w.n)));
      }
    }
    this.rxWaiters = this.rxWaiters.filter(w => !w.done);
  }

  async _readN(n, timeoutMs = 300) {
    if (this.rxBuf.length >= n) return new Uint8Array(this.rxBuf.splice(0, n));
    return new Promise((resolve, reject) => {
      const w = { n, resolve, reject, done: false };
      this.rxWaiters.push(w);
      setTimeout(() => {
        if (!w.done) {
          w.done = true;
          this.rxWaiters = this.rxWaiters.filter(x => x !== w);
          reject(new Error("timeout"));
        }
      }, timeoutMs);
    });
  }

  async txrx(tx, respN, timeoutMs = 300) {
    this.rxBuf.length = 0;
    const u8 = tx instanceof Uint8Array ? tx : new Uint8Array(tx);
    this.onLog("tx", u8);
    const r = await this.device.transferOut(this.outEp, u8);
    if (r.status !== "ok") throw new Error("TX failed: " + r.status);
    const echo = await this._readN(u8.length, timeoutMs);
    for (let i = 0; i < u8.length; i++) {
      if (echo[i] !== u8[i]) this.onLog("warn", new Uint8Array([u8[i], echo[i]]));
    }
    if (respN <= 0) return new Uint8Array();
    return await this._readN(respN, timeoutMs);
  }

  isOpen() { return !!this.device; }
}

window.icsSerial = new IcsSerial();
