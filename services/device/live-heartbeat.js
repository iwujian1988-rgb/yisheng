var liveDevice = require('../entitlements/live-device');
var client = require('../api/client');

var HEARTBEAT_INTERVAL_MS = 30 * 1000;
var timer = null;
var tickPromise = null;

function getEndpoint() {
  return '/api/devices/heartbeat';
}

function clearStoredProof() {
  try { wx.removeStorageSync('deviceLiveProof'); } catch (e) {}
}

function tick() {
  if (tickPromise) return tickPromise;
  var work = liveDevice.hasLiveBluetoothConnection().then(function (connected) {
    if (!connected) {
      clearStoredProof();
      return null;
    }
    return client.request({ url: getEndpoint(), method: 'POST' })
      .then(function (data) {
        if (data && data.liveProof) {
          wx.setStorageSync('deviceLiveProof', data.liveProof);
        } else {
          clearStoredProof();
        }
        return data;
      })
      .catch(function () {
        clearStoredProof();
        return null;
      });
  });
  tickPromise = work.then(function (data) {
    tickPromise = null;
    return data;
  }, function () {
    tickPromise = null;
    clearStoredProof();
    return null;
  });
  return tickPromise;
}

function start() {
  if (timer) return;
  tick();
  timer = setInterval(tick, HEARTBEAT_INTERVAL_MS);
}

function stop() {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
  clearStoredProof();
}

module.exports = {
  start: start,
  stop: stop,
  tick: tick
};
