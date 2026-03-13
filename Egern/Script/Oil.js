// 油价小组件
// 数据来源：https://www.autohome.com.cn/oil
// 环境变量：
//   城市 - 城市名（中文），默认 "上海"
//   SHOW_DIESEL - 是否显示柴油，"true"/"false"，默认 "true"

export default async function (ctx) {
  const city = (ctx.env.城市 || "上海").trim();
  const SHOW_DIESEL = (ctx.env.SHOW_DIESEL || "true").trim() !== "false";

  const now = new Date();
  const timeStr = `${String(now.getHours()).padStart(2,"0")}:${String(now.getMinutes()).padStart(2,"0")}`;
  const refreshTime = new Date(Date.now() + 6*60*60*1000).toISOString();

  const bgGradient = {
    type: "linear",
    colors: ["#1A0E00","#2D1800","#1A1000","#0D0800"],
    stops: [0,0.35,0.7,1],
    startPoint: {x:0,y:0},
    endPoint: {x:0.8,y:1}
  };

  // 读取缓存
  const CACHE_KEY = `autohome_oil_${city}`;
  let prices = {p92:null,p95:null,p98:null,diesel:null};
  try { prices = ctx.storage.getJSON(CACHE_KEY) ?? prices } catch(_){}

  let fetchError = false;

  try {
    const resp = await ctx.http.get("https://www.autohome.com.cn/oil", {
      headers:{ "User-Agent":"Mozilla/5.0" },
      timeout:15000
    });
    const html = await resp.text();

    // 匹配整行省份油价，依次是：92 95 98 柴油
    const regex = new RegExp(
      city + "[\\s\\S]*?(\\d+\\.\\d+)[\\s\\S]*?(\\d+\\.\\d+)[\\s\\S]*?(\\d+\\.\\d+)[\\s\\S]*?(\\d+\\.\\d+)"
    );
    const match = html.match(regex);
    if (match) {
      prices.p92 = parseFloat(match[1]);
      prices.p95 = parseFloat(match[2]);
      prices.p98 = parseFloat(match[3]);
      prices.diesel = SHOW_DIESEL ? parseFloat(match[4]) : null;
    }

    ctx.storage.setJSON(CACHE_KEY, prices);

  } catch (e) {
    fetchError = true;
  }

  const rows = [
    {label:"92号",price:prices.p92,color:"#FF9F0A"},
    {label:"95号",price:prices.p95,color:"#FF6B35"},
    {label:"98号",price:prices.p98,color:"#FF3B30"},
    ...(SHOW_DIESEL ? [{label:"柴油",price:prices.diesel,color:"#30D158"}]:[])
  ].filter(r => r.price!==null);

  function priceCard(row){
    return {
      type:"stack",
      direction:"column",
      alignItems:"center",
      justifyContent:"center",
      width:75,
      padding:[10,12,10,12],
      backgroundColor:"#FFFFFF10",
      borderRadius:14,
      children:[
        {
          type:"stack",
          direction:"row",
          alignItems:"center",
          justifyContent:"center",
          width:44,
          height:22,
          backgroundColor:row.color+"28",
          borderRadius:7,
          borderWidth:0.5,
          borderColor:row.color+"55",
          children:[
            {
              type:"text",
              text:row.label,
              font:{size:"caption1",weight:"bold"},
              textColor:row.color,
              textAlign:"center"
            }
          ]
        },
        {
          type:"text",
          text:row.price.toFixed(2),
          font:{size:"title3",weight:"semibold"},
          textColor:"#FFFFFF",
          textAlign:"center"
        }
      ]
    }
  }

  return {
    type:"widget",
    padding:[12,10,12,10],
    gap:6,
    backgroundGradient:bgGradient,
    refreshAfter:refreshTime,
    children:[
      {
        type:"stack",
        direction:"row",
        alignItems:"center",
        gap:5,
        padding:[0,10,0,10],
        children:[
          {type:"image",src:"sf-symbol:fuelpump.fill",width:14,height:14,color:"#FF9F0A"},
          {type:"text",text:`${city}油价`,font:{size:"caption1",weight:"semibold"},textColor:"#FFFFFFBB"},
          {type:"spacer"},
          fetchError
            ? {type:"text",text:"数据获取失败",font:{size:"caption2"},textColor:"#FF453A"}
            : null
        ].filter(Boolean)
      },
      {
        type:"stack",
        direction:"row",
        alignItems:"center",
        justifyContent:"center",
        gap:12,
        padding:[8,0,8,0],
        children: rows.map(priceCard)
      },
      {
        type:"stack",
        direction:"row",
        alignItems:"center",
        padding:[0,10,0,10],
        children:[
          {type:"text",text:`${timeStr} 更新`,font:{size:"caption2"},textColor:"#FFFFFF44"},
          {type:"spacer"},
          {type:"text",text:"元/升",font:{size:"caption2"},textColor:"#FFFFFF66"}
        ]
      }
    ]
  }
}