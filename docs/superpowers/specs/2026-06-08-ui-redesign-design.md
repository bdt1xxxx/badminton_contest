# Badminton Mini Program UI Redesign Design

## Overview

Redesign the WeChat Mini Program UI for badminton contest management with a cleaner, more usable interface. The approved direction is "lightweight professional sports green" as the base, with a more efficient "match control panel" treatment for live scoring and a small amount of ranking energy in list and statistics views.

This is a UI redesign only. It does not change the match generation algorithm, local storage schema, import/export data format, or scoring rules.

## Goals

- Make the app feel more polished and purpose-built for badminton contests.
- Improve creation flow clarity: match setup, player entry, then generation.
- Improve live scoring speed by prioritizing incomplete matches and score entry.
- Preserve a familiar WeChat Mini Program feel with native navigation and tab bar.
- Keep implementation surgical: mostly WXML/WXSS changes, with only small derived display data in JS where needed.

## Current UI Problems

- Pages rely on large plain white panels and boxy table-like layouts, which makes the app feel unfinished.
- The create page mixes setup fields and player entry without a strong task hierarchy.
- The player entry table is functional but visually heavy on mobile.
- The match list uses many equal-weight information boxes, making the primary action less obvious.
- The detail page does not visually prioritize the live scoring workflow enough.
- Destructive actions such as delete and clear data are visually too prominent compared with their frequency.
- The profile page has too much empty space and does not communicate local data status.

## Design Direction

Use a clean sports-oriented visual language:

- Primary color: green for main actions and positive match status.
- Secondary accent: teal for subtle gradients and freshness.
- Live scoring accent: dark slate only in match detail summary areas.
- Background: very light green-gray rather than pure gray.
- Components: light cards, rounded status pills, segmented controls, fixed primary actions.
- Tone: practical, crisp, and friendly; not a marketing-style landing page.

The design intentionally avoids a one-note green interface by using neutral cards, slate text, teal accents, and selective dark control-panel areas.

## Visual System

### Colors

- Primary green: `#16A34A`
- Primary green pressed: `#15803D`
- Soft green background: `#F4F7F5`
- Soft green surface: `#ECFDF5`
- Teal accent: `#14B8A6`
- Live scoring dark: `#17212F`
- Main text: `#0F172A`
- Secondary text: `#64748B`
- Border: `#E5EFE8`
- Danger text: `#DC2626`
- Danger surface: `#FEE2E2`

### Typography

- Page task title: 36-40rpx, bold, used sparingly below native navigation.
- Section title: 28-30rpx, bold.
- Card title and match name: 28-30rpx, bold.
- Body and form text: 26-28rpx.
- Meta labels and helper copy: 22-24rpx, secondary text color.

Do not use viewport-scaled font sizes. Keep letter spacing at `0`.

### Components

- Cards: 24-28rpx radius, subtle border, minimal shadow.
- Status pills: rounded capsules for `报名中`, `已完成`, level gap, and progress status.
- Segmented controls: use for match type and detail/statistics tabs.
- Primary buttons: full-width green for high-frequency actions.
- Destructive buttons: smaller, soft red, and visually secondary.
- Fixed bottom action: create page uses a fixed bottom `生成对阵` button so users do not scroll to find the main action.

## Page Designs

### Create Match Page

Primary purpose: help the organizer set up a match quickly and confidently.

Structure:

1. Native navigation title remains `创建比赛`.
2. Add page task title: `创建一场新比赛`.
3. Add helper text: `先确认赛制，再录入选手和等级`.
4. Match type becomes a segmented control with `双打` selected by default.
5. Basic setup fields are grouped in a light card area:
   - Match name
   - Player count
   - Court count
6. Player entry changes from a table-like panel to repeated mobile rows:
   - Left affordance or index area
   - Player name input
   - Level picker displayed as a right-side pill
7. Player count progress appears in the section title, for example `参赛选手 6/8`.
8. Move `打乱顺序` from the main form into the pre-generation confirmation dialog with level gap and round count.
9. Keep `生成对阵` as a fixed bottom primary button.

Behavior:

