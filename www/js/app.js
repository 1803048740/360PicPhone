class PanoramaViewer {
    constructor() {
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.sphere = null;
        this.texture = null;

        // 统一的视角状态（弧度）
        this.viewState = {
            yaw: 0,      // 水平方向，左右看
            pitch: 0,    // 垂直方向，上下看
            fov: 75      // 视场角
        };

        // 目标视角状态（用于平滑过渡）
        this.targetViewState = {
            yaw: 0,
            pitch: 0,
            fov: 75
        };

        // 交互状态
        this.isDragging = false;
        this.previousTouch = { x: 0, y: 0 };
        this.gyroscopeEnabled = false;
        this.orientationHandler = null;

        // 陀螺仪校准数据
        this.gyroCalibration = {
            calibrated: false,
            baseAlpha: 0,
            baseBeta: 0,
            baseYaw: 0,
            basePitch: 0
        };

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
        this.btnRecalibrate = document.getElementById('btnRecalibrate');
        this.fileInput = document.getElementById('fileInput');
        this.loading = document.getElementById('loading');
        this.infoPanel = document.getElementById('infoPanel');
        this.btnCloseInfo = document.getElementById('btnCloseInfo');
    }

    setupEventListeners() {
        this.btnOpen.addEventListener('click', () => this.fileInput.click());
        this.fileInput.addEventListener('change', (e) => this.handleFileSelect(e));
        this.btnGyroscope.addEventListener('click', () => this.toggleGyroscope());
        this.btnRecalibrate.addEventListener('click', () => this.recalibrateGyroscope());
        this.btnFullscreen.addEventListener('click', () => this.toggleFullscreen());
        this.btnInfo.addEventListener('click', () => this.showInfo());
        this.btnCloseInfo.addEventListener('click', () => this.hideInfo());
        this.infoPanel.addEventListener('click', (e) => {
            if (e.target === this.infoPanel) this.hideInfo();
        });

        window.addEventListener('resize', () => this.onWindowResize());
    }

    initThreeJS() {
        console.log('初始化 Three.js...');

        if (typeof THREE === 'undefined') {
            console.error('Three.js 未加载！');
            document.body.innerHTML = '<div style="padding:20px;text-align:center;"><h1>错误</h1><p>Three.js 库加载失败</p></div>';
            return;
        }

        const container = document.getElementById('panorama');

        // 创建场景
        this.scene = new THREE.Scene();

        // 创建相机（位于球心）
        this.camera = new THREE.PerspectiveCamera(
            this.viewState.fov,
            window.innerWidth / window.innerHeight,
            0.1,
            1000
        );
        this.camera.position.set(0, 0, 0);

        // 创建渲染器
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        container.appendChild(this.renderer.domElement);

        // 设置控制
        this.setupControls();

        // 开始渲染循环
        this.animate();

        console.log('Three.js 初始化完成');
    }

    setupControls() {
        const canvas = this.renderer.domElement;

        // 鼠标/触摸开始
        const onPointerDown = (x, y) => {
            this.isDragging = true;
            this.previousTouch = { x, y };
        };

        // 鼠标/触摸移动 - VR风格：直接改变视角
        const onPointerMove = (x, y) => {
            if (!this.isDragging) return;

            const deltaX = x - this.previousTouch.x;
            const deltaY = y - this.previousTouch.y;

            // 灵敏度
            const sensitivity = 0.003;

            // 向右拖 → yaw增加（向右看）
            // 向下拖 → pitch增加（向下看）
            this.targetViewState.yaw += deltaX * sensitivity;
            this.targetViewState.pitch += deltaY * sensitivity;

            // 限制垂直视角（约 -80° 到 80°）
            this.targetViewState.pitch = Math.max(-1.4, Math.min(1.4, this.targetViewState.pitch));

            this.previousTouch = { x, y };
        };

        // 鼠标/触摸结束
        const onPointerUp = () => {
            this.isDragging = false;
        };

        // 鼠标事件
        canvas.addEventListener('mousedown', (e) => onPointerDown(e.clientX, e.clientY));
        canvas.addEventListener('mousemove', (e) => onPointerMove(e.clientX, e.clientY));
        canvas.addEventListener('mouseup', onPointerUp);
        canvas.addEventListener('mouseleave', onPointerUp);

        // 触摸事件
        canvas.addEventListener('touchstart', (e) => {
            if (e.touches.length === 1) {
                onPointerDown(e.touches[0].clientX, e.touches[0].clientY);
            }
        }, { passive: true });

        canvas.addEventListener('touchmove', (e) => {
            if (this.isDragging && e.touches.length === 1) {
                e.preventDefault();
                onPointerMove(e.touches[0].clientX, e.touches[0].clientY);
            }
        }, { passive: false });

        canvas.addEventListener('touchend', onPointerUp);

        // 双指缩放
        let initialPinchDistance = 0;
        let initialFov = this.viewState.fov;

        canvas.addEventListener('touchstart', (e) => {
            if (e.touches.length === 2) {
                this.isDragging = false;
                const dx = e.touches[0].clientX - e.touches[1].clientX;
                const dy = e.touches[0].clientY - e.touches[1].clientY;
                initialPinchDistance = Math.sqrt(dx * dx + dy * dy);
                initialFov = this.viewState.fov;
            }
        }, { passive: true });

        canvas.addEventListener('touchmove', (e) => {
            if (e.touches.length === 2) {
                e.preventDefault();
                const dx = e.touches[0].clientX - e.touches[1].clientX;
                const dy = e.touches[0].clientY - e.touches[1].clientY;
                const currentDistance = Math.sqrt(dx * dx + dy * dy);

                // 缩放：距离越大，FOV越小
                const scale = initialPinchDistance / currentDistance;
                this.targetViewState.fov = Math.max(40, Math.min(100, initialFov * scale));
            }
        }, { passive: false });

        // 滚轮缩放
        canvas.addEventListener('wheel', (e) => {
            e.preventDefault();
            this.targetViewState.fov += e.deltaY * 0.05;
            this.targetViewState.fov = Math.max(40, Math.min(100, this.targetViewState.fov));
        }, { passive: false });
    }

    // 更新相机旋转
    updateCamera() {
        if (!this.camera) return;

        // 平滑插值到目标视角
        const smoothFactor = this.gyroscopeEnabled ? 0.2 : 0.5;
        this.viewState.yaw += (this.targetViewState.yaw - this.viewState.yaw) * smoothFactor;
        this.viewState.pitch += (this.targetViewState.pitch - this.viewState.pitch) * smoothFactor;
        this.viewState.fov += (this.targetViewState.fov - this.viewState.fov) * 0.3;

        // 应用到相机
        this.camera.fov = this.viewState.fov;
        this.camera.updateProjectionMatrix();

        // 设置相机旋转（使用欧拉角，YXZ顺序避免万向节锁）
        this.camera.rotation.order = 'YXZ';
        this.camera.rotation.y = this.viewState.yaw;
        this.camera.rotation.x = this.viewState.pitch;
        this.camera.rotation.z = 0;
    }

    animate() {
        requestAnimationFrame(() => this.animate());

        this.updateCamera();

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
        if (this.loading) {
            this.loading.classList.remove('hidden');
        }
    }

    hideLoading() {
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

        // 保存纹理引用
        this.texture = texture;

        // 设置纹理参数
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.minFilter = THREE.LinearFilter;
        texture.magFilter = THREE.LinearFilter;

        // 创建球体几何
        const geometry = new THREE.SphereGeometry(500, 60, 40);
        geometry.scale(-1, 1, 1); // 翻转球体，使纹理显示在内部

        // 创建材质
        const material = new THREE.MeshBasicMaterial({ map: texture });

        // 创建网格
        this.sphere = new THREE.Mesh(geometry, material);
        this.scene.add(this.sphere);

        // 重置视角
        this.resetView();

        console.log('全景图创建完成');
    }

    resetView() {
        this.viewState = { yaw: 0, pitch: 0, fov: 75 };
        this.targetViewState = { yaw: 0, pitch: 0, fov: 75 };
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

        if (!file.type.startsWith('image/')) {
            alert('请选择图片文件');
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            this.loadPanorama(e.target.result);
        };
        reader.onerror = () => {
            alert('文件读取失败');
        };
        reader.readAsDataURL(file);
    }

    // ========== 陀螺仪控制 ==========

    async toggleGyroscope() {
        if (this.gyroscopeEnabled) {
            this.disableGyroscope();
            return;
        }

        // 请求权限（iOS 13+）
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
                alert('请求权限失败');
            }
        } else if ('DeviceOrientationEvent' in window) {
            this.enableGyroscope();
        } else {
            alert('您的设备不支持陀螺仪');
        }
    }

    enableGyroscope() {
        // 保存当前视角作为基准
        this.gyroCalibration.baseYaw = this.viewState.yaw;
        this.gyroCalibration.basePitch = this.viewState.pitch;
        this.gyroCalibration.calibrated = false;

        this.gyroscopeEnabled = true;
        this.btnGyroscope.classList.add('active');
        this.btnGyroscope.querySelector('span').textContent = '关闭';
        this.btnRecalibrate.classList.remove('hidden');

        // 绑定方向事件
        this.orientationHandler = this.handleOrientation.bind(this);
        window.addEventListener('deviceorientation', this.orientationHandler);

        this.showToast('陀螺仪已启用');
    }

    handleOrientation(event) {
        if (!this.gyroscopeEnabled) return;

        const { alpha, beta, gamma } = event;

        // 等待有效数据
        if (alpha === null || beta === null) return;

        // 首次校准
        if (!this.gyroCalibration.calibrated) {
            this.gyroCalibration.baseAlpha = alpha;
            this.gyroCalibration.baseBeta = beta;
            this.gyroCalibration.calibrated = true;
            console.log('陀螺仪已校准:', { alpha, beta, gamma });
        }

        // 计算相对角度变化
        // alpha: 水平方向（指南针），0-360°
        // beta: 垂直倾斜，前后倾斜，-180°到180°
        // gamma: 侧向倾斜，-90°到90°

        // 计算alpha差值（处理360环绕）
        let alphaDelta = alpha - this.gyroCalibration.baseAlpha;
        while (alphaDelta > 180) alphaDelta -= 360;
        while (alphaDelta < -180) alphaDelta += 360;

        // 计算beta差值
        let betaDelta = beta - this.gyroCalibration.baseBeta;

        // 转换为弧度
        const yawDelta = alphaDelta * (Math.PI / 180);
        const pitchDelta = betaDelta * (Math.PI / 180);

        // 应用到基准视角
        this.targetViewState.yaw = this.gyroCalibration.baseYaw + yawDelta;
        this.targetViewState.pitch = this.gyroCalibration.basePitch - pitchDelta; // 向上抬为负

        // 限制垂直视角
        this.targetViewState.pitch = Math.max(-1.4, Math.min(1.4, this.targetViewState.pitch));
    }

    recalibrateGyroscope() {
        // 重置校准
        this.gyroCalibration.calibrated = false;

        // 重置视角到中心
        this.resetView();

        // 更新基准视角
        this.gyroCalibration.baseYaw = 0;
        this.gyroCalibration.basePitch = 0;

        this.showToast('视角已重置');
    }

    disableGyroscope() {
        this.gyroscopeEnabled = false;
        this.btnGyroscope.classList.remove('active');
        this.btnGyroscope.querySelector('span').textContent = '陀螺仪';
        this.btnRecalibrate.classList.add('hidden');

        if (this.orientationHandler) {
            window.removeEventListener('deviceorientation', this.orientationHandler);
            this.orientationHandler = null;
        }

        this.gyroCalibration.calibrated = false;
    }

    showToast(message) {
        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.textContent = message;
        document.body.appendChild(toast);

        requestAnimationFrame(() => {
            toast.classList.add('show');
        });

        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 2000);
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
