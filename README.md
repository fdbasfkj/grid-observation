# 格网观测台

一个可按月查看阿勒泰雪崩风险格网的 WebGIS。公开页面使用 Vue 3、Vite 和 OpenLayers。维护者将数据提交到 GitHub 仓库后，Actions 校验格网、生成月度目录并更新公开地图。Node.js 服务可用于本地预览。

访客打开公开网址即可查看最新一期和已发布的历史月份。支持分类显隐、格网属性查询、平移缩放和按月份分享链接。

地图采用 **WGS 84（EPSG:4326）**。地图中心、参考网和点选格网均以度显示经纬度。月度 GeoJSON 按 RFC 7946 使用 WGS 84 经纬度。[GeoJSON 坐标规范](https://www.rfc-editor.org/rfc/rfc7946#section-4)

## 本地运行

需要 Node.js 22.12 或更高版本。进入项目根目录，在 PowerShell 中运行以下命令。

```powershell
npm ci
Copy-Item .env.example .env
npm run build
npm start
```

打开 `http://127.0.0.1:8787/`。本机服务从 `data/months/` 读取月份。修改 Vue 源码时，可保持 Node 运行并另开一个终端运行 `npm run dev`。

## 每月更新

1. 将当月面格网导出为 **WGS 84（EPSG:4326）GeoJSON**，经度在前、纬度在后。若源数据是 Shapefile，在 GIS 软件的导出设置里选择该坐标系。
2. 将文件命名为 `YYYY-MM.geojson`，例如 `2025-11.geojson`。打开仓库中的 `data/months/`，点击 **Add file → Upload files**，上传并提交到仓库默认分支。
3. 等 **Actions** 中的 Pages 部署完成，再打开公开网址核对新一期。仓库当前分支中保留的月份都会出现在地图的月份列表中。

构建校验 GeoJSON 的 `FeatureCollection`、经纬度和面几何，支持 `Polygon` 和 `MultiPolygon`。更正某期可更新对应同名文件，撤下某期可从该目录删除对应文件。

| 可选属性 | 页面用途 |
| --- | --- |
| `GRID_ID` | 显示格网编号。标准 GeoJSON `Feature.id` 或 `properties.id` 也可作为编号。 |
| `R_rank` | 格网着色、图例和筛选读取此字段。`1` 为低风险（黄色），`2` 为中风险（青蓝色），`3` 为高风险（红色）。其他或缺失值显示为未分类（灰色）。支持数值和对应的数字字符串。 |
| `R` | 雪崩风险原始值，用于格网详情。 |

格网详情显示经纬度和风险属性。正式业务的字段映射和颜色可在 `src/grid.js` 按样例数据调整。

## 部署到自己的 GitHub

### 公开地图

1. 将项目源码和 `package-lock.json` 推送到目标仓库的默认分支。`.env`、`dist/` 和 `node_modules/` 已在 `.gitignore` 中排除。
2. 在仓库 **Settings → Pages → Build and deployment → Source** 选择 **GitHub Actions**。
3. 接入天地图时，在 **Settings → Secrets and variables → Actions → Secrets** 中添加仓库 Secret `VITE_TDT_KEY`，并在天地图后台配置网页域名白名单。
4. 在 **Actions** 运行 **Deploy WebGIS to GitHub Pages**，或向默认分支提交。工作流会构建 Vue，校验每一期数据并生成目录。站点地址可在 Pages 设置或工作流结果中查看。

天地图 Key 由浏览器请求经纬度矢量底图 `vec_c` 和中文注记 `cva_c` 时使用。服务请求失败时，地图使用 EPSG:4326 经纬参考网。

### 可选 Node API

Node 服务保留 `/api/months` 供本机接口调用。公开网站从 Actions 构建的静态目录加载数据。

| Node 运行变量 | 用途 |
| --- | --- |
| `PUBLISH_MODE=github` | 选择写入 GitHub 仓库。 |
| `PUBLISH_TOKEN` | POST `/api/months` 的 Bearer 令牌。 |
| `GITHUB_REPO` | 目标仓库，格式为 `owner/repo`。 |
| `GITHUB_PUBLISH_TOKEN` | 授权目标仓库 Contents 写入权限的 GitHub fine-grained PAT。只放后端环境。 |
| `GITHUB_BRANCH` | 留空时写入仓库默认分支。指定时需与 Pages 工作流的发布分支一致。 |
| `APP_ORIGIN` | 可选，允许指定的浏览器来源访问 Node API。 |
| `HOST` / `PORT` | 本机运行默认使用 `127.0.0.1:8787`。部署到服务平台时按平台配置监听地址与端口。 |

[GitHub Pages 自定义工作流](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages) · [GitHub 仓库文件 API](https://docs.github.com/en/rest/repos/contents#create-or-update-file-contents) · [天地图图层类型](https://guangdong.tianditu.gov.cn/geomap-api/apidoc/jsNewApiDoc/GeoGlobe.TDTLayer.html)
