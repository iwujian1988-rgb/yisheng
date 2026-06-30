const authSession = require('../../services/auth/session');

const customerService = require('../../services/support/customer-service');

const tabBarNav = require('../../services/navigation/tab-bar');



const SERVICE_MENU = [

  {

    id: 'service',

    items: [

      { id: 'device', title: '设备管理', desc: '管理蓝牙设备', icon: 'mobile', action: 'device' },

      { id: 'settings', title: '传输设置', desc: '调整打字速度', icon: 'setting', action: 'settings' },

      { id: 'tutorials', title: '功能说明', desc: '教程与 FAQ', icon: 'help-circle', action: 'tutorials' }

    ]

  },

  {

    id: 'support',

    items: [

      { id: 'agreement', title: '用户协议与隐私',  icon: 'secured', action: 'agreement' },

      { id: 'service', title: '联系客服', icon: 'service', action: 'customerService' }

    ]

  }

];



function maskPhone(phone) {

  const value = String(phone || '');

  if (value.length < 7) return value;

  return value.slice(0, 3) + '****' + value.slice(-4);

}



function formatMemberEnd(iso) {

  if (!iso) return '';

  const d = new Date(iso);

  if (Number.isNaN(d.getTime())) return '';

  return `有效期至 ${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;

}



function formatMemberExpired(iso) {

  if (!iso) return '会员已过期';

  const d = new Date(iso);

  if (Number.isNaN(d.getTime())) return '会员已过期';

  return `已于 ${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日 到期`;

}



function calcRemainingDays(iso) {

  if (!iso) return -1;

  const end = new Date(iso);

  if (Number.isNaN(end.getTime())) return -1;

  end.setHours(23, 59, 59, 999);

  return Math.max(0, Math.ceil((end - Date.now()) / 86400000));

}



function resolveRemainingTagTheme(days, memberStatus) {

  if (memberStatus === 'expired' || days === 0) return 'danger';

  if (days > 0 && days <= 7) return 'warning';

  return 'success';

}



function buildMemberCardState(session) {

  const user = session.user || {};

  const memberStatus = user.memberStatus || session.serviceStatus || '';

  const memberEnd = user.memberEnd || '';

  const isActive = memberStatus === 'active' || session.purchaseStatus === 'paid';

  const isExpired = memberStatus === 'expired';



  if (isExpired) {

    return {

      isMember: false,

      isExpired: true,

      memberStatus,

      planTitle: '会员已过期',

      planDesc: '续费请联系管理员或客服',

      memberExpireText: formatMemberExpired(memberEnd),

      memberRemainingDays: 0,

      memberRemainingLabel: '已过期',

      remainingTagTheme: 'danger',

      planActionText: ''

    };

  }



  if (!isActive) {

    return {

      isMember: false,

      isExpired: false,

      memberStatus,

      planTitle: '未开通会员',

      planDesc: '请联系设备商家开通会员',

      memberExpireText: '',

      memberRemainingDays: -1,

      memberRemainingLabel: '',

      remainingTagTheme: 'default',

      planActionText: ''

    };

  }



  const remainingDays = calcRemainingDays(memberEnd);

  return {

    isMember: true,

    isExpired: false,

    memberStatus,

    planTitle: '专业会员',

    planDesc: '',

    memberExpireText: formatMemberEnd(memberEnd) || '',

    memberRemainingDays: remainingDays,

    memberRemainingLabel: remainingDays >= 0 ? `剩余 ${remainingDays} 天` : '',

    remainingTagTheme: resolveRemainingTagTheme(remainingDays, memberStatus),

    planActionText: ''

  };

}



Page({

  data: {

    statusBarHeight: 20,

    nickName: '',

    nickNameInitial: '',

    phone: '',

    isMember: false,

    isExpired: false,

    memberStatus: '',

    planTitle: '未开通会员',

    planDesc: '请联系设备商家开通会员',

    memberExpireText: '',

    memberRemainingDays: -1,

    memberRemainingLabel: '',

    remainingTagTheme: 'default',

    planActionText: '',

    menuGroups: SERVICE_MENU

  },



  onLoad() {

    const windowInfo = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync();

    this.setData({

      statusBarHeight: windowInfo.statusBarHeight || 20

    });

  },



  onShow() {

    tabBarNav.syncTabBar(this, 'pages/profile/profile');

    this.loadProfile();

  },



  loadProfile() {

    authSession.refreshCurrentSession()

      .catch(() => null)

      .then(() => {

        const session = authSession.getStoredSessionSummary();

        const user = session.user || {};

        const nickName = user.nickname || '用户';

        const memberCard = buildMemberCardState(session);

        this.setData(Object.assign({

          nickName,

          nickNameInitial: nickName.charAt(0),

          phone: maskPhone(user.phone || session.phone || '')

        }, memberCard));

      });

  },



  goEditProfile() {

    wx.navigateTo({

      url: '/pages/profile/edit?nickname=' + encodeURIComponent(this.data.nickName || '')

    });

  },



  onMenuTap(e) {

    const action = e.currentTarget.dataset.action;

    const routes = {

      device: '/pages/device/device',

      settings: '/pages/settings/transfer',

      tutorials: '/pages/tutorials/index',

      agreement: '/pages/common/agreement'

    };



    if (action === 'customerService') {

      this.contactCustomerService();

      return;

    }



    const url = routes[action];

    if (url) {

      wx.navigateTo({ url });

    }

  },



  contactCustomerService() {

    customerService.openCustomerService({

      title: '咨询开通服务',

      path: '/pages/profile/profile'

    });

  },



  logout() {

    wx.showModal({

      title: '确认退出',

      content: '退出后需要重新登录。',

      confirmText: '退出',

      confirmColor: '#F5222D',

      success: (res) => {

        if (res.confirm) {

          authSession.clearSession();

          wx.reLaunch({ url: '/pages/login/login' });

        }

      }

    });

  }

});

