function runNetworkDiagnostics() {
  return Promise.resolve([
    {
      key: 'bluetooth_adapter',
      name: '蓝牙适配器',
      status: 'pending',
      message: '等待接入蓝牙检测'
    },
    {
      key: 'device_connection',
      name: '设备连接',
      status: 'pending',
      message: '等待接入设备检测'
    },
    {
      key: 'write_characteristic',
      name: '写入特征',
      status: 'pending',
      message: '等待接入特征检测'
    },
    {
      key: 'send_latency',
      name: '发送延迟',
      status: 'pending',
      message: '等待接入延迟检测'
    }
  ]);
}

module.exports = {
  runNetworkDiagnostics
};

