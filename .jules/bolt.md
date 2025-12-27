## 2024-05-22 - [Frontend Polling Bottleneck]
**Learning:** The frontend polls the backend for the latest answer every 3 seconds. The previous implementation compared the full message history content against the new answer to detect duplicates (O(N*M)).
**Action:** Replaced content scanning with a unique ID (UID) check provided by the backend, reducing complexity to O(1) and removing the need to re-render or re-create the polling function on every message update.

## 2025-01-01 - [Frontend Screenshot Polling]
**Learning:** The frontend was polling for screenshots every 3 seconds regardless of whether the user was viewing the screenshot tab. This wasted bandwidth and processing power.
**Action:** Implemented a conditional check using `useRef` to track the current view state, preventing screenshot requests when not in the "screenshot" view.
