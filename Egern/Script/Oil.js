export default async function (ctx) {
  const city = ctx.env.City || "guangdong";
  const url = `http://m.qiyoujiage.com/api/price/${city}`;

  let title = "⛽ 油价";
  let lines = [];

  try {
    const resp = await ctx.http.get(url, { timeout: 10000 });
    const text = await resp.text();
    const data = JSON.parse(text);

    // qiyoujiage.com returns an object with 92/95/98/0# fields
    const p92  = data["92"]  || data.p92  || "--";
    const p95  = data["95"]  || data.p95  || "--";
    const p98  = data["98"]  || data.p98  || "--";
    const p0   = data["0"]   || data.p0   || "--";
    const city_name = data.city || data.name || city;
    const date = data.date || "";

    title = `⛽ ${city_name} 油价`;

    lines = [
      { label: "🟡 92#", value: `¥${p92}/L` },
      { label: "🔵 95#", value: `¥${p95}/L` },
      { label: "🔴 98#", value: `¥${p98}/L` },
      { label: "⚫ 0# 柴油", value: `¥${p0}/L` },
    ];

    if (date) lines.push({ label: "📅 更新", value: date });

    ctx.notify({
      title: title,
      body: `92#: ¥${p92}  95#: ¥${p95}  98#: ¥${p98}`,
    });

  } catch (e) {
    lines = [{ label: "❌ 错误", value: "获取油价失败，请检查城市拼音" }];
  }

  // Widget layout for iOS home screen
  return {
    type: "widget",
    backgroundColor: "#1C1C1E",
    padding: 14,
    gap: 6,
    children: [
      {
        type: "text",
        text: title,
        font: { size: "headline", weight: "bold" },
        textColor: "#FFD60A",
      },
      ...lines.map(line => ({
        type: "hstack",
        gap: 4,
        children: [
          {
            type: "text",
            text: line.label,
            font: { size: "body" },
            textColor: "#EBEBF5CC",
            flex: 1,
          },
          {
            type: "text",
            text: line.value,
            font: { size: "body", weight: "semibold" },
            textColor: "#FFFFFF",
          },
        ],
      })),
    ],
  };
}
