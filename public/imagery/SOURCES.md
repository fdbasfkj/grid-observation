# 阿勒泰 Sentinel-2 真彩色底图

底图使用 2025 年 10 月 16 日至 24 日拍摄的 Sentinel-2 L2A 影像。真彩色使用 B04、B03、B02 作为红、绿、蓝通道。拼接依据场景分类（SCL）优先采用晴空像元，保留影像中的积雪。

输出为 4096 × 3140 像素的 WGS 84（EPSG:4326）影像，范围为东经 85.25°～91.38°、北纬 44.72°～49.42°。这组拼接影像作为固定底图显示，观测月份选择器控制格网数据。

Contains modified Copernicus Sentinel data 2025.

原始影像来自 Element 84 Earth Search 和 AWS 开放数据。 [Sentinel-2 L2A 数据集](https://registry.opendata.aws/sentinel-2-l2a-cogs/) · [Copernicus Sentinel 数据许可](https://ewds.climate.copernicus.eu/licences/ec-sentinel)

## 原始影像

| 拍摄日期（UTC） | 参与拼接的影像数 |
| --- | ---: |
| 2025-10-16 | 8 |
| 2025-10-17 | 17 |
| 2025-10-18 | 5 |
| 2025-10-19 | 6 |
| 2025-10-21 | 32 |
| 2025-10-22 | 8 |
| 2025-10-23 | 1 |
| 2025-10-24 | 21 |

<details>
<summary>影像编号和元数据</summary>

- [S2C_46UCV_20251016_0_L2A](https://earth-search.aws.element84.com/v1/collections/sentinel-2-l2a/items/S2C_46UCV_20251016_0_L2A)
- [S2C_46UCU_20251016_0_L2A](https://earth-search.aws.element84.com/v1/collections/sentinel-2-l2a/items/S2C_46UCU_20251016_0_L2A)
- [S2C_45UYP_20251016_0_L2A](https://earth-search.aws.element84.com/v1/collections/sentinel-2-l2a/items/S2C_45UYP_20251016_0_L2A)
- [S2C_45TYM_20251016_0_L2A](https://earth-search.aws.element84.com/v1/collections/sentinel-2-l2a/items/S2C_45TYM_20251016_0_L2A)
- [S2C_45TYL_20251016_0_L2A](https://earth-search.aws.element84.com/v1/collections/sentinel-2-l2a/items/S2C_45TYL_20251016_0_L2A)
- [S2C_45TXL_20251016_0_L2A](https://earth-search.aws.element84.com/v1/collections/sentinel-2-l2a/items/S2C_45TXL_20251016_0_L2A)
- [S2C_45TYK_20251016_0_L2A](https://earth-search.aws.element84.com/v1/collections/sentinel-2-l2a/items/S2C_45TYK_20251016_0_L2A)
- [S2C_45TXK_20251016_0_L2A](https://earth-search.aws.element84.com/v1/collections/sentinel-2-l2a/items/S2C_45TXK_20251016_0_L2A)
- [S2B_45UVQ_20251017_1_L2A](https://earth-search.aws.element84.com/v1/collections/sentinel-2-l2a/items/S2B_45UVQ_20251017_1_L2A)
- [S2B_45UUQ_20251017_1_L2A](https://earth-search.aws.element84.com/v1/collections/sentinel-2-l2a/items/S2B_45UUQ_20251017_1_L2A)
- [S2B_45UWP_20251017_0_L2A](https://earth-search.aws.element84.com/v1/collections/sentinel-2-l2a/items/S2B_45UWP_20251017_0_L2A)
- [S2B_45UVP_20251017_0_L2A](https://earth-search.aws.element84.com/v1/collections/sentinel-2-l2a/items/S2B_45UVP_20251017_0_L2A)
- [S2B_45UUP_20251017_0_L2A](https://earth-search.aws.element84.com/v1/collections/sentinel-2-l2a/items/S2B_45UUP_20251017_0_L2A)
- [S2B_45TWN_20251017_0_L2A](https://earth-search.aws.element84.com/v1/collections/sentinel-2-l2a/items/S2B_45TWN_20251017_0_L2A)
- [S2B_45TVN_20251017_0_L2A](https://earth-search.aws.element84.com/v1/collections/sentinel-2-l2a/items/S2B_45TVN_20251017_0_L2A)
- [S2B_45TUN_20251017_0_L2A](https://earth-search.aws.element84.com/v1/collections/sentinel-2-l2a/items/S2B_45TUN_20251017_0_L2A)
- [S2B_45TWM_20251017_0_L2A](https://earth-search.aws.element84.com/v1/collections/sentinel-2-l2a/items/S2B_45TWM_20251017_0_L2A)
- [S2B_45TVM_20251017_0_L2A](https://earth-search.aws.element84.com/v1/collections/sentinel-2-l2a/items/S2B_45TVM_20251017_0_L2A)
- [S2B_45TUM_20251017_0_L2A](https://earth-search.aws.element84.com/v1/collections/sentinel-2-l2a/items/S2B_45TUM_20251017_0_L2A)
- [S2B_45TUM_20251017_2_L2A](https://earth-search.aws.element84.com/v1/collections/sentinel-2-l2a/items/S2B_45TUM_20251017_2_L2A)
- [S2B_45TUL_20251017_0_L2A](https://earth-search.aws.element84.com/v1/collections/sentinel-2-l2a/items/S2B_45TUL_20251017_0_L2A)
- [S2A_45UVQ_20251017_0_L2A](https://earth-search.aws.element84.com/v1/collections/sentinel-2-l2a/items/S2A_45UVQ_20251017_0_L2A)
- [S2A_45UUQ_20251017_0_L2A](https://earth-search.aws.element84.com/v1/collections/sentinel-2-l2a/items/S2A_45UUQ_20251017_0_L2A)
- [S2A_44UQV_20251017_1_L2A](https://earth-search.aws.element84.com/v1/collections/sentinel-2-l2a/items/S2A_44UQV_20251017_1_L2A)
- [S2A_45UUP_20251017_1_L2A](https://earth-search.aws.element84.com/v1/collections/sentinel-2-l2a/items/S2A_45UUP_20251017_1_L2A)
- [S2A_45UYQ_20251018_0_L2A](https://earth-search.aws.element84.com/v1/collections/sentinel-2-l2a/items/S2A_45UYQ_20251018_0_L2A)
- [S2A_46TCS_20251018_1_L2A](https://earth-search.aws.element84.com/v1/collections/sentinel-2-l2a/items/S2A_46TCS_20251018_1_L2A)
- [S2A_46TCR_20251018_1_L2A](https://earth-search.aws.element84.com/v1/collections/sentinel-2-l2a/items/S2A_46TCR_20251018_1_L2A)
- [S2A_45TYL_20251018_1_L2A](https://earth-search.aws.element84.com/v1/collections/sentinel-2-l2a/items/S2A_45TYL_20251018_1_L2A)
- [S2A_46TCQ_20251018_1_L2A](https://earth-search.aws.element84.com/v1/collections/sentinel-2-l2a/items/S2A_46TCQ_20251018_1_L2A)
- [S2C_45UWQ_20251019_0_L2A](https://earth-search.aws.element84.com/v1/collections/sentinel-2-l2a/items/S2C_45UWQ_20251019_0_L2A)
- [S2C_45UVQ_20251019_0_L2A](https://earth-search.aws.element84.com/v1/collections/sentinel-2-l2a/items/S2C_45UVQ_20251019_0_L2A)
- [S2C_45UWQ_20251019_1_L2A](https://earth-search.aws.element84.com/v1/collections/sentinel-2-l2a/items/S2C_45UWQ_20251019_1_L2A)
- [S2C_45UYP_20251019_1_L2A](https://earth-search.aws.element84.com/v1/collections/sentinel-2-l2a/items/S2C_45UYP_20251019_1_L2A)
- [S2C_45UXP_20251019_1_L2A](https://earth-search.aws.element84.com/v1/collections/sentinel-2-l2a/items/S2C_45UXP_20251019_1_L2A)
- [S2C_45UWP_20251019_1_L2A](https://earth-search.aws.element84.com/v1/collections/sentinel-2-l2a/items/S2C_45UWP_20251019_1_L2A)
- [S2B_46UCV_20251021_1_L2A](https://earth-search.aws.element84.com/v1/collections/sentinel-2-l2a/items/S2B_46UCV_20251021_1_L2A)
- [S2B_45UYQ_20251021_1_L2A](https://earth-search.aws.element84.com/v1/collections/sentinel-2-l2a/items/S2B_45UYQ_20251021_1_L2A)
- [S2B_46UCU_20251021_1_L2A](https://earth-search.aws.element84.com/v1/collections/sentinel-2-l2a/items/S2B_46UCU_20251021_1_L2A)
- [S2B_45UYP_20251021_1_L2A](https://earth-search.aws.element84.com/v1/collections/sentinel-2-l2a/items/S2B_45UYP_20251021_1_L2A)
- [S2B_45UXP_20251021_1_L2A](https://earth-search.aws.element84.com/v1/collections/sentinel-2-l2a/items/S2B_45UXP_20251021_1_L2A)
- [S2B_46TCT_20251021_0_L2A](https://earth-search.aws.element84.com/v1/collections/sentinel-2-l2a/items/S2B_46TCT_20251021_0_L2A)
- [S2B_45TYN_20251021_1_L2A](https://earth-search.aws.element84.com/v1/collections/sentinel-2-l2a/items/S2B_45TYN_20251021_1_L2A)
- [S2B_45TXN_20251021_1_L2A](https://earth-search.aws.element84.com/v1/collections/sentinel-2-l2a/items/S2B_45TXN_20251021_1_L2A)
- [S2B_46TCS_20251021_0_L2A](https://earth-search.aws.element84.com/v1/collections/sentinel-2-l2a/items/S2B_46TCS_20251021_0_L2A)
- [S2B_45TYM_20251021_1_L2A](https://earth-search.aws.element84.com/v1/collections/sentinel-2-l2a/items/S2B_45TYM_20251021_1_L2A)
- [S2B_45TXM_20251021_1_L2A](https://earth-search.aws.element84.com/v1/collections/sentinel-2-l2a/items/S2B_45TXM_20251021_1_L2A)
- [S2B_45TWM_20251021_1_L2A](https://earth-search.aws.element84.com/v1/collections/sentinel-2-l2a/items/S2B_45TWM_20251021_1_L2A)
- [S2B_46TCR_20251021_0_L2A](https://earth-search.aws.element84.com/v1/collections/sentinel-2-l2a/items/S2B_46TCR_20251021_0_L2A)
- [S2B_45TXL_20251021_1_L2A](https://earth-search.aws.element84.com/v1/collections/sentinel-2-l2a/items/S2B_45TXL_20251021_1_L2A)
- [S2B_45TWL_20251021_0_L2A](https://earth-search.aws.element84.com/v1/collections/sentinel-2-l2a/items/S2B_45TWL_20251021_0_L2A)
- [S2B_45TYK_20251021_0_L2A](https://earth-search.aws.element84.com/v1/collections/sentinel-2-l2a/items/S2B_45TYK_20251021_0_L2A)
- [S2B_45TXK_20251021_1_L2A](https://earth-search.aws.element84.com/v1/collections/sentinel-2-l2a/items/S2B_45TXK_20251021_1_L2A)
- [S2A_45UXQ_20251021_0_L2A](https://earth-search.aws.element84.com/v1/collections/sentinel-2-l2a/items/S2A_45UXQ_20251021_0_L2A)
- [S2A_45TXN_20251021_0_L2A](https://earth-search.aws.element84.com/v1/collections/sentinel-2-l2a/items/S2A_45TXN_20251021_0_L2A)
- [S2A_45TWN_20251021_0_L2A](https://earth-search.aws.element84.com/v1/collections/sentinel-2-l2a/items/S2A_45TWN_20251021_0_L2A)
- [S2A_45TYM_20251021_0_L2A](https://earth-search.aws.element84.com/v1/collections/sentinel-2-l2a/items/S2A_45TYM_20251021_0_L2A)
- [S2A_45TXM_20251021_0_L2A](https://earth-search.aws.element84.com/v1/collections/sentinel-2-l2a/items/S2A_45TXM_20251021_0_L2A)
- [S2A_45TWM_20251021_0_L2A](https://earth-search.aws.element84.com/v1/collections/sentinel-2-l2a/items/S2A_45TWM_20251021_0_L2A)
- [S2A_45TUM_20251021_0_L2A](https://earth-search.aws.element84.com/v1/collections/sentinel-2-l2a/items/S2A_45TUM_20251021_0_L2A)
- [S2A_45TXL_20251021_0_L2A](https://earth-search.aws.element84.com/v1/collections/sentinel-2-l2a/items/S2A_45TXL_20251021_0_L2A)
- [S2A_45TWL_20251021_1_L2A](https://earth-search.aws.element84.com/v1/collections/sentinel-2-l2a/items/S2A_45TWL_20251021_1_L2A)
- [S2A_45TVL_20251021_0_L2A](https://earth-search.aws.element84.com/v1/collections/sentinel-2-l2a/items/S2A_45TVL_20251021_0_L2A)
- [S2A_45TUL_20251021_0_L2A](https://earth-search.aws.element84.com/v1/collections/sentinel-2-l2a/items/S2A_45TUL_20251021_0_L2A)
- [S2A_45TXK_20251021_0_L2A](https://earth-search.aws.element84.com/v1/collections/sentinel-2-l2a/items/S2A_45TXK_20251021_0_L2A)
- [S2A_45TWK_20251021_0_L2A](https://earth-search.aws.element84.com/v1/collections/sentinel-2-l2a/items/S2A_45TWK_20251021_0_L2A)
- [S2A_45TVK_20251021_0_L2A](https://earth-search.aws.element84.com/v1/collections/sentinel-2-l2a/items/S2A_45TVK_20251021_0_L2A)
- [S2A_45TUK_20251021_0_L2A](https://earth-search.aws.element84.com/v1/collections/sentinel-2-l2a/items/S2A_45TUK_20251021_0_L2A)
- [S2C_45UVQ_20251022_0_L2A](https://earth-search.aws.element84.com/v1/collections/sentinel-2-l2a/items/S2C_45UVQ_20251022_0_L2A)
- [S2C_45UUQ_20251022_0_L2A](https://earth-search.aws.element84.com/v1/collections/sentinel-2-l2a/items/S2C_45UUQ_20251022_0_L2A)
- [S2C_45UVP_20251022_0_L2A](https://earth-search.aws.element84.com/v1/collections/sentinel-2-l2a/items/S2C_45UVP_20251022_0_L2A)
- [S2C_45UUP_20251022_0_L2A](https://earth-search.aws.element84.com/v1/collections/sentinel-2-l2a/items/S2C_45UUP_20251022_0_L2A)
- [S2C_45TVN_20251022_0_L2A](https://earth-search.aws.element84.com/v1/collections/sentinel-2-l2a/items/S2C_45TVN_20251022_0_L2A)
- [S2C_45TUN_20251022_0_L2A](https://earth-search.aws.element84.com/v1/collections/sentinel-2-l2a/items/S2C_45TUN_20251022_0_L2A)
- [S2C_45TUM_20251022_0_L2A](https://earth-search.aws.element84.com/v1/collections/sentinel-2-l2a/items/S2C_45TUM_20251022_0_L2A)
- [S2C_45TUL_20251022_0_L2A](https://earth-search.aws.element84.com/v1/collections/sentinel-2-l2a/items/S2C_45TUL_20251022_0_L2A)
- [S2C_46TCT_20251023_0_L2A](https://earth-search.aws.element84.com/v1/collections/sentinel-2-l2a/items/S2C_46TCT_20251023_0_L2A)
- [S2B_45UYQ_20251024_0_L2A](https://earth-search.aws.element84.com/v1/collections/sentinel-2-l2a/items/S2B_45UYQ_20251024_0_L2A)
- [S2B_45UXQ_20251024_0_L2A](https://earth-search.aws.element84.com/v1/collections/sentinel-2-l2a/items/S2B_45UXQ_20251024_0_L2A)
- [S2B_45UWQ_20251024_0_L2A](https://earth-search.aws.element84.com/v1/collections/sentinel-2-l2a/items/S2B_45UWQ_20251024_0_L2A)
- [S2B_45UVQ_20251024_0_L2A](https://earth-search.aws.element84.com/v1/collections/sentinel-2-l2a/items/S2B_45UVQ_20251024_0_L2A)
- [S2B_45UYP_20251024_0_L2A](https://earth-search.aws.element84.com/v1/collections/sentinel-2-l2a/items/S2B_45UYP_20251024_0_L2A)
- [S2B_45UXP_20251024_0_L2A](https://earth-search.aws.element84.com/v1/collections/sentinel-2-l2a/items/S2B_45UXP_20251024_0_L2A)
- [S2B_45UWP_20251024_0_L2A](https://earth-search.aws.element84.com/v1/collections/sentinel-2-l2a/items/S2B_45UWP_20251024_0_L2A)
- [S2B_45UVP_20251024_0_L2A](https://earth-search.aws.element84.com/v1/collections/sentinel-2-l2a/items/S2B_45UVP_20251024_0_L2A)
- [S2B_45TXN_20251024_0_L2A](https://earth-search.aws.element84.com/v1/collections/sentinel-2-l2a/items/S2B_45TXN_20251024_0_L2A)
- [S2B_45TWN_20251024_0_L2A](https://earth-search.aws.element84.com/v1/collections/sentinel-2-l2a/items/S2B_45TWN_20251024_0_L2A)
- [S2B_45TVN_20251024_0_L2A](https://earth-search.aws.element84.com/v1/collections/sentinel-2-l2a/items/S2B_45TVN_20251024_0_L2A)
- [S2B_45TXM_20251024_0_L2A](https://earth-search.aws.element84.com/v1/collections/sentinel-2-l2a/items/S2B_45TXM_20251024_0_L2A)
- [S2B_45TWM_20251024_0_L2A](https://earth-search.aws.element84.com/v1/collections/sentinel-2-l2a/items/S2B_45TWM_20251024_0_L2A)
- [S2B_45TVM_20251024_0_L2A](https://earth-search.aws.element84.com/v1/collections/sentinel-2-l2a/items/S2B_45TVM_20251024_0_L2A)
- [S2B_45TUM_20251024_0_L2A](https://earth-search.aws.element84.com/v1/collections/sentinel-2-l2a/items/S2B_45TUM_20251024_0_L2A)
- [S2B_45TWL_20251024_0_L2A](https://earth-search.aws.element84.com/v1/collections/sentinel-2-l2a/items/S2B_45TWL_20251024_0_L2A)
- [S2B_45TVL_20251024_0_L2A](https://earth-search.aws.element84.com/v1/collections/sentinel-2-l2a/items/S2B_45TVL_20251024_0_L2A)
- [S2B_45TUL_20251024_0_L2A](https://earth-search.aws.element84.com/v1/collections/sentinel-2-l2a/items/S2B_45TUL_20251024_0_L2A)
- [S2B_45TXK_20251024_0_L2A](https://earth-search.aws.element84.com/v1/collections/sentinel-2-l2a/items/S2B_45TXK_20251024_0_L2A)
- [S2B_45TVK_20251024_0_L2A](https://earth-search.aws.element84.com/v1/collections/sentinel-2-l2a/items/S2B_45TVK_20251024_0_L2A)
- [S2B_45TUK_20251024_0_L2A](https://earth-search.aws.element84.com/v1/collections/sentinel-2-l2a/items/S2B_45TUK_20251024_0_L2A)

</details>
