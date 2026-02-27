# Assets 目录

在此目录放置示例全景图片或应用内使用的静态资源。

## 示例图片

将全景图片放在此处，然后在 `www/js/app.js` 中修改默认图片路径：

```javascript
const defaultImage = 'assets/sample.jpg';
```

## 全景图要求

- 宽高比：2:1（推荐 4096x2048 或更高）
- 格式：JPEG、PNG
- 投影：等距柱状投影 (Equirectangular)
