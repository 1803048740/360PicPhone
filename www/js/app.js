class PanoramaViewer {
    constructor() {
        this.viewer = null;
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.sphere = null;
        this.isDragging = false;
        this.previousMousePosition = { x: 0, y: 0 };
        this.gyroscopeEnabled = false;
        this.isLoading = false;

        this.init();
    }

    init() {
        this.setupElements();
        this.setupEventListeners();
        this.initThreeJS();
        this.showWelcomeMessage();
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

        // 窗口大小变化
        window.addEventListener('resize', () => this.onWindowResize());
    }

    initThreeJS() {
        console.log('初始化 Three.js...');

        // 检查 Three.js 是否加载
        if (typeof THREE === 'undefined') {
            console.error('Three.js 未加载！');
            document.body.innerHTML = '<div style="padding:20px;text-align:center;"><h1>错误</h1><p>Three.js 库加载失败</p></div>';
            return;
        }

        const container = document.getElementById('panorama');

        // 创建场景
        this.scene = new THREE.Scene();

        // 创建相机
        this.camera = new THREE.PerspectiveCamera(
            75,
            window.innerWidth / window.innerHeight,
            0.1,
            1000
        );
        this.camera.position.set(0, 0, 0.1);

        // 创建渲染器
        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        container.appendChild(this.renderer.domElement);

        // 鼠标/触摸事件
        this.setupControls();

        // 开始渲染循环
        this.animate();

        console.log('Three.js 初始化完成');
    }

    setupControls() {
        const canvas = this.renderer.domElement;

        // 鼠标事件
        canvas.addEventListener('mousedown', (e) => {
            this.isDragging = true;
            this.previousMousePosition = { x: e.clientX, y: e.clientY };
        });

        canvas.addEventListener('mousemove', (e) => {
            if (!this.isDragging) return;

            const deltaX = e.clientX - this.previousMousePosition.x;
            const deltaY = e.clientY - this.previousMousePosition.y;

            this.camera.rotation.y -= deltaX * 0.005;
            this.camera.rotation.x += deltaY * 0.005;

            // 限制垂直视角
            this.camera.rotation.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, this.camera.rotation.x));

            this.previousMousePosition = { x: e.clientX, y: e.clientY };
        });

        canvas.addEventListener('mouseup', () => {
            this.isDragging = false;
        });

        canvas.addEventListener('mouseleave', () => {
            this.isDragging = false;
        });

        // 触摸事件
        canvas.addEventListener('touchstart', (e) => {
            if (e.touches.length === 1) {
                this.isDragging = true;
                this.previousMousePosition = { x: e.touches[0].clientX, y: e.touches[0].clientY };
            }
        });

        canvas.addEventListener('touchmove', (e) => {
            if (!this.isDragging || e.touches.length !== 1) return;
            e.preventDefault();

            const deltaX = e.touches[0].clientX - this.previousMousePosition.x;
            const deltaY = e.touches[0].clientY - this.previousMousePosition.y;

            this.camera.rotation.y -= deltaX * 0.005;
            this.camera.rotation.x += deltaY * 0.005;

            this.camera.rotation.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, this.camera.rotation.x));

            this.previousMousePosition = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        }, { passive: false });

        canvas.addEventListener('touchend', () => {
            this.isDragging = false;
        });

        // 滚轮缩放
        canvas.addEventListener('wheel', (e) => {
            e.preventDefault();
            this.camera.fov += e.deltaY * 0.05;
            this.camera.fov = Math.max(30, Math.min(100, this.camera.fov));
            this.camera.updateProjectionMatrix();
        }, { passive: false });
    }

    animate() {
        requestAnimationFrame(() => this.animate());

        if (this.renderer && this.scene && this.camera) {
            this.renderer.render(this.scene, this.camera);
        }
    }

    onWindowResize() {
        if (!this.camera || !this.renderer) return;

        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    showLoading() {
        this.isLoading = true;
        if (this.loading) {
            this.loading.classList.remove('hidden');
        }
    }

    hideLoading() {
        this.isLoading = false;
        if (this.loading) {
            this.loading.classList.add('hidden');
        }
    }

    loadPanorama(imagePath) {
        console.log('开始加载全景图...');

        // 移除欢迎消息
        const welcomeMsg = document.getElementById('welcomeMessage');
        if (welcomeMsg) {
            welcomeMsg.remove();
        }

        // 清除背景
        document.getElementById('panorama').style.cssText = '';

        this.showLoading();

        // 加载图片
        const loader = new THREE.TextureLoader();
        loader.load(
            imagePath,
            (texture) => {
                console.log('图片加载成功');
                this.createPanorama(texture);
                this.hideLoading();
            },
            (progress) => {
                console.log('加载进度:', (progress.loaded / progress.total * 100).toFixed(1) + '%');
            },
            (error) => {
                console.error('图片加载失败:', error);
                this.hideLoading();
                alert('图片加载失败');
            }
        );
    }

    createPanorama(texture) {
        // 移除旧的球体
        if (this.sphere) {
            this.scene.remove(this.sphere);
            this.sphere.geometry.dispose();
            this.sphere.material.dispose();
        }

        // 设置纹理颜色空间
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.minFilter = THREE.LinearFilter;
        texture.magFilter = THREE.LinearFilter;

        // 创建球体几何
        const geometry = new THREE.SphereGeometry(500, 60, 40);
        geometry.scale(-1, 1, 1); // 翻转球体，使纹理显示在内部

        // 创建材质
        const material = new THREE.MeshBasicMaterial({
            map: texture
        });

        // 创建网格
        this.sphere = new THREE.Mesh(geometry, material);
        this.scene.add(this.sphere);

        // 重置相机位置
        this.camera.rotation.set(0, 0, 0);

        console.log('全景图创建完成');
    }

    showWelcomeMessage() {
        this.hideLoading();

        const welcomeMsg = document.createElement('div');
        welcomeMsg.id = 'welcomeMessage';
        welcomeMsg.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(0, 0, 0, 0.85);
            color: #fff;
            padding: 30px;
            border-radius: 15px;
            text-align: center;
            z-index: 1000;
            max-width: 350px;
            backdrop-filter: blur(10px);
        `;
        welcomeMsg.innerHTML = `
            <div style="font-size: 48px; margin-bottom: 15px;">🌐</div>
            <h2 style="margin: 0 0 15px 0;">360° 全景查看器</h2>
            <p style="color: #ccc; margin-bottom: 20px;">点击"打开图片"加载全景图</p>
            <p style="font-size: 13px; color: #888;">支持任意比例的全景图片</p>
        `;
        document.body.appendChild(welcomeMsg);

        document.getElementById('panorama').style.cssText = `
            background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
        `;
    }

    handleFileSelect(event) {
        const file = event.target.files[0];
        if (!file) return;

        console.log('选择的文件:', file.name, file.type, file.size);

        if (!file.type.startsWith('image/')) {
            alert('请选择图片文件');
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            console.log('文件读取完成');
            this.loadPanorama(e.target.result);
        };
        reader.onerror = (error) => {
            console.error('文件读取失败:', error);
            alert('文件读取失败');
        };
        reader.readAsDataURL(file);
    }

    async toggleGyroscope() {
        if (typeof DeviceOrientationEvent !== 'undefined' &&
            typeof DeviceOrientationEvent.requestPermission === 'function') {
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
            this.enableGyroscope();
        } else {
            alert('您的设备不支持陀螺仪');
        }
    }

    enableGyroscope() {
        this.gyroscopeEnabled = true;
        this.btnGyroscope.classList.add('active');

        window.addEventListener('deviceorientation', (event) => {
            if (!this.gyroscopeEnabled || !this.camera) return;

            const { alpha, beta, gamma } = event;

            if (alpha !== null && beta !== null) {
                // alpha 是绕 Z 轴旋转 (指南针方向)
                // beta 是绕 X 轴旋转 (前后倾斜)
                this.camera.rotation.y = alpha * (Math.PI / 180);
                this.camera.rotation.x = -beta * (Math.PI / 180);
            }
        });

        alert('陀螺仪已启用');
    }

    disableGyroscope() {
        this.gyroscopeEnabled = false;
        this.btnGyroscope.classList.remove('active');
    }

    toggleFullscreen() {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(err => {
                console.log(`全屏错误: ${err.message}`);
            });
        } else {
            document.exitFullscreen();
        }
    }

    showInfo() {
        this.infoPanel.classList.remove('hidden');
    }

    hideInfo() {
        this.infoPanel.classList.add('hidden');
    }
}

// 应用启动
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM 加载完成，初始化应用...');

    // 检查 Three.js 是否加载
    if (typeof THREE === 'undefined') {
        console.error('Three.js 库未加载！');
        document.body.innerHTML = '<div style="padding:20px;text-align:center;"><h1>错误</h1><p>Three.js 库加载失败</p></div>';
        return;
    }

    console.log('Three.js 库已加载');

    window.app = new PanoramaViewer();

    // 防止 iOS Safari 弹性滚动
    document.addEventListener('touchmove', (e) => {
        if (e.target.closest('#panorama')) {
            e.preventDefault();
        }
    }, { passive: false });
});
