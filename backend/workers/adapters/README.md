# OCR Command Adapters

These adapters are called by `workers/ocr-worker.example.js` through `OCR_COMMAND` and `OCR_COMMAND_ARGS`.

They read one image path and print JSON:

```json
{
  "text": "recognized text",
  "confidence": 0.93,
  "regions": []
}
```

Do not print raw images, base64 payloads, or recognized text to stderr or log files.

## PaddleOCR

Install the engine on the server:

```bash
python -m pip install paddleocr paddlepaddle
```

Run the worker:

```bash
OCR_ENGINE=paddleocr \
OCR_COMMAND=python \
OCR_COMMAND_ARGS='["backend/workers/adapters/ocr_paddle_adapter.py","{input}"]' \
node backend/workers/ocr-worker.example.js
```

Useful optional variables:

```bash
PADDLEOCR_LANG=ch
PADDLEOCR_USE_ANGLE_CLS=true
OCR_COMMAND_TIMEOUT_MS=30000
```

## RapidOCR

Install one supported RapidOCR package:

```bash
python -m pip install rapidocr
```

or:

```bash
python -m pip install rapidocr_onnxruntime
```

Run the worker:

```bash
OCR_ENGINE=rapidocr \
OCR_COMMAND=python \
OCR_COMMAND_ARGS='["backend/workers/adapters/ocr_rapid_adapter.py","{input}"]' \
node backend/workers/ocr-worker.example.js
```

## Gate Test Recommendation

For the 3-5 image gate test, run PaddleOCR first as the primary candidate, then RapidOCR as a comparison candidate. Keep the main backend unchanged; only switch these variables:

```bash
OCR_ENGINE=paddleocr
OCR_WORKER_URL=http://127.0.0.1:9001/recognize
```

The mini program must still show OCR output on the user confirmation page before draft, AI, or transfer flows.

## Single Image CLI Check

After the worker is running, test one sample image:

```bash
OCR_TEST_URL=http://127.0.0.1:9001/recognize \
node backend/scripts/ocr-image-test.js ./samples/S-01.png
```

The script prints status code, elapsed time, and the raw worker JSON. Save that output as the corresponding `Rxx_*.txt` record in the gate-test materials.
