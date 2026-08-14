# 舒克硬件固件 V3.0.10-ReliableVUC

| 小程序档位 | SPD | 字间隔 | 七键之间 | 空格前 |
|---|---|---|---|---|
| 快速 turbo | SPD1 | 180ms | 0（连打） | 5ms |
| 均衡 balanced | SPD2 | 250ms | 12ms | 10ms |
| 稳定 safe | SPD3 | 350ms | 50ms | 20ms |
| 慢速 slow | SPD4 | 350ms | 100ms | 30ms |

所有按键都使用显式的 `press → 保持 20ms → release → 至少等待 12ms`，不再调用按下/松开零间隔的 `Keyboard.write()`。这用于避免长文本期间偶发丢失 `VU` 前缀或按键一直处于按下状态。

## 烧录

打开 **`firmware\yisheng-v3\yisheng-v3.ino`**（必须在同名文件夹内）。

串口应显示：`V3.0.10-ReliableVUC 固件已就绪`
