# ADA DeFi Tracker

Mỗi tuần tự động ghi lại ba chỉ số để biết DeFi trên Cardano đang tăng trưởng thật hay chỉ biến động theo giá ADA:

1. **TVL Cardano tính bằng ADA** (`TVL_USD / giá ADA`). Chỉ số này không bị biến động giá làm sai lệch.
2. **Stablecoin trên Cardano** (USD). Đây là thước đo nhu cầu rõ nhất.
3. **USDRF (RealFi):** tổng cung, sUSDrf đang staking, số ví nắm giữ, và tỷ lệ nguồn cung của top 5 ví.

Dashboard so sánh số liệu mới nhất với mốc đầu tháng 10/2026 (278 triệu ADA, 67,33 triệu USD stablecoin, 5,1 triệu USDRF, top 5 nắm 99,8%), rồi xếp vào một trong ba kịch bản:

| Kịch bản | Điều kiện (biên ±5%) |
|---|---|
| 2: tăng trưởng thật | TVL tính bằng ADA, stablecoin và USDRF đều vượt mốc, và top 5 ví USDRF nắm dưới 95% |
| 3: tiếp tục chảy máu | TVL tính bằng ADA thấp hơn mốc và stablecoin không tăng |
| 1: chưa có thay đổi thực chất | Các trường hợp còn lại |

Mốc kiểm tra quan trọng là **07/12/2026**, tròn 2 năm kể từ đỉnh TVL.

## Nguồn dữ liệu

Tất cả đều là API công khai, không cần key:

- DefiLlama: `api.llama.fi` (TVL), `stablecoins.llama.fi` (stablecoin), `coins.llama.fi` (giá ADA).
- Koios: `api.koios.rest` (USDRF on-chain, policy `7d9e4a0ee1a3f5d5ff8159ea91a83310cf2795ee7a87170c7aea05ae`).

Tỷ lệ top 5 được tính theo địa chỉ, không gộp theo stake key. Số dư nằm trong smart contract cũng được tính là một địa chỉ.

## Cách dùng

Cần Node.js 22 trở lên, không cần cài dependency. Tuần được tính theo giờ UTC: chạy tay trên máy vào sáng thứ Hai trước 07:00 giờ Việt Nam sẽ ghi đè snapshot của tuần trước.

```bash
npm run collect    # lấy snapshot tuần hiện tại (chạy lại trong cùng tuần sẽ ghi đè)
npm run backfill   # dựng lại lịch sử theo tuần từ 12/2024 (USDRF không có lịch sử)
npm test
```

Mở `dashboard/index.html` trực tiếp trong trình duyệt. Cần mạng để tải Chart.js.

## Tự động hóa

`.github/workflows/weekly.yml` chạy mỗi thứ Hai lúc 09:00 giờ Việt Nam: chạy test, lấy snapshot, rồi commit `data/`. GitHub Pages (deploy từ nhánh `main`, thư mục gốc) tự build lại dashboard sau mỗi commit. Có thể chạy tay trong tab **Actions** bằng **Run workflow**.

Nếu một nguồn API lỗi hoặc đổi định dạng, workflow sẽ fail và không commit gì, và GitHub gửi email báo lỗi. Hãy xử lý sớm: GitHub tự tắt lịch chạy của repo public sau 60 ngày không có hoạt động. Khi đó vào tab **Actions** và bật lại workflow.

## Dữ liệu

`data/snapshots.json` là file gốc. `data/snapshots.js` là bản sao để dashboard đọc được khi mở bằng `file://`. Mỗi bản ghi:

| Trường | Ý nghĩa |
|---|---|
| `week`, `date`, `source` | Tuần ISO, thời điểm lấy (UTC), `live` hoặc `backfill` |
| `adaPrice`, `tvlUsd`, `tvlAda` | Giá ADA, TVL tính bằng USD và bằng ADA |
| `stablecoinsUsd` | Tổng stablecoin đang lưu hành trên Cardano |
| `usdrfSupply`, `susdrfSupply`, `usdrfHolders`, `usdrfTop5Share` | Số liệu USDRF (`null` với các tuần backfill) |

Không phải khuyến nghị đầu tư.
