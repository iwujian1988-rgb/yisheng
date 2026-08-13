(function () {
  var form = document.getElementById('claim-form');
  var phoneInput = document.getElementById('phone');
  var message = document.getElementById('message');
  form.addEventListener('submit', async function (event) {
    event.preventDefault();
    var phone = phoneInput.value.trim();
    if (!/^1[3-9]\d{9}$/.test(phone)) { message.textContent = '请输入正确的手机号'; return; }
    message.textContent = '正在提交...';
    try {
      var response = await fetch('/api/public/order-entitlements/requests', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ phone: phone }) });
      if (!response.ok) throw new Error('request failed');
      message.textContent = '已提交。请返回公众号菜单，打开小程序并点击“领取已购会员”完成微信手机号确认。';
      form.reset();
    } catch (error) {
      message.textContent = '暂时无法提交，请稍后重试或联系客服。';
    }
  });
})();
