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

const String FIRMWARE_VERSION = "V3.0.6-VMode";



USBHIDKeyboard Keyboard;

BLEServer* pServer = NULL;

BLECharacteristic* pTxCharacteristic = NULL;



#define SERVICE_UUID           "6E400001-B5A3-F393-E0A9-E50E24DCCA9E"

#define CHARACTERISTIC_UUID_RX "6E400002-B5A3-F393-E0A9-E50E24DCCA9E"

#define CHARACTERISTIC_UUID_TX "6E400003-B5A3-F393-E0A9-E50E24DCCA9E"



// VUC 七键之间间隔 + 敲空格上屏前等待（与小程序 SPD 档位联动）

int vucKeyDelayMs = 12;

int vucPreSpaceDelayMs = 5;

String currentMode = "RAW";

String bleRxBuffer;

unsigned long bleRxLastMs = 0;

const unsigned long RX_IDLE_MS = 45;



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

    vucKeyDelayMs = 0;

    vucPreSpaceDelayMs = 5;

  } else if (spdPart == "SPD2") {

    vucKeyDelayMs = 12;

    vucPreSpaceDelayMs = 10;

  } else if (spdPart == "SPD3") {

    vucKeyDelayMs = 50;

    vucPreSpaceDelayMs = 20;

  } else if (spdPart == "SPD4") {

    vucKeyDelayMs = 100;

    vucPreSpaceDelayMs = 30;

  } else {

    vucKeyDelayMs = 12;

    vucPreSpaceDelayMs = 10;

  }

}



void typeVucToken(const String& token) {

  if (vucKeyDelayMs <= 0) {

    Keyboard.print(token);

  } else {

    Keyboard.releaseAll();

    for (int k = 0; k < token.length(); k++) {

      Keyboard.write(token[k]);

      delay(vucKeyDelayMs);

    }

  }

  delay(vucPreSpaceDelayMs);

  Keyboard.write(' ');

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

    Keyboard.print(rxValue);

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

      Keyboard.releaseAll();

      for (int k = 0; k < token.length(); k++) {

        Keyboard.write(token[k]);

        delay(1);

      }

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

  USB.begin();



  BLEDevice::init("舒克无线智能外设");

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

  Serial.println("--- 舒克智能外设 V3.0.6-VMode 固件已就绪 ---");

  Serial.println("--- VUC键间: SPD1=0 SPD2=12 SPD3=50 SPD4=100ms ---");

  Serial.println("--- 空格前: SPD1=5 SPD2=10 SPD3=20 SPD4=30ms ---");

  Serial.println("--- BLE 分片重组 + 每包 Notify DONE ---");

}



void loop() {

  if (bleRxBuffer.length() > 0 && (millis() - bleRxLastMs) >= RX_IDLE_MS) {

    String packet = bleRxBuffer;

    bleRxBuffer = "";

    processIncomingBlePacket(packet);

  }

}


