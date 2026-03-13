export default async function (ctx) {
  const city = (ctx.env.City || "guangdong").trim().toLowerCase();
  const url = `http://m.qiyoujiage.com/${city}.shtml`;
  const CACHE_KEY = "oil_price_cache";

  // ctx.widgetFamily is undefined when run manually (not as widget)
  const family = ctx.widgetFamily ?? "systemSmall";
  const isSmall = family === "systemSmall";

  let cityName = city;
  let p92 = "--", p95 = "--", p98 = "--", p0 = "--", updateDate = "未知日期";
  let fromCache = false;

  // --- Fetch & parse ---
  try {
    const resp = await ctx.http.get(url, { timeout: 10000 });
    const html = await resp.text(); // consume body exactly once

    // BUG FIX: single backslash escaping (was double-escaped before)
    const extract = (label) => {
      const m = html.match(new RegExp(label + '[^\\d]*([\\d]+\\.[\\d]+)'));
      return m ? m[1] : "--";
    };

    const nameMatch = html.match(/<title>([^今<]{2,6})今日油价/);
    if (nameMatch) cityName = nameMatch[1];

    p92 = extract("92号汽油");
    p95 = extract("95号汽油");
    p98 = extract("98号汽油");
    p0  = extract("0号柴油");

    // BUG FIX: single backslash in regex literal
    const dateMatch = html.match(/(\d{4}年\d{1,2}月\d{1,2}日)/);
    if (dateMatch) updateDate = dateMatch[1];

    ctx.storage.setJSON(CACHE_KEY, { cityName, p92, p95, p98, p0, updateDate });

    ctx.notify({
      title: `⛽ ${cityName}今日油价`,
      subtitle: updateDate,
      body: `92#: ¥${p92}  95#: ¥${p95}  98#: ¥${p98}  柴油: ¥${p0}`,
      sound: false,
      action: {
        type: "openUrl",
        url: url,
      },
    });

  } catch (e) {
    const cache = ctx.storage.getJSON(CACHE_KEY);
    if (cache) {
      ({ cityName, p92, p95, p98, p0, updateDate } = cache);
      fromCache = true;
    } else {
      cityName = "获取失败";
      updateDate = "请检查城市拼音";
    }
  }

  // --- Widget DSL (spec-compliant) ---
  const row = (label, value, color) => ({
    type: "hstack",
    children: [
      {
        type: "text",
        text: label,
        font: { size: isSmall ? "footnote" : "body" },
        textColor: "#EBEBF580",
      },
      { type: "spacer" },
      {
        type: "text",
        text: `¥${value}`,
        font: { size: isSmall ? "footnote" : "body", weight: "semibold" },
        textColor: color,
      },
    ],
  });

  return {
    type: "widget",
    backgroundColor: "#0F0F14",
    padding: 14,
    gap: 6,
    children: [
      {
        type: "text",
        text: `⛽ ${cityName}`,
        font: { size: isSmall ? "subheadline" : "headline", weight: "bold" },
        textColor: "#FFD60A",
      },
      row("🟡 92#", p92, "#FFD60A"),
      row("🔵 95#", p95, "#5AC8FA"),
      row("🔴 98#", p98, "#FF6B6B"),
      row("⚫ 柴油", p0,  "#EBEBF5"),
      {
        type: "text",
        text: fromCache ? `${updateDate} (缓存)` : updateDate,
        font: { size: "caption2" },
        textColor: "#FFFFFF40",
      },
    ],
  };
}
