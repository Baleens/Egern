export default async function (ctx) {
  const city = (ctx.env.City || "guangdong").trim().toLowerCase();
  const url = `http://m.qiyoujiage.com/${city}.shtml`;
  const CACHE_KEY = "oil_price_cache";

  let cityName = city;
  let p92 = "--";
  let p95 = "--";
  let p98 = "--";
  let p0 = "--";
  let updateDate = "未知日期";
  let fromCache = false;

  try {
    const resp = await ctx.http.get(url, { timeout: 10000 });
    const html = await resp.text();

    const extract = (label) => {
      const m = html.match(new RegExp(label + "[^\\d]*([\\d]+\\.[\\d]+)"));
      return m ? m[1] : "--";
    };

    const nameMatch = html.match(/<title>([^今<]{2,12})今日油价/);
    if (nameMatch) cityName = nameMatch[1];

    p92 = extract("92号汽油");
    p95 = extract("95号汽油");
    p98 = extract("98号汽油");
    p0 = extract("0号柴油");

    const dateMatch = html.match(/(\d{4}年\d{1,2}月\d{1,2}日)/);
    if (dateMatch) updateDate = dateMatch[1];

    ctx.storage.setJSON(CACHE_KEY, { cityName, p92, p95, p98, p0, updateDate });

    ctx.notify({
      title: `⛽ ${/[\u4e00-\u9fa5]/.test(cityName) ? cityName : "目标地区"}今日油价`,
      subtitle: updateDate,
      body: `92#: ¥${p92}  95#: ¥${p95}  98#: ¥${p98}  柴油: ¥${p0}`,
      sound: false,
      action: { type: "openUrl", url }
    });
    
  } catch (e) {
    const cache = ctx.storage.getJSON(CACHE_KEY);
    if (cache) {
      cityName = cache.cityName || cityName;
      p92 = cache.p92 || p92;
      p95 = cache.p95 || p95;
      p98 = cache.p98 || p98;
      p0 = cache.p0 || p0;
      updateDate = cache.updateDate || updateDate;
      fromCache = true;
    } else {
      cityName = "获取失败";
      updateDate = "请检查城市拼音";
    }
  }

  return {
    type: "widget",
    backgroundColor: "#0F0F14",
    padding: 16,
    gap: 6,
    children: [
      {
        type: "text",
        text: `⛽ ${cityName}油价`,
        font: { size: "headline", weight: "bold" },
        textColor: "#FFD60A"
      },
      {
        type: "text",
        text: `92# 汽油：¥${p92}`,
        font: { size: "body" },
        textColor: "#FFFFFF"
      },
      {
        type: "text",
        text: `95# 汽油：¥${p95}`,
        font: { size: "body" },
        textColor: "#FFFFFF"
      },
      {
        type: "text",
        text: `98# 汽油：¥${p98}`,
        font: { size: "body" },
        textColor: "#FFFFFF"
      },
      {
        type: "text",
        text: `0# 柴油：¥${p0}`,
        font: { size: "body" },
        textColor: "#FFFFFF"
      },
      {
        type: "text",
        text: fromCache ? `${updateDate}（缓存）` : updateDate,
        font: { size: "caption2" },
        textColor: "#FFFFFF80"
      }
    ]
  };
}
