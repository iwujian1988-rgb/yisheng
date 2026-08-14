#include <BLEDevice.h>

#include <BLEServer.h>

#include <BLEUtils.h>

#include <BLE2902.h>

#include <WiFi.h>

#include <HTTPClient.h>

#include <Update.h>

#include "USB.h"

#include "USBHIDKeyboard.h"



// ==========================================

// 1. 全局常数与版本定义

// ==========================================

const String FIRMWARE_VERSION = "V3.0.10-ReliableVUC";



USBHIDKeyboard Keyboard;

BLEServer* pServer = NULL;

BLECharacteristic* pTxCharacteristic = NULL;



#define SERVICE_UUID           "6E400001-B5A3-F393-E0A9-E50E24DCCA9E"

#define CHARACTERISTIC_UUID_RX "6E400002-B5A3-F393-E0A9-E50E24DCCA9E"

#define CHARACTERISTIC_UUID_TX "6E400003-B5A3-F393-E0A9-E50E24DCCA9E"



// VUC 七键之间间隔 + 敲空格上屏前等待（与小程序 SPD 档位联动）

int vucKeyDelayMs = 12;

int vucPreSpaceDelayMs = 5;

int vucPrefixDelayMs = 45;

String currentMode = "RAW";

String bleRxBuffer;

unsigned long bleRxLastMs = 0;

const unsigned long RX_IDLE_MS = 45;

// USBHIDKeyboard::write() sends key-down and key-up back-to-back. During a
// long transfer one of those reports can occasionally be missed by the host,
// causing missing VUC prefixes or a visibly stuck key. Hold every key across
// multiple USB frames and leave a release gap before pressing the next key.
const int HID_TEXT_KEY_HOLD_MS = 16;
const int HID_VUC_KEY_HOLD_MS = 28;
const int HID_RELEASE_GAP_MS = 12;



// ==========================================

// 2. 核心辅助工具函数

// ==========================================



String getDeviceMAC() {

  uint8_t mac[6];

  WiFi.macAddress(mac);

  char macStr[13];

  snprintf(macStr, sizeof(macStr), "%02X%02X%02X%02X%02X%02X", mac[0], mac[1], mac[2], mac[3], mac[4], mac[5]);

  return String(macStr);

}



void applySpdProfile(const String& spdPart) {

  // 与小程序 transfer-settings.js 中 VUC_KEY_DELAY_MS / VUC_PRE_SPACE_DELAY_MS 保持一致

  if (spdPart == "SPD1") {

    vucKeyDelayMs = 12;

    vucPreSpaceDelayMs = 12;

    vucPrefixDelayMs = 30;

  } else if (spdPart == "SPD2") {

    vucKeyDelayMs = 20;

    vucPreSpaceDelayMs = 20;

    vucPrefixDelayMs = 45;

  } else if (spdPart == "SPD3") {

    vucKeyDelayMs = 28;

    vucPreSpaceDelayMs = 28;

    vucPrefixDelayMs = 65;

  } else if (spdPart == "SPD4") {

    vucKeyDelayMs = 40;

    vucPreSpaceDelayMs = 40;

    vucPrefixDelayMs = 90;

  } else {

    vucKeyDelayMs = 20;

    vucPreSpaceDelayMs = 20;

    vucPrefixDelayMs = 45;

  }

}



void tapKeyReliably(uint8_t key, int interKeyDelayMs, int holdMs = HID_TEXT_KEY_HOLD_MS) {

  const int releaseDelayMs = interKeyDelayMs > HID_RELEASE_GAP_MS

    ? interKeyDelayMs

    : HID_RELEASE_GAP_MS;

  Keyboard.press(key);

  delay(holdMs);

  Keyboard.release(key);

  delay(releaseDelayMs);

}



void typeTextReliably(const String& text, int interKeyDelayMs) {

  for (int k = 0; k < text.length(); k++) {

    tapKeyReliably(text[k], interKeyDelayMs);

  }

}



