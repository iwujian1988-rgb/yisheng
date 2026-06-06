function getProfile() {
  return Promise.resolve(wx.getStorageSync('userInfo') || null);
}

function saveProfile(profile) {
  const current = wx.getStorageSync('userInfo') || {};
  const nextProfile = Object.assign({}, current, profile);
  wx.setStorageSync('userInfo', nextProfile);
  return Promise.resolve(nextProfile);
}

module.exports = {
  getProfile,
  saveProfile
};

