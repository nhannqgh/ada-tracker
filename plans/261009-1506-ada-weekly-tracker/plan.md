---
status: completed
created: 2026-10-09
---

# ADA weekly tracker: script hàng tuần kèm dashboard

## Mục tiêu (brainstorm contract)

- **Outcome:** mỗi tuần tự động lưu một snapshot gồm ba chỉ số trong podcast #3664. Một dashboard hiển thị xu hướng của ba chỉ số và cho biết đang ở kịch bản nào.
- **Ba chỉ số:**
  1. Stablecoin trên Cardano (USD).
  2. USDRF: tổng cung, sUSDrf đang staking, số ví nắm giữ, tỷ lệ của top 5 ví.
  3. TVL Cardano tính bằng USD và bằng ADA (TVL / giá ADA).
- **Constraints:** chỉ dùng API công khai không cần key; Node.js 24 thuần, không cài dependency; dữ liệu lưu dạng file trong repo.
- **Non-goals:** không cảnh báo qua email hay Telegram, không làm extension, không theo dõi chuỗi khác, không đưa ra khuyến nghị đầu tư.
- **Acceptance criteria:**
  - `node scripts/collect.mjs` thêm đúng một snapshot vào `data/snapshots.json`. Chạy lại trong cùng tuần thì ghi đè snapshot của tuần đó, không tạo bản trùng.
  - Một nguồn API lỗi thì script thoát với mã khác 0 và không ghi dữ liệu dở dang.
  - Dashboard mở trực tiếp từ file local, không cần server (đọc `data/snapshots.js`; riêng Chart.js tải từ CDN nên cần mạng). Dashboard có bốn biểu đồ, đường mốc ngày 2026-10-09 (278 triệu ADA, 67,33 triệu USD stablecoin, 5,1 triệu USDRF) và nhãn kịch bản 1, 2 hoặc 3.
  - Lịch chạy hàng tuần hoạt động kể cả khi máy tắt (nếu chọn GitHub Actions).

## Nguồn dữ liệu (đã gọi thử ngày 2026-10-09)

| Chỉ số | Endpoint | Kết quả thử |
|---|---|---|
| TVL Cardano (lịch sử theo ngày) | `https://api.llama.fi/v2/historicalChainTvl/Cardano` | 65,4 triệu USD |
| Stablecoin Cardano (lịch sử theo ngày) | `https://stablecoins.llama.fi/stablecoincharts/Cardano` | 71,7 triệu USD |
| Giá ADA | `https://coins.llama.fi/prices/current/coingecko:cardano`; lịch sử lấy qua `coins.llama.fi/chart` | 0,2399 USD |
| USDRF supply và holder | Koios `asset_info`, `asset_addresses`, `policy_asset_list`; policy `7d9e4a0e…ea05ae`, asset `USDr` | 5,11 triệu; 75 ví; top 5 nắm 99,77% |

## Các file

- `scripts/collect.mjs`: gọi bốn nguồn, tính các chỉ số, rồi ghi thêm hoặc ghi đè snapshot theo tuần ISO.
- `scripts/backfill.mjs` (tùy chọn): dựng lại lịch sử theo tuần từ 12/2024 cho TVL, giá và stablecoin. USDRF chỉ có dữ liệu từ ngày ra mắt.
- `data/snapshots.json`: dữ liệu lịch sử.
- `dashboard/index.html`: trang tĩnh, vẽ biểu đồ bằng Chart.js (CDN, cố định phiên bản), tự tính nhãn kịch bản.
- `.github/workflows/weekly.yml`: cron chạy mỗi thứ Hai, commit file `data/`.
- `README.md`: cách chạy và giải thích các chỉ số.

## Phase

1. Viết script thu thập và kiểm tra bằng cách chạy thật.
2. Backfill lịch sử (nếu được chọn).
3. Làm dashboard.
4. Lịch chạy và nơi host (theo lựa chọn của user).
5. Review và kiểm tra cuối.

## Logic chọn kịch bản

So sánh snapshot mới nhất với mốc ngày 2026-10-09:
- **Kịch bản 2 (tăng trưởng thật):** TVL tính bằng ADA, stablecoin và tổng cung USDRF đều cao hơn mốc, và tỷ lệ top 5 của USDRF giảm.
- **Kịch bản 3 (tiếp tục chảy máu):** TVL tính bằng ADA thấp hơn mốc, stablecoin không tăng.
- **Kịch bản 1 (chỉ giá tăng):** các trường hợp còn lại, đặc biệt khi TVL tính bằng USD tăng nhưng TVL tính bằng ADA đi ngang.

Dùng biên ±5% để tránh nhãn nhảy qua lại vì nhiễu.

## Quyết định của user (2026-10-09)

- Lịch chạy: GitHub Actions, mỗi thứ Hai 02:00 UTC.
- Repo public kèm GitHub Pages (deploy từ nhánh `main`, thư mục gốc).
- Có backfill lịch sử từ 2024-12-02.

## Tiến độ

- [x] Phase 1: script thu thập (chạy thật, chạy lại trong tuần không tạo bản trùng)
- [x] Phase 2: backfill (96 tuần)
- [x] Phase 3: dashboard (desktop, 390px, sáng và tối)
- [x] Phase 4: repo nhannqgh/ada-tracker, Pages bật, workflow chạy thử thành công (bot commit kích hoạt Pages build)
- [x] Phase 5: review xong, đã sửa lỗi High và Medium; còn mục Low chưa làm: SRI cho Chart.js
