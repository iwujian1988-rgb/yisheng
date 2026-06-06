function getTutorialsByCategory(category) {
  return Promise.resolve([]);
}

function getTutorialDetail(id) {
  return Promise.resolve({
    id,
    title: '',
    steps: [],
    notices: []
  });
}

function getConnectGuide() {
  return Promise.resolve({
    steps: []
  });
}

module.exports = {
  getTutorialsByCategory,
  getTutorialDetail,
  getConnectGuide
};
