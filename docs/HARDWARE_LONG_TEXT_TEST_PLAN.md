# Hardware Long Text Test Plan

## Acceptance Target

- 3000 Chinese characters transferred within 120 seconds.
- No missing characters.
- No duplicated characters.
- No obvious ordering errors.
- User can cancel safely during transfer.

## Test Environments

Test at least these computer environments:

- Windows 10 normal input box.
- Windows 11 normal input box.
- Browser-based hospital system.
- Remote desktop.
- Virtual machine.
- Unknown or mixed environment.

## Test Modes

Run each environment with:

- Safe speed.
- Balanced speed.
- Fast speed.
- WIN10 system mode.
- WIN11 system mode.
- RAW mode only when needed for troubleshooting.

## Test Data

Use generated non-medical text only.

Rules:

- Do not use real patient information.
- Do not use real medical records.
- Do not use simulated medical cases.
- Use deterministic segment labels so missing or duplicated content can be detected.

Recommended pattern:

```text
测试段落0001，用于传输压测，不包含医疗内容。
测试段落0002，用于传输压测，不包含医疗内容。
测试段落0003，用于传输压测，不包含医疗内容。
```

Generate until the target length reaches 3000 Chinese characters. The project service `services/qa/long-text.js` already provides a non-medical generated fixture.

## Metrics

Record:

- Device serial.
- Firmware version.
- System mode.
- Speed mode.
- Computer environment.
- Character count.
- Start time.
- End time.
- Elapsed milliseconds.
- Success or failure.
- Missing segment count.
- Duplicate segment count.
- User cancellation behavior.
- Notes.

## Manual Test Flow

1. Insert hardware into target computer.
2. Open target input area.
3. Confirm cursor focus.
4. Connect mini program to device.
5. Create a 3000-character QA task from the mini program.
6. Start transfer.
7. Time from first send action to final character appearing.
8. Compare output with source text.
9. Save test result.

## Pass Criteria

Pass when:

- `elapsedMs <= 120000`.
- Output exactly matches source text.
- No crash or stuck sending state.
- Cancel button works when tested separately.

## Failure Categories

- `device_disconnected`
- `computer_not_focused`
- `text_too_long`
- `write_timeout`
- `missing_characters`
- `duplicated_characters`
- `wrong_order`
- `unknown`

## Next Codex Work

- Connect generated long-text fixture to the real send flow.
- Add output comparison entry after manual paste verification.
- Add hardware runbook for WeChat Developer Tools and real devices.
- Save elapsed time, pass/fail status and failure category into QA records.
