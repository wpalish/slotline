# SlotLine design contract · 26 October 2026

Current direction: **Precise appointment agenda**. This replaces the former shared public-register visual tokens for this increment. The ten-product pre-release contract and actual module.js fields govern content; the SabaqLoop editorial design is not a template for this product.

## Screen job and composition

The default section is the schedule, ahead of services and staff. Saved appointments are grouped by their stored local date, then ordered by actual start time. Each row shows start and offset, visitor, service, staff, duration, buffer, server-calculated end and saved status. Date and staff selects refine the agenda without changing saved data. Services and staff keep their accessible supporting tables.

The end comes from the saved server end value and is displayed in the appointment offset. If it crosses local midnight, the end date is explicit. A passed interval is not labelled completed. Cancelled and archived are independent saved states; buffer is not presented as meeting duration.

## Visual system

Dark ink top bar, cool white schedule, blue time and selection accents. Tabular monospace time is paired with Segoe/system interface text.

The normative semantic palette is the product-specific `:root` at the end of public/styles.css. Shared semantic roles are `--label`, `--label-secondary`, `--bg`, `--surface`, `--accent`, `--accent-hover`, `--accent-wash`, `--separator`, `--field-border`, `--focus`, `--error` and `--error-ground`. Spacing uses a 4px base and 8px multiples. Large titles tighten tracking, small supporting text keeps a relaxed line height, and numeric balances/times use tabular digits. Body text is 16px by browser default. Supporting labels never replace field labels. There are no custom font downloads, paid assets, gradients, ornamental charts, fake KPIs or integration badges.

The apple-design and frontend-ui-engineering skill guidance informs semantic roles, optical typography, clear interaction states and restrained surfaces. Existing product fields/code are the available reference evidence; no new approved visual comp or external reference catalogue was supplied. Layout and palette are implementation choices subject to browser review. System fonts require no bundled font license.

## Responsive and interaction rules

Wide agenda rows show time, meeting, end and action in one line. Below 1100px the open action moves under the content. At 390px time remains a narrow leading column and the action spans the card. The two filters stack; rows are never a horizontal calendar canvas.

Buttons, inputs, selects and disclosure summaries have a minimum 44px interaction height. Every control uses visible keyboard focus. Search and archive operate on the same saved collections as before. Zero-data and no-match states preserve dependency links/create actions and clear-filter recovery. Pending actions disable their initiating control, show a waiting label and expose `aria-busy`. Errors remain focused and visible without discarding the edited form. The edit heading receives focus when opened. No modal, animation library or new dependency is introduced. Reduced motion removes active translation; contrast preference strengthens dividers and secondary ink. This increment is designed as a light workspace.

The calculated-data summary is a disclosure after the primary view, preserving the original server summary without duplicating it as a dashboard. Supporting collections may retain contained, labelled tables. All domain values are inserted through `textContent`, native options or existing safe form controls. Server authentication, roles, CSRF, revision checks, archival rules and backups stay in the existing command path.

## Implementation and evidence

public/product-view.js renders grouped agenda, date/staff filters and saved interval context. public/app.js defaults to the schedule and keeps command behavior. public/styles.css owns schedule hierarchy and responsive row layouts.

The bundled Node 24.19.0 suite passes 9/9; 2 regression tests for timezone/half-hour offset conversion and end dates crossing local midnight. JS syntax and whitespace checks pass. This documents implementation and automated evidence. Responsive rendering, interaction quality, screen-reader behavior and contrast across actual rendered states remain pending browser QA. Historical screenshots in docs/ and .impeccable/ do not show this increment. See PRE_RELEASE.md.

The editor captures the workspace revision when opened; save and archive submit that captured revision. A validation or revision-conflict failure keeps typed fields and focuses the error notice. Initial network failures replace the loading state with a retry action.
