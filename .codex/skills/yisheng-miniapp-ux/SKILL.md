---
name: yisheng-miniapp-ux
description: Redesign, create, review, or audit Yisheng WeChat Mini Program pages while preserving business logic. Use for WXML/WXSS/TDesign work, homepage visual consistency, page states, interaction polish, responsive spacing, or design-system maintenance in this repository.
---

# Yisheng Mini Program UX

Use the homepage as the visual source of truth and improve experience without changing routes, bindings, API calls, data fields, permissions, or event behavior.

## Workflow

1. Read `pages/home/home.wxml`, `pages/home/home.wxss`, and `app.wxss` before editing.
2. Inspect the target WXML, WXSS, JSON, and JS together. Treat JS as read-only unless the user explicitly requests behavior changes.
3. Classify the page as list, form, detail, result, settings, or admin/operations.
4. Load [references/design-system.md](references/design-system.md) and apply its tokens and page recipe.
5. Preserve every `bind*`, `catch*`, `wx:*`, `data-*`, route, field name, condition, and component property unless a behavior change is requested.
6. Reuse existing TDesign components and repository assets. Do not add decorative images without a clear information or brand role.
7. Check loading, empty, error, disabled, success, and safe-area behavior where those states already exist in page logic.
8. Run `node .codex/skills/yisheng-miniapp-ux/scripts/audit-styles.mjs` from the repository root.
9. Parse JSON, syntax-check any changed JS, run `git diff --check`, and review the final diff for logic changes.

## Design Rules

- Use `rpx`, semantic tokens, restrained elevation, and purposeful hierarchy.
- Keep primary actions pill-shaped and visually dominant; keep secondary actions quieter.
- Use white cards on `#FCFBFF`, purple-tinted borders, and spacing instead of excessive shadows.
- Use motion for state or hierarchy feedback, not decoration. Honor reduced-motion preferences.
- Keep admin and analytics pages denser than consumer pages while preserving the same palette and component language.
- Do not introduce gradients, glass effects, floating decorative blobs, or unrelated illustration styles unless the existing page concept requires them.
- Do not refactor business code during a visual task.

## Completion Standard

Finish only when the static audit passes, changed JSON/JS is valid, the diff contains no accidental logic edits, and any visual verification gap is stated clearly.
