const transferSettings = require('../../services/settings/transfer-settings');

const SERVICE_ID = '6E400001-B5A3-F393-E0A9-E50E24DCCA9E';
const WRITE_CHARACTERISTIC_FRAGMENT = '6E400002';
const NOTIFY_CHARACTERISTIC_FRAGMENT = '6E400003';
const DEFAULT_MTU = 20;
const CHUNK_DELAY_MS = 20;
const MODE_TAG = 'WIN11';

function getProtocolPrefix(speedMode) {
  const selectedSpeedMode = speedMode || transferSettings.getTransferSettings().speedMode;
  const spdTag = transferSettings.getSpdTag(selectedSpeedMode);
  return spdTag + '|' + MODE_TAG + '|';
}

function createPacket(payload, speedMode) {
  return getProtocolPrefix(speedMode) + payload;
}

function createVucPacket(value, speedMode) {
  return createPacket(value + ',', speedMode);
}

function createLetterPackets(value, speedMode) {
  return [
    createPacket(value, speedMode),
    createPacket('\n', speedMode)
  ];
}

function createSpacePacket(speedMode) {
  return createPacket(' ', speedMode);
}

function str2ab(str) {
  const buffer = new ArrayBuffer(str.length);
  const dataView = new DataView(buffer);
  for (let i = 0; i < str.length; i++) {
    dataView.setUint8(i, str.charCodeAt(i));
  }
  return buffer;
}

function splitBuffer(buffer, mtu = DEFAULT_MTU) {
  const chunks = [];
  for (let i = 0; i < buffer.byteLength; i += mtu) {
    chunks.push(buffer.slice(i, i + mtu));
  }
  return chunks;
}

function ab2hex(buffer) {
  const hexArr = [];
  const bufferArr = new Uint8Array(buffer);
  for (let i = 0; i < bufferArr.length; i++) {
    const hex = bufferArr[i].toString(16).toUpperCase().padStart(2, '0');
    hexArr.push(hex);
  }
  return hexArr.join(' ');
}

function ab2str(buffer) {
  const arr = new Uint8Array(buffer);
  let output = '';
  for (let i = 0; i < arr.length; i++) {
    output += String.fromCharCode(arr[i]);
  }
  return output;
}

module.exports = {
  SERVICE_ID,
  WRITE_CHARACTERISTIC_FRAGMENT,
  NOTIFY_CHARACTERISTIC_FRAGMENT,
  DEFAULT_MTU,
  CHUNK_DELAY_MS,
  createPacket,
  createVucPacket,
  createLetterPackets,
  createSpacePacket,
  str2ab,
  splitBuffer,
  ab2hex,
  ab2str
};

