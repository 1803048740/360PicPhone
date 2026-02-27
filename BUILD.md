# 构建指南

## Web 预览

```bash
npm run serve
```

访问 http://localhost:8080 或 http://192.168.x.x:8080（手机同局域网访问）

## Android 构建

### 方式一：使用 Android Studio

1. 安装 Android Studio
2. 打开项目：
   ```bash
   npm run cap:open:android
   ```
3. 在 Android Studio 中：
   - 等待 Gradle 同步完成
   - 点击 Build > Build Bundle(s) / APK(s) > Build APK(s)
   - 连接手机或运行模拟器
   - 点击 Run 按钮

### 方式二：使用命令行

1. 连接 Android 设备或启动模拟器
2. 运行：
   ```bash
   npm run cap:run:android
   ```

### 构建 APK

```bash
cd android
./gradlew assembleDebug
```

APK 文件位于 `android/app/build/outputs/apk/debug/`

## iOS 构建（需要 macOS）

```bash
npm run cap:sync ios
npm run cap:open:ios
```

## 常见问题

### 1. Android 设备无法连接
- 确保 USB 调试已开启
- 安装设备驱动程序
- 运行 `adb devices` 检查连接

### 2. iOS 陀螺仪权限
- 在真机上测试，模拟器不支持陀螺仪
- 首次使用会弹出权限请求

### 3. 图片加载失败
- 确保图片是 2:1 比例的全景图
- 检查图片文件大小（建议 < 10MB）

## 发布到应用商店

### Android
1. 生成签名密钥
2. 配置 `android/app/build.gradle`
3. 构建发布版本：`./gradlew assembleRelease`

### iOS
1. 在 Xcode 中配置签名
2. Archive 项目
3. 上传到 App Store Connect
