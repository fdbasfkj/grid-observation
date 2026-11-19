# 演示地图数据来源

四期月度网格覆盖川渝及周边地区。网格范围、分类与 0–100 的演示指数均为合成数据。各月共用相同的网格编号和几何形状。`areaKm2` 为按平均地球半径 6,371.0088 千米计算的球面面积近似值。坐标采用 WGS 84 经纬度。

底图覆盖东经 86°–121°、北纬 17°–43°。陆地轮廓来自 Natural Earth 1:50m 数据。省界、河湖、主要公路和城市点来自 1:10m 数据，已按区域裁切并简化，用于区域概览。省域、山脉和部分水体的文字摆放经过调整。Made with Natural Earth. [Natural Earth v5.1.2](https://github.com/nvkelso/natural-earth-vector/tree/v5.1.2/geojson) · [公有领域使用条款](https://www.naturalearthdata.com/about/terms-of-use/)

地形色带与等高线由 Mapzen Terrain Tiles 的第 5 级 Terrarium 瓦片生成，访问日期为 2026 年 11 月 16 日。陆地高程使用 USGS 的 GMTED2010，海域使用 NOAA 的 ETOPO1。色带下界分别为 350、750、1,350、2,200 和 3,500 米。重采样和简化后的地形适合区域概览。GMTED2010 terrain data courtesy of the U.S. Geological Survey. ETOPO1 terrain data courtesy of the U.S. National Oceanic and Atmospheric Administration. [Mapzen 瓦片数据来源](https://github.com/tilezen/joerd/blob/master/docs/data-sources.md) · [AWS Open Data](https://registry.opendata.aws/terrain-tiles/)

## 重新生成

在项目根目录运行 `node scripts/generate-demo.mjs` 可重建月度网格和演示目录。现有底图可直接离线使用。若需重建底图，将以下源文件保存到同一个目录，然后运行 `node scripts/generate-demo.mjs <源文件目录>`。

- 从 Natural Earth v5.1.2 的 `geojson/` 下载 `ne_50m_land.geojson`、`ne_10m_admin_1_states_provinces_lines.geojson`、`ne_10m_rivers_lake_centerlines.geojson`、`ne_10m_lakes.geojson`、`ne_10m_populated_places.geojson` 和 `ne_10m_roads.geojson`。
- 从 Mapzen 的 `terrarium/5/{x}/{y}.png` 下载 x 为 23–26、y 为 11–14 的瓦片，保存为 `terrain-5-{x}-{y}.png`。 [瓦片访问说明](https://github.com/tilezen/joerd/blob/master/docs/use-service.md#what-if-i-want-to-access-the-tiles-on-aws)
