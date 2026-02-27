# 360° 全景图片查看器

基于 Pannellum WebGL 全景查看器的跨平台移动应用，支持 iOS 和 Android。

## 功能特性

- 支持 360° 全景图片查看（等距柱状投影格式）
- 手势操作：拖动、双指缩放
- 陀螺仪体感控制（移动设备）
- 本地图片加载
- 全屏显示
- 流畅的 WebGL 渲染

## 技术栈

- **Pannellum** - WebGL 全景查看器
- **Capacitor** - 跨平台移动应用框架
- **HTML5/CSS3/JavaScript** - 前端技术

## 项目结构

```
360pic_android/
├── www/                    # Web 资源目录
│   ├── index.html          # 主页面
│   ├── css/
│   │   └── style.css       # 样式文件
│   ├── js/
│   │   └── app.js          # 应用逻辑
│   └── assets/             # 静态资源
├── android/                # Android 原生项目
├── ios/                    # iOS 原生项目
├── capacitor.config.json   # Capacitor 配置
└── package.json            # 依赖管理
```

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. Web 端预览

```bash
npm run serve
```

访问 http://localhost:8080

### 3. 添加移动平台

```bash
# Android
npm run cap:sync
npm run cap:open:android

# iOS (需要 macOS)
npm run cap:open:ios
```

### 4. 构建与运行

```bash
# 同步资源到原生项目
npm run cap:copy

# 运行 Android
npm run cap:run:android

# 运行 iOS
npm run cap:run:ios
```

## Android 构建要求

- Android Studio Hedgehog | 2023.1.1 或更高
- Android SDK API 33+
- Java JDK 17+

## iOS 构建要求

- macOS 13 或更高
- Xcode 15 或更高
- CocoaPods

## 全景图片格式

应用支持标准的等距柱状投影 (Equirectangular) 格式全景图：

- 宽高比：2:1（例如 4096x2048）
- 格式：JPEG、PNG
- 水平视角：360°
- 垂直视角：180°

## 使用说明

1. 打开应用后加载默认示例全景图
2. 点击"打开图片"选择本地全景图
3. 拖动/滑动查看全景场景
4. 双指缩放调整视野
5. 启用陀螺仪进行体感控制（需授权）

## 权限说明

- **相机** - 用于从相册选择图片
- **陀螺仪** - 用于体感控制（可选）
- **存储** - 用于读取本地图片

## 开发计划

- [ ] 支持全景视频播放
- [ ] 添加热点标记功能
- [ ] 支持多场景切换
- [ ] 添加 VR 模式
- [ ] 支持从网络 URL 加载
- [ ] 图片编辑功能

## 许可证

MIT License

## 参考资料

- [Pannellum 官方文档](https://pannellum.org/)
- [Capacitor 官方文档](https://capacitorjs.com/)
