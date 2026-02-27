class PanoramaViewer {
    constructor() {
        this.viewer = null;
        this.gyroscopeEnabled = false;
        this.isFullscreen = false;

        this.init();
    }

    init() {
        this.setupElements();
        this.setupEventListeners();
        this.showDefaultPanorama();
    }

    setupElements() {
        this.btnOpen = document.getElementById('btnOpen');
        this.btnGyroscope = document.getElementById('btnGyroscope');
        this.btnFullscreen = document.getElementById('btnFullscreen');
        this.btnInfo = document.getElementById('btnInfo');
        this.fileInput = document.getElementById('fileInput');
        this.loading = document.getElementById('loading');
        this.infoPanel = document.getElementById('infoPanel');
        this.btnCloseInfo = document.getElementById('btnCloseInfo');
        this.panoramaContainer = document.getElementById('panorama');
    }

    setupEventListeners() {
        this.btnOpen.addEventListener('click', () => this.fileInput.click());
        this.fileInput.addEventListener('change', (e) => this.handleFileSelect(e));
        this.btnGyroscope.addEventListener('click', () => this.toggleGyroscope());
        this.btnFullscreen.addEventListener('click', () => this.toggleFullscreen());
        this.btnInfo.addEventListener('click', () => this.showInfo());
        this.btnCloseInfo.addEventListener('click', () => this.hideInfo());
        this.infoPanel.addEventListener('click', (e) => {
            if (e.target === this.infoPanel) this.hideInfo();
        });
    }

    showDefaultPanorama() {
        // 加载示例全景图或显示占位信息
        const defaultImage = 'https://pannellum.org/images/alma.jpg';

        this.viewer = pannellum.viewer('panorama', {
            type: 'equirectangular',
            panorama: defaultImage,
            autoLoad: true,
            showControls: false,
            mouseZoom: true,
            touchZoom: true,
            showFullscreenCtrl: false,
            keyboardZoom: true,
            draggable: true,
            disableKeyboardCtrl: false,
            onLoad: () => this.hideLoading(),
            onError: (error) => {
                console.error('全景图加载失败:', error);
                this.hideLoading();
            }
        });

        this.showLoading();
    }

    loadPanorama(imagePath) {
        this.showLoading();

        if (this.viewer) {
            this.viewer.destroy();
        }

        this.viewer = pannellum.viewer('panorama', {
            type: 'equirectangular',
            panorama: imagePath,
            autoLoad: true,
            showControls: false,
            mouseZoom: true,
            touchZoom: true,
            showFullscreenCtrl: false,
            keyboardZoom: true,
            draggable: true,
            disableKeyboardCtrl: false,
            hfov: 100,
            pitch: 0,
            yaw: 0,
            autoRotate: 0,
            hotSpotDebug: false,
            onLoad: () => {
                this.hideLoading();
            },
            onError: (error) => {
                console.error('全景图加载失败:', error);
                alert('图片加载失败，请确保是有效的全景图片');
                this.hideLoading();
            }
        });
    }

    handleFileSelect(event) {
        const file = event.target.files[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            alert('请选择图片文件');
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            this.loadPanorama(e.target.result);
        };
        reader.readAsDataURL(file);
    }

    async toggleGyroscope() {
        if (typeof DeviceOrientationEvent !== 'undefined' &&
            typeof DeviceOrientationEvent.requestPermission === 'function') {
            // iOS 13+ 需要请求权限
            try {
                const permission = await DeviceOrientationEvent.requestPermission();
                if (permission === 'granted') {
                    this.enableGyroscope();
                } else {
                    alert('需要陀螺仪权限才能使用此功能');
                }
            } catch (error) {
                console.error('请求陀螺仪权限失败:', error);
            }
        } else if ('DeviceOrientationEvent' in window) {
            // 非 iOS 或旧版本
            this.enableGyroscope();
        } else {
            alert('您的设备不支持陀螺仪');
        }
    }

    enableGyroscope() {
        if (this.viewer && this.viewer.startAutoRotate) {
            this.viewer.stopAutoRotate();
        }

        this.gyroscopeEnabled = true;
        this.btnGyroscope.classList.add('active');

        window.addEventListener('deviceorientation', (event) => {
            if (!this.gyroscopeEnabled || !this.viewer) return;

            const { alpha, beta, gamma } = event;

            if (alpha !== null && beta !== null && gamma !== null) {
                this.viewer.setPitch(-beta * (Math.PI / 180) * 2);
                this.viewer.setYaw(alpha * (Math.PI / 180));
            }
        });

        alert('陀螺仪已启用，移动设备查看全景');
    }

    disableGyroscope() {
        this.gyroscopeEnabled = false;
        this.btnGyroscope.classList.remove('active');
        window.removeEventListener('deviceorientation', this.handleOrientation);
    }

    toggleFullscreen() {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(err => {
                console.log(`全屏错误: ${err.message}`);
            });
            this.isFullscreen = true;
        } else {
            document.exitFullscreen();
            this.isFullscreen = false;
        }
    }

    showInfo() {
        this.infoPanel.classList.remove('hidden');
    }

    hideInfo() {
        this.infoPanel.classList.add('hidden');
    }

    showLoading() {
        this.loading.classList.remove('hidden');
    }

    hideLoading() {
        this.loading.classList.add('hidden');
    }
}

// 应用启动
document.addEventListener('DOMContentLoaded', () => {
    window.app = new PanoramaViewer();

    // 防止 iOS Safari 弹性滚动
    document.addEventListener('touchmove', (e) => {
        if (e.target.closest('#panorama')) {
            e.preventDefault();
        }
    }, { passive: false });
});

// Capacitor 设备就绪事件
document.addEventListener('deviceready', () => {
    console.log('Capacitor 设备就绪');
}, false);