void typeVucToken(const String& token) {

  // Clear a potentially stale key once per Unicode token. Sending an extra
  // empty HID report before every key doubled USB traffic and still allowed
  // Windows Pinyin to lose an occasional hexadecimal digit on long text.
  Keyboard.releaseAll();

  delay(HID_RELEASE_GAP_MS);

  const int prefixLength = token.length() >= 3 ? 3 : token.length();

  for (int k = 0; k < prefixLength; k++) {

    tapKeyReliably(token[k], vucKeyDelayMs, HID_VUC_KEY_HOLD_MS);

  }

  // Give Microsoft Pinyin time to enter Unicode mode before the code point.
  delay(vucPrefixDelayMs);

  for (int k = prefixLength; k < token.length(); k++) {

    tapKeyReliably(token[k], vucKeyDelayMs, HID_VUC_KEY_HOLD_MS);

  }

  delay(vucPreSpaceDelayMs);

  tapKeyReliably(' ', vucKeyDelayMs, HID_VUC_KEY_HOLD_MS);

}



void notifyDone() {

  if (pTxCharacteristic != NULL) {

    pTxCharacteristic->setValue("DONE");

    pTxCharacteristic->notify();

  }

}



void performOTA(String ssid, String pass, String url) {

  Serial.println("【OTA】开始连接 Wi-Fi 热点...");

  WiFi.begin(ssid.c_str(), pass.c_str());



  int counter = 0;

  while (WiFi.status() != WL_CONNECTED) {

    delay(500);

    Serial.print(".");

    counter++;

    if (counter > 24) {

      Serial.println("\n【OTA】Wi-Fi 连接超时，升级终止。");

      return;

    }

  }

  Serial.println("\n【OTA】Wi-Fi 连接成功，正在请求云端固件包...");



  HTTPClient http;

  http.begin(url);

  int httpCode = http.GET();



  if (httpCode == HTTP_CODE_OK) {

    int contentLength = http.getSize();

    bool canBegin = Update.begin(contentLength);



    if (canBegin) {

      Serial.println("【OTA】开始安全写入新固件到 Flash 分区...");

      WiFiClient* client = http.getStreamPtr();

      size_t written = Update.writeStream(*client);



      if (written == contentLength) {

        Serial.println("【OTA】固件写入流完整！共 " + String(written) + " 字节");

      } else {

        Serial.println("【OTA】数据写入不完整，包体可能损坏。");

      }



      if (Update.end()) {

        if (Update.isFinished()) {

          Serial.println("【OTA】升级校验成功！硬件将在2秒后自动重启上线新固件...");

          delay(2000);

          ESP.restart();

        } else {

          Serial.println("【OTA】升级未完成。");

        }

      } else {

        Serial.println("【OTA】校验错误，代码: " + String(Update.getError()));

      }

    } else {

      Serial.println("【OTA】硬件闪存分区空间不足，升级终止。");

    }

  } else {

    Serial.println("【OTA】HTTP 网络请求失败，错误码: " + String(httpCode));

  }

  http.end();

}



// ==========================================

// 3. 蓝牙接收数据状态机

// ==========================================

void processIncomingBlePacket(String rxValue) {

  if (rxValue.length() == 0) return;



  if (rxValue == "GET_VER") {

    String verReply = "VERSION:" + FIRMWARE_VERSION + "|MAC:" + getDeviceMAC();

    pTxCharacteristic->setValue(verReply.c_str());

    pTxCharacteristic->notify();

    Serial.println("【系统】已上报资产信息: " + verReply);

    return;

  }



  if (rxValue.startsWith("UPDATE|")) {

    int firstPipe = rxValue.indexOf('|');

    int secondPipe = rxValue.indexOf('|', firstPipe + 1);

    int thirdPipe = rxValue.indexOf('|', secondPipe + 1);



    String ssid = rxValue.substring(firstPipe + 1, secondPipe);

    String pass = rxValue.substring(secondPipe + 1, thirdPipe);

    String url = rxValue.substring(thirdPipe + 1);



    performOTA(ssid, pass, url);

    return;

  }



  int firstPipe = rxValue.indexOf('|');

  int secondPipe = rxValue.indexOf('|', firstPipe + 1);



  if (firstPipe == -1 || secondPipe == -1) {

    typeTextReliably(rxValue, HID_RELEASE_GAP_MS);

    notifyDone();

    return;

  }



  String spdPart = rxValue.substring(0, firstPipe);

  String modePart = rxValue.substring(firstPipe + 1, secondPipe);

  String textPart = rxValue.substring(secondPipe + 1);



  applySpdProfile(spdPart);

  currentMode = modePart;



  int pos = 0;

  while (pos < textPart.length()) {

    int nextComma = textPart.indexOf(',', pos);

    if (nextComma == -1) nextComma = textPart.length();

    String token = textPart.substring(pos, nextComma);

    pos = nextComma + 1;

    if (token.length() == 0) continue;



    if ((token.startsWith("v") || token.startsWith("V")) && (currentMode == "WIN11" || currentMode == "WIN10")) {

      typeVucToken(token);

    } else {

      typeTextReliably(token, HID_RELEASE_GAP_MS);

    }

  }

  notifyDone();

}



