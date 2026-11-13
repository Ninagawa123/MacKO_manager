// .sdt file I/O. The original Manager stores EEPROM as 64 unsignedByte entries.

function parseSdt(text) {
  const doc = new DOMParser().parseFromString(text, "application/xml");
  const err = doc.querySelector("parsererror");
  if (err) throw new Error("Invalid .sdt XML");
  const nodes = doc.querySelectorAll("eepromData > unsignedByte");
  if (nodes.length !== 64) throw new Error(".sdt must contain 64 bytes, got " + nodes.length);
  const out = new Uint8Array(64);
  nodes.forEach((n, i) => { out[i] = parseInt(n.textContent, 10) & 0xFF; });
  const verNode = doc.querySelector("IcsVersion");
  const icsVersion = verNode ? parseInt(verNode.textContent, 10) : 0;
  return { data: out, icsVersion };
}

function serializeSdt(data64, icsVersion = 0) {
  const parts = [];
  parts.push('<?xml version="1.0"?>');
  parts.push('<IcsBaseCommand xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema">');
  parts.push('  <eepromData>');
  for (let i = 0; i < 64; i++) {
    parts.push(`    <unsignedByte>${data64[i]}</unsignedByte>`);
  }
  parts.push('  </eepromData>');
  parts.push(`  <IcsVersion>${icsVersion}</IcsVersion>`);
  parts.push('</IcsBaseCommand>');
  return parts.join("\r\n");
}

window.SdtIO = { parseSdt, serializeSdt };
