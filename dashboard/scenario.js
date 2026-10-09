// Classifies the latest snapshot into the three scenarios from podcast #3664.
// Classic script (not an ES module) so it loads from file:// and from Node tests.
(function (root) {
  // Baseline figures quoted in the podcast (early October 2026).
  var BASELINE = {
    date: '2026-10-09',
    tvlAda: 278e6,
    stablecoinsUsd: 67.33e6,
    usdrfSupply: 5.1e6,
    usdrfTop5Share: 99.8,
  };
  var MARGIN = 0.05; // ignore moves within ±5% of baseline
  var SPREAD_TOP5 = 95; // USDRF counts as "spread out" once the top 5 hold under 95%

  // `null < x` is true in JS, so every comparison must check the value exists first.
  function num(v) { return typeof v === 'number' && isFinite(v); }

  function classify(s) {
    var tvlUp = num(s.tvlAda) && s.tvlAda > BASELINE.tvlAda * (1 + MARGIN);
    var tvlDown = num(s.tvlAda) && s.tvlAda < BASELINE.tvlAda * (1 - MARGIN);
    var stableUp = num(s.stablecoinsUsd) && s.stablecoinsUsd > BASELINE.stablecoinsUsd * (1 + MARGIN);
    var stableKnown = num(s.stablecoinsUsd);
    var usdrfUp = num(s.usdrfSupply) && s.usdrfSupply > BASELINE.usdrfSupply * (1 + MARGIN);
    var usdrfSpread = num(s.usdrfTop5Share) && s.usdrfTop5Share < SPREAD_TOP5;

    var checks = [
      { label: 'TVL tính bằng ADA vượt mốc 278 triệu ADA (+5%)', ok: tvlUp },
      { label: 'Stablecoin vượt mốc 67,33 triệu USD (+5%)', ok: stableUp },
      { label: 'Tổng cung USDRF vượt mốc 5,1 triệu (+5%)', ok: usdrfUp },
      { label: 'USDRF lan rộng: top 5 ví nắm dưới 95%', ok: usdrfSpread },
    ];

    var id;
    if (tvlUp && stableUp && usdrfUp && usdrfSpread) id = 2;
    else if (tvlDown && stableKnown && !stableUp) id = 3;
    else id = 1;

    var titles = {
      1: 'Kịch bản 1: chưa có thay đổi thực chất',
      2: 'Kịch bản 2: tăng trưởng thật',
      3: 'Kịch bản 3: tiếp tục chảy máu',
    };
    var details = {
      1: 'Lượng ADA trong DeFi và stablecoin chưa tăng rõ rệt. Nếu TVL tính bằng USD tăng thì đó chủ yếu là do giá.',
      2: 'TVL tính bằng ADA, stablecoin và USDRF cùng tăng, và USDRF không còn tập trung ở vài ví. Có người dùng thật mang tiền vào.',
      3: 'TVL tính bằng ADA giảm dưới mốc và stablecoin không tăng. Người dùng tiếp tục rút tiền khỏi DeFi trên Cardano.',
    };
    return { id: id, title: titles[id], detail: details[id], checks: checks };
  }

  var api = { BASELINE: BASELINE, MARGIN: MARGIN, SPREAD_TOP5: SPREAD_TOP5, classify: classify };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.Scenario = api;
})(this);