class MyCallbacks: public BLECharacteristicCallbacks {

    void onWrite(BLECharacteristic *pCharacteristic) {

      String rxValue = pCharacteristic->getValue();

      if (rxValue.length() == 0) return;

      bleRxBuffer += rxValue;

      bleRxLastMs = millis();

    }

};



class MyServerCallbacks: public BLEServerCallbacks {

    void onConnect(BLEServer* pServer) {

      Serial.println("【蓝牙】小程序端已成功握手连接。");

    };



    void onDisconnect(BLEServer* pServer) {

      Serial.println("【蓝牙】断开连接，重新释放广播空闲。");

      pServer->getAdvertising()->start();

    }

};



// ==========================================

// 4. 系统初始化入口

// ==========================================

void setup() {

  Serial.begin(115200);

  Keyboard.begin();

  // 必须调 USB.begin()：TinyUSB descriptor 在这里生成，
  // Keyboard.begin() 已注册 HID interface，USB.begin() 才会把它加入 descriptor，
  // Windows 才会把板子识别为 HID 键盘。
  // 之前 4ded543 误删了这行，导致 BLE 通了但 HID 输出不到电脑。

  USB.begin();

  delay(500);  // 等 Windows 端枚举完成，避免首条打印被吞



  // BLE 设备名必须等于后端 devices 表里的 serialNo 才能自动登记
  BLEDevice::init("DEV-SERIAL-001");

  pServer = BLEDevice::createServer();

  pServer->setCallbacks(new MyServerCallbacks());

  BLEService *pService = pServer->createService(SERVICE_UUID);



  BLECharacteristic *pRxCharacteristic = pService->createCharacteristic(

                                         CHARACTERISTIC_UUID_RX,

                                         BLECharacteristic::PROPERTY_WRITE |

                                         BLECharacteristic::PROPERTY_WRITE_NR

                                       );

  pRxCharacteristic->setCallbacks(new MyCallbacks());



  pTxCharacteristic = pService->createCharacteristic(

                                        CHARACTERISTIC_UUID_TX,

                                        BLECharacteristic::PROPERTY_NOTIFY

                                      );

  pTxCharacteristic->addDescriptor(new BLE2902());



  pService->start();

  pServer->getAdvertising()->start();

  Serial.println("--- 舒克智能外设 " + FIRMWARE_VERSION + " 固件已就绪 ---");

  Serial.println("--- VUC键间: SPD1=12 SPD2=20 SPD3=28 SPD4=40ms ---");

  Serial.println("--- 空格前: SPD1=12 SPD2=20 SPD3=28 SPD4=40ms ---");

  Serial.println("--- HID按键: 普通16ms/VUC 28ms + 松开间隔，逐字仅清键一次 ---");

  Serial.println("--- BLE 分片重组 + 每包 Notify DONE ---");

}



void loop() {

  if (bleRxBuffer.length() > 0 && (millis() - bleRxLastMs) >= RX_IDLE_MS) {

    String packet = bleRxBuffer;

    bleRxBuffer = "";

    processIncomingBlePacket(packet);

  }

}


