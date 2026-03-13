export default async function (ctx) {
  const city = (ctx.env.City || "guangdong").trim().toLowerCase();
  const url = `http://m.qiyoujiage.com/${city}.shtml`;

  // Helper: parse price from HTML text like "7.45元/升"
  function parsePrice(html, label) {
    const re = new RegExp(label + '[^\\d]*(\\d+\\.\\d+)');
    const m = html.match(re);
    return m ? m[1] : "--";
  }

  let cityName = city;
  let p92 = "--", p95 = "--", p98 = "--", p0 = "--", updateDate = "";

  try {
    const resp = await ctx.http.get(url, { timeout: 10000 });
    const html = await resp.text();

    // Extract city name
    const nameMatch = html.match(/<title>([^<]{2,10})油价/);
    if (nameMatch) cityName = nameMatch[1];

    // Extract prices from HTML
    p92  = parsePrice(html, "92号汽油");
    p95  = parsePrice(html, "95号汽油");
    p98  = parsePrice(html, "98号汽油");
    p0   = parsePrice(html, "0号柴油");

    // Extract update date
    const dateMatch = html.match(/(\d{4}年\d{1,2}月\d{1,2}日)/);
    if (dateMatch) updateDate = dateMatch[1];

    // Cache result
    ctx.storage.setJSON("oil_cache", { cityName, p92, p95, p98, p0, updateDate, ts: Date.now() });

    ctx.notify({
      title: `⛽ ${cityName}今日油价`,
      subtitle: updateDate,
      body: `92#: ¥${p92}  95#: ¥${p95}  98#: ¥${p98}  柴油: ¥${p0}`,
      sound: false,
      action: { type: "openUrl", url: url },
    });

  } catch (e) {
    // Fallback to cache on network error
    const cache = ctx.storage.getJSON("oil_cache");
    if (cache) {
      cityName  = cache.cityName;
      p92       = cache.p92;
      p95       = cache.p95;
      p98       = cache.p98;
      p0        = cache.p0;
      updateDate = cache.updateDate + " (缓存)";
    } else {
      cityName = "获取失败";
    }
  }

  const family = ctx.widgetFamily || "systemSmall";
  const isSmall = family === "systemSmall";

  // ---- Widget layout ----
  return {
    type: "widget",
    backgroundColor: "#0F0F14",
    padding: isSmall ? 12 : 16,
    gap: isSmall ? 4 : 8,
    children: [
      // Title row
      {
        type: "hstack",
        gap: 4,
        children: [
          {
            type: "text",
            text: "⛽",
            font: { size: isSmall ? "subheadline" : "headline" },
          },
          {
            type: "text",
            text: `${cityName} 油价`,
            font: { size: isSmall ? "subheadline" : "headline", weight: "bold" },
            textColor: "#FFD60A",
            lineLimit: 1,
          },
        ],
      },
      // Divider
      {
        type: "text",
        text: "─────────────",
        font: { size: "caption2" },
        textColor: "#FFFFFF30",
      },
      // Price rows
      ...[ 
        { label: "🟡 92#", value: p92 },
        { label: "🔵 95#", value: p95 },
        ...(isSmall ? [] : [
          { label: "🔴 98#", value: p98 },
          { label: "⚫ 柴油 0#", value: p0 },
        ]),
      ].map(row => ({
        type: "hstack",
        gap: 4,
        children: [
          {
            type: "text",
            text: row.label,
            font: { size: isSmall ? "footnote" : "body" },
            textColor: "#EBEBF599",
            flex: 1,
          },
          {
            type: "text",
            text: `¥${row.value}`,
            font: { size: isSmall ? "footnote" : "body", weight: "semibold" },
            textColor: "#FFFFFF",
          },
        ],
      })),
      // Show all 4 grades in small via compact second row
      ...(isSmall ? [{
        type: "hstack",
        gap: 4,
        children: [
          { type: "text", text: "🔴 98#", font: { size: "footnote" }, textColor: "#EBEBF599", flex: 1 },
          { type: "text", text: `¥${p98}`, font: { size: "footnote", weight: "semibold" }, textColor: "#FFFFFF" },
        ],
      },
      {
        type: "hstack",
        gap: 4,
        children: [
          { type: "text", text: "⚫ 柴油", font: { size: "footnote" }, textColor: "#EBEBF599", flex: 1 },
          { type: "text", text: `¥${p0}`, font: { size: "footnote", weight: "semibold" }, textColor: "#FFFFFF" },
        ],
      }] : []),
      // Footer date
      {
        type: "text",
        text: updateDate || "─",
        font: { size: "caption2" },
        textColor: "#FFFFFF50",
      },
    ],
  };
}