- The existing match type, count, court count, player input, and score picker handlers remain the source of truth.
- Single mode can remain visible, but since singles generation is empty, it should be treated carefully in implementation. If touched, show a light warning or disable generation for singles rather than implying it works.
- The confirm dialog becomes the "排阵设置" step:
  - Level gap
  - Round count
  - Shuffle order
  - Confirm generate

### Match List Page

Primary purpose: scan existing contests and enter the right one.

Structure:

1. Native navigation title remains `比赛列表`.
2. Add a compact summary card at the top:
   - Number of active contests
   - Total generated matches if cheap to derive
3. Each match card shows:
   - Match name
   - Status pill
   - Type
   - Player count
   - Match count or rounds
   - Created date/time
4. Primary action is `查看详情` or `进入比赛`.
5. Delete becomes a smaller soft-red control.

Behavior:

- Existing sort and navigation behavior remain.
- Existing delete behavior remains with confirmation.
- If there are no matches, empty state should include a clear action hint to create a match from the tab bar.

### Match Detail Page

Primary purpose: support live score entry during play.

Structure:

1. Native navigation title remains `比赛详情`.
2. Add a dark summary card:
   - Match name
   - Player count
   - Court count if available
   - Total matches
   - Incomplete match count
3. Replace red underline tabs with a contained segmented tab:
   - `对阵`
   - `统计`
4. On the `对阵` tab, each match card shows:
   - Match number
   - Level gap
   - Team 1 players
   - VS label
   - Team 2 players
   - Two score inputs
   - Completion button
5. Incomplete matches remain visually primary.
6. Completed matches can be lower emphasis and keep the existing modify flow.

Behavior:

- Existing `toggleComplete` behavior remains: completed matches sort after incomplete matches and persist.
- Score input remains per team.
- Button label remains `完成` before completion and `修改` after completion.
- Existing statistics calculation remains unchanged.

### Statistics Tab

Primary purpose: make rankings easy to understand.

Structure:

1. Use the same contained segmented tab as the detail page.
2. Add a summary card or concise header explaining sorting:
   - `按胜场排序，同胜场比分差优先`
3. Replace the table feel with ranking rows:
   - Rank number
   - Player name
   - Wins
   - Score difference
4. Top ranks can use stronger green rank numbers, but avoid decorative medal graphics for now.

Behavior:

- Existing sorting remains wins descending, then score difference descending.
- Empty state remains for no completed scored matches.

### Profile Page

Primary purpose: manage local data safely.

Structure:

1. Native navigation title remains `我的`.
2. Profile card with avatar and nickname.
3. Local data summary card:
   - Match count
   - Generated match count if cheap to derive
   - Optional player count if cheap to derive safely
4. Data actions become list rows:
   - Export data
   - Import data
   - Clear data
5. Clear data uses danger color but is visually secondary.

Behavior:

- Existing import/export/clear handlers remain.
- Existing clear confirmation remains.
- Do not modernize WeChat profile APIs as part of this redesign unless implementation reveals a direct UI dependency.

## Implementation Boundaries

Do not change:

- `matches` local storage schema.
- Doubles scheduling algorithm.
- Generated match data shape.
- Import/export JSON format.
- Ranking calculation rules.
- Tab bar page structure.

May change:

- WXML structure for layout and visual hierarchy.
- WXSS page styles.
- Small JS derived display values, such as:
  - active match count
  - total generated match count
  - incomplete match count
  - profile data summary

## Accessibility And Usability

- Maintain comfortable tap targets for buttons and picker rows.
- Keep text readable on small mobile screens.
- Avoid overlapping fixed bottom buttons with page content by adding bottom padding.
- Destructive actions must remain visually distinct and require confirmation.
- Preserve native picker behavior where possible.
- Use concise labels that match existing user vocabulary: `比赛`, `对阵`, `统计`, `选手`, `等级`.

## Acceptance Criteria

- Create page visually guides users through setup, player entry, and generation.
- The fixed generate button is reachable without scroll gymnastics and does not cover the last player row.
- Match list makes the primary action obvious and delete visually secondary.
- Match detail prioritizes score entry and incomplete matches.
- Statistics are easier to scan than the current table while preserving existing ranking rules.
- Profile page communicates local data status and keeps data actions easy to find.
- No local storage or scheduling behavior changes are introduced.
- The UI remains consistent with WeChat Mini Program native navigation and tab bar behavior.
