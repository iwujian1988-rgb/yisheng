const TAB_INDEX = {
  'pages/home/home': 0,
  'pages/ai/detail': 1,
  'pages/templates/index': 2,
  'pages/profile/profile': 3
};

function syncTabBar(pageInstance, routeKey) {
  if (typeof pageInstance.getTabBar !== 'function') return;
  const tabBar = pageInstance.getTabBar();
  if (!tabBar || typeof tabBar.setSelected !== 'function') return;
  const index = TAB_INDEX[routeKey];
  if (index !== undefined) {
    tabBar.setSelected(index);
  }
}

module.exports = {
  syncTabBar
};
