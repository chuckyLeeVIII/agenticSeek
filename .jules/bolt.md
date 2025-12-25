## 2024-05-22 - [Frontend Polling Bottleneck]
**Learning:** The frontend polls the backend for the latest answer every 3 seconds. The previous implementation compared the full message history content against the new answer to detect duplicates (O(N*M)).
**Action:** Replaced content scanning with a unique ID (UID) check provided by the backend, reducing complexity to O(1) and removing the need to re-render or re-create the polling function on every message update.
