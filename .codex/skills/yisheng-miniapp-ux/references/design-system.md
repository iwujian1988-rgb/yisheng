# Yisheng Mini Program Design System

## Semantic Tokens

| Role | Value | Use |
| --- | --- | --- |
| Brand | `#6F3DFF` | Primary actions, selected state, focus |
| Brand deep | `#4A2BB8` | Active state, strong emphasis |
| Brand soft | `#F2EDFF` | Soft fills, selected backgrounds |
| Page | `#FCFBFF` | Page background |
| Surface | `#FFFFFF` | Cards, sheets, inputs |
| Foreground | `#101936` | Titles and primary copy |
| Muted | `#64739A` | Supporting copy and metadata |
| Placeholder | `#98A1B8` | Placeholder and tertiary copy |
| Border | `rgba(111, 61, 255, 0.12)` | Card and section boundaries |
| Success | `#18D28B` | Completed and healthy states |

Use 32rpx page-side spacing, 20rpx inputs, 24-28rpx cards, and `999rpx` primary buttons. Use 88rpx as the normal minimum touch height. Prefer a 12/16/20/24/32/40rpx spacing rhythm.

## Page Recipes

- List: compact header, optional filter surface, bordered item cards, clear empty state, stable bottom safe area.
- Form: grouped white sections, labels above controls, visible validation copy, one dominant sticky or terminal action.
- Detail: strong title block, metadata separated from body, related actions grouped by priority.
- Result: centered status identity, readable result surface, primary next action followed by a secondary recovery action.
- Settings: grouped rows with consistent hit areas, quiet separators, destructive actions isolated.
- Admin/operations: tighter spacing and smaller radii are allowed; retain palette, state colors, and control hierarchy.

## State Quality

- Loading must preserve context and prevent duplicate submission.
- Empty states explain what is missing and, when possible, the next action.
- Errors use concise recovery copy and do not rely on color alone.
- Disabled actions remain readable but clearly inactive.
- Success confirms completion and makes the next step obvious.
- Recording, scanning, streaming, and upload motion must stop under reduced-motion preferences.

## Avoid

- Legacy blue primary colors such as `#1677FF`, `#1890FF`, and `#0052D9`.
- Raw `px` units in page styles.
- White cards that disappear into the page because they have neither border nor deliberate elevation.
- Multiple equally prominent primary actions in one viewport.
- Style-only edits that rename classes, events, conditions, fields, or routes.
