# Account, Payment, And Device Architecture

## Current Decision

The mini program uses WeChat login as the primary login flow.

We no longer require SMS verification code registration for the main product path.

## Main Flow

```text
wx.login
-> backend exchanges code for openid/unionid
-> backend creates or finds user
-> backend checks paid entitlement
-> backend checks device binding
-> active users can use BLE transfer
```

Login success does not mean the user can use transfer. The user can use core transfer only when:

```text
purchaseStatus = paid
deviceBindingStatus = bound
serviceStatus = active
```

## Identity

- Primary identity: `openid`
- Cross-app identity when available: `unionid`
- Phone number: optional contact/profile field
- Paid access: backend entitlement
- Hardware ownership: activation code, admin opening, and device serial number

## Account Status

```text
unregistered
registered_not_paid
paid_not_bound
active
disabled
expired
device_conflict
```

## Purchase Status

```text
none
paid
refunded
expired
disabled
```

## Device Binding Status

```text
not_bound
bound
conflict
disabled
```

## Backend Responsibilities

- `POST /api/auth/wechat-login`
- Admin creates paid user by `phone`, `openid`, or `userId`.
- Admin imports activation code.
- User activates service with activation code after hardware purchase.
- User binds hardware serial number after service is active.
- Backend returns unified session payload to the mini program.
- Backend writes audit logs for admin opening, updates, disable/enable, and forced unbind.

## Mini Program Responsibilities

- Call `wx.login()`.
- Send `code` to backend.
- Store returned token and account status.
- Route by account status:
  - `active` -> home
  - `registered_not_paid` -> account status / activate
  - `paid_not_bound` -> device bind
  - `expired/disabled/device_conflict` -> status page

## Admin Restrictions

Admins must not:
- View plaintext medical records.
- Export plaintext medical records.
- View unredacted AI request content.

Admin pages may only show metadata such as source type, length, status, time, device serial number, and masked user identity.

## Local Development

When `app.globalData.baseUrl` is empty, `services/auth/dev-auth.js` provides a local WeChat-login fallback.

When backend is configured, the mini program calls:

```text
POST /api/auth/wechat-login
```

The backend currently uses a file store for local integration:

```text
backend/data/store.json
```

Production should replace this with Aliyun RDS MySQL.
