class PanoramaViewer {
    constructor() {
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.sphere = null;
        this.texture = null;

        // 图片列表相关
        this.images = [];           // 图片数据URL列表
        this.currentImageIndex = 0; // 当前图片索引

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

        // 左右滑动手势
        this.swipeStartX = 0;
        this.swipeStartTime = 0;

        // 陀螺仪校准数据
        this.gyroCalibration = {
            calibrated: false,
            baseAlpha: 0,
            baseBeta: 0,
            baseYaw: 0,
            basePitch: 0
        };

        // 设置（带默认值）
        this.settings = this.loadSettings();

        this.init();
    }

    // 默认设置
    getDefaultSettings() {
        return {
            dragSensitivity: 1.0,      // 拖拽灵敏度
            gyroSensitivity: 1.0,      // 陀螺仪灵敏度
            smoothness: 50,            // 平滑程度 0-100
            pitchLimit: 80,            // 垂直视角限制（度）
            fov: 75,                   // 默认视场角
            invertDrag: false,         // 反转拖拽
            invertGyro: false          // 反转陀螺仪
        };
    }

    // 从 localStorage 加载设置
    loadSettings() {
        try {
            const saved = localStorage.getItem('panoramaSettings');
            if (saved) {
                return { ...this.getDefaultSettings(), ...JSON.parse(saved) };
            }
        } catch (e) {
            console.error('加载设置失败:', e);
        }
        return this.getDefaultSettings();
    }

    // 保存设置到 localStorage
    saveSettings() {
        try {
            localStorage.setItem('panoramaSettings', JSON.stringify(this.settings));
        } catch (e) {
            console.error('保存设置失败:', e);
        }
    }

    // 重置设置为默认值
    resetSettings() {
        this.settings = this.getDefaultSettings();
        this.saveSettings();
        this.applySettings();
        this.updateSettingsUI();
    }

    // 应用设置
    applySettings() {
        // 更新默认 FOV
        if (this.camera && !this.gyroscopeEnabled) {
            this.targetViewState.fov = this.settings.fov;
        }
    }

    init() {
        this.setupElements();
        this.setupEventListeners();
        this.initThreeJS();
        this.showWelcomeMessage();
    }

    setupElements() {
        this.btnOpen = document.getElementById('btnOpen');
        this.btnAddMore = document.getElementById('btnAddMore');
        this.btnGyroscope = document.getElementById('btnGyroscope');
        this.btnFullscreen = document.getElementById('btnFullscreen');
        this.btnInfo = document.getElementById('btnInfo');
        this.btnSettings = document.getElementById('btnSettings');
        this.btnRecalibrate = document.getElementById('btnRecalibrate');
        this.fileInput = document.getElementById('fileInput');
        this.loading = document.getElementById('loading');
        this.infoPanel = document.getElementById('infoPanel');
        this.settingsPanel = document.getElementById('settingsPanel');
        this.btnCloseInfo = document.getElementById('btnCloseInfo');
        this.btnCloseSettings = document.getElementById('btnCloseSettings');

        // 图片导航控件
        this.imageNav = document.getElementById('imageNav');
        this.imageCounter = document.getElementById('imageCounter');
        this.btnPrev = document.getElementById('btnPrev');
        this.btnNext = document.getElementById('btnNext');

        // 设置控件
        this.inputDragSensitivity = document.getElementById('inputDragSensitivity');
        this.inputGyroSensitivity = document.getElementById('inputGyroSensitivity');
        this.inputSmoothness = document.getElementById('inputSmoothness');
        this.inputPitchLimit = document.getElementById('inputPitchLimit');
        this.inputFov = document.getElementById('inputFov');
        this.checkInvertDrag = document.getElementById('checkInvertDrag');
        this.checkInvertGyro = document.getElementById('checkInvertGyro');

        // 设置值显示
        this.valDragSensitivity = document.getElementById('valDragSensitivity');
        this.valGyroSensitivity = document.getElementById('valGyroSensitivity');
        this.valSmoothness = document.getElementById('valSmoothness');
        this.valPitchLimit = document.getElementById('valPitchLimit');
        this.valFov = document.getElementById('valFov');

        // 设置按钮
        this.btnApplySettings = document.getElementById('btnApplySettings');
        this.btnResetSettings = document.getElementById('btnResetSettings');
    }

    setupEventListeners() {
        this.btnOpen.addEventListener('click', () => this.openNewImages());
        this.btnAddMore.addEventListener('click', () => this.addMoreImages());
        this.fileInput.addEventListener('change', (e) => this.handleFileSelect(e));
        this.btnGyroscope.addEventListener('click', () => this.toggleGyroscope());
        this.btnRecalibrate.addEventListener('click', () => this.recalibrateGyroscope());
        this.btnFullscreen.addEventListener('click', () => this.toggleFullscreen());
        this.btnInfo.addEventListener('click', () => this.showInfo());
        this.btnSettings.addEventListener('click', () => this.showSettings());
        this.btnCloseInfo.addEventListener('click', () => this.hideInfo());
        this.btnCloseSettings.addEventListener('click', () => this.hideSettings());
        this.infoPanel.addEventListener('click', (e) => {
            if (e.target === this.infoPanel) this.hideInfo();
        });
        this.settingsPanel.addEventListener('click', (e) => {
            if (e.target === this.settingsPanel) this.hideSettings();
        });

        // 图片导航
        this.btnPrev.addEventListener('click', () => this.prevImage());
        this.btnNext.addEventListener('click', () => this.nextImage());

        // 设置滑块事件
        this.inputDragSensitivity.addEventListener('input', (e) => {
            this.valDragSensitivity.textContent = parseFloat(e.target.value).toFixed(1) + 'x';
        });
        this.inputGyroSensitivity.addEventListener('input', (e) => {
            this.valGyroSensitivity.textContent = parseFloat(e.target.value).toFixed(1) + 'x';
        });
        this.inputSmoothness.addEventListener('input', (e) => {
            this.valSmoothness.textContent = e.target.value + '%';
        });
        this.inputPitchLimit.addEventListener('input', (e) => {
            this.valPitchLimit.textContent = e.target.value + '°';
        });
        this.inputFov.addEventListener('input', (e) => {
            this.valFov.textContent = e.target.value + '°';
        });

        // 设置按钮事件
        this.btnApplySettings.addEventListener('click', () => this.applySettingsFromUI());
        this.btnResetSettings.addEventListener('click', () => {
            this.resetSettings();
            this.showToast('设置已重置');
        });

        window.addEventListener('resize', () => this.onWindowResize());
    }

    // 更新设置 UI 显示当前值
    updateSettingsUI() {
        this.inputDragSensitivity.value = this.settings.dragSensitivity;
        this.valDragSensitivity.textContent = this.settings.dragSensitivity.toFixed(1) + 'x';

        this.inputGyroSensitivity.value = this.settings.gyroSensitivity;
        this.valGyroSensitivity.textContent = this.settings.gyroSensitivity.toFixed(1) + 'x';

        this.inputSmoothness.value = this.settings.smoothness;
        this.valSmoothness.textContent = this.settings.smoothness + '%';

        this.inputPitchLimit.value = this.settings.pitchLimit;
        this.valPitchLimit.textContent = this.settings.pitchLimit + '°';

        this.inputFov.value = this.settings.fov;
        this.valFov.textContent = this.settings.fov + '°';

        this.checkInvertDrag.checked = this.settings.invertDrag;
        this.checkInvertGyro.checked = this.settings.invertGyro;
    }

    // 从 UI 应用设置
    applySettingsFromUI() {
        this.settings.dragSensitivity = parseFloat(this.inputDragSensitivity.value);
        this.settings.gyroSensitivity = parseFloat(this.inputGyroSensitivity.value);
        this.settings.smoothness = parseInt(this.inputSmoothness.value);
        this.settings.pitchLimit = parseInt(this.inputPitchLimit.value);
        this.settings.fov = parseInt(this.inputFov.value);
        this.settings.invertDrag = this.checkInvertDrag.checked;
        this.settings.invertGyro = this.checkInvertGyro.checked;

        this.saveSettings();
        this.applySettings();
        this.hideSettings();
        this.showToast('设置已保存');
    }

    showSettings() {
        this.updateSettingsUI();
        this.settingsPanel.classList.remove('hidden');
    }

    hideSettings() {
        this.settingsPanel.classList.add('hidden');
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
            this.settings.fov,
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
            this.swipeStartX = x;
            this.swipeStartTime = Date.now();
        };

        // 鼠标/触摸移动 - VR风格：直接改变视角
        const onPointerMove = (x, y) => {
            if (!this.isDragging) return;

            const deltaX = x - this.previousTouch.x;
            const deltaY = y - this.previousTouch.y;

            // 灵敏度
            const sensitivity = 0.003 * this.settings.dragSensitivity;
            const invert = this.settings.invertDrag ? -1 : 1;

            // 向右拖 → yaw增加（向右看）
            // 向下拖 → pitch增加（向下看）
            this.targetViewState.yaw += deltaX * sensitivity * invert;
            this.targetViewState.pitch += deltaY * sensitivity * invert;

            // 限制垂直视角
            const maxPitch = this.settings.pitchLimit * (Math.PI / 180);
            this.targetViewState.pitch = Math.max(-maxPitch, Math.min(maxPitch, this.targetViewState.pitch));

            this.previousTouch = { x, y };
        };

        // 鼠标/触摸结束
        const onPointerUp = (x) => {
            this.isDragging = false;

            // 检测滑动手势（水平切换图片）
            const swipeDistance = x - this.swipeStartX;
            const swipeDuration = Date.now() - this.swipeStartTime;

            // 滑动距离超过100px且时间短于300ms，认为是切换图片手势
            if (Math.abs(swipeDistance) > 100 && swipeDuration < 300) {
                if (swipeDistance > 0) {
                    // 向右滑动 → 上一张
                    this.prevImage();
                } else {
                    // 向左滑动 → 下一张
                    this.nextImage();
                }
            }
        };

        // 鼠标事件
        canvas.addEventListener('mousedown', (e) => onPointerDown(e.clientX, e.clientY));
        canvas.addEventListener('mousemove', (e) => onPointerMove(e.clientX, e.clientY));
        canvas.addEventListener('mouseup', (e) => onPointerUp(e.clientX));
        canvas.addEventListener('mouseleave', () => {
            this.isDragging = false;
        });

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

        canvas.addEventListener('touchend', (e) => {
            if (e.changedTouches.length > 0) {
                onPointerUp(e.changedTouches[0].clientX);
            }
        });

        // 双指缩放
        let initialPinchDistance = 0;
        let initialFov = this.settings.fov;

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
                this.targetViewState.fov = Math.max(40, Math.min(120, initialFov * scale));
            }
        }, { passive: false });

        // 滚轮缩放
        canvas.addEventListener('wheel', (e) => {
            e.preventDefault();
            this.targetViewState.fov += e.deltaY * 0.05;
            this.targetViewState.fov = Math.max(40, Math.min(120, this.targetViewState.fov));
        }, { passive: false });
    }

    // 更新相机旋转
    updateCamera() {
        if (!this.camera) return;

        // 平滑插值到目标视角
        const smoothFactor = this.settings.smoothness / 100;
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

    // ========== 图片导航功能 ==========

    // 打开新图片（替换当前列表）
    openNewImages() {
        this.isAddingMore = false;
        this.fileInput.click();
    }

    // 添加更多图片（追加到当前列表）
    addMoreImages() {
        this.isAddingMore = true;
        this.fileInput.click();
    }

    // 处理文件选择（支持多选和追加）
    handleFileSelect(event) {
        const files = Array.from(event.target.files);
        if (files.length === 0) return;

        // 重置 file input，确保下次可以选择相同文件
        this.fileInput.value = '';

        // 验证文件类型
        const validFiles = files.filter(f => f.type.startsWith('image/'));
        if (validFiles.length === 0) {
            alert('请选择图片文件');
            return;
        }

        if (this.isAddingMore) {
            // 追加模式：添加到现有列表
            this.appendImages(validFiles);
        } else {
            // 替换模式：清空并重新加载
            this.loadNewImages(validFiles);
        }
    }

    // 加载新图片（替换模式）
    loadNewImages(files) {
        this.images = [];
        let loadedCount = 0;

        files.forEach((file, index) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                this.images[index] = e.target.result;
                loadedCount++;

                // 所有图片加载完成后，显示第一张
                if (loadedCount === files.length) {
                    this.currentImageIndex = 0;
                    this.loadImageByIndex(0);
                    this.updateImageNav();
                    this.updateToolbarButtons();
                }
            };
            reader.onerror = () => {
                console.error('文件读取失败:', file.name);
                loadedCount++;
                if (loadedCount === files.length) {
                    if (this.images.length > 0) {
                        this.currentImageIndex = 0;
                        this.loadImageByIndex(0);
                        this.updateImageNav();
                        this.updateToolbarButtons();
                    }
                }
            };
            reader.readAsDataURL(file);
        });
    }

    // 追加图片到现有列表
    appendImages(files) {
        const startIndex = this.images.length;
        let loadedCount = 0;
        const totalFiles = files.length;

        this.showLoading();

        files.forEach((file, index) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                this.images[startIndex + index] = e.target.result;
                loadedCount++;

                // 所有图片加载完成
                if (loadedCount === totalFiles) {
                    this.hideLoading();
                    this.updateImageNav();
                    this.updateToolbarButtons();

                    // 如果之前没有图片，显示第一张
                    if (startIndex === 0) {
                        this.currentImageIndex = 0;
                        this.loadImageByIndex(0);
                    }

                    this.showToast(`已添加 ${totalFiles} 张图片`);
                }
            };
            reader.onerror = () => {
                console.error('文件读取失败:', file.name);
                loadedCount++;
                if (loadedCount === totalFiles) {
                    this.hideLoading();
                    this.updateImageNav();
                    this.updateToolbarButtons();
                    this.showToast(`添加了 ${this.images.length - startIndex} 张图片`);
                }
            };
            reader.readAsDataURL(file);
        });
    }

    // 更新工具栏按钮状态
    updateToolbarButtons() {
        if (this.images.length > 0) {
            this.btnAddMore.classList.remove('hidden');
            this.btnOpen.classList.add('hidden');
        } else {
            this.btnAddMore.classList.add('hidden');
            this.btnOpen.classList.remove('hidden');
        }
    }

    // 按索引加载图片
    loadImageByIndex(index) {
        if (index < 0 || index >= this.images.length) return;

        this.currentImageIndex = index;
        this.loadPanorama(this.images[index]);
        this.updateImageNav();
    }

    // 上一张图片
    prevImage() {
        if (this.images.length <= 1) return;
        const newIndex = this.currentImageIndex - 1;
        if (newIndex < 0) {
            // 循环到最后一张
            this.loadImageByIndex(this.images.length - 1);
        } else {
            this.loadImageByIndex(newIndex);
        }
    }

    // 下一张图片
    nextImage() {
        if (this.images.length <= 1) return;
        const newIndex = this.currentImageIndex + 1;
        if (newIndex >= this.images.length) {
            // 循环到第一张
            this.loadImageByIndex(0);
        } else {
            this.loadImageByIndex(newIndex);
        }
    }

    // 更新图片导航UI
    updateImageNav() {
        if (this.images.length > 1) {
            this.imageNav.classList.remove('hidden');
            this.imageCounter.textContent = `${this.currentImageIndex + 1} / ${this.images.length}`;

            // 更新按钮状态
            this.btnPrev.disabled = false;
            this.btnNext.disabled = false;
        } else {
            this.imageNav.classList.add('hidden');
        }

        // 更新工具栏按钮
        this.updateToolbarButtons();
    }

    // ========== 全景图加载 ==========

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
        this.viewState = { yaw: 0, pitch: 0, fov: this.settings.fov };
        this.targetViewState = { yaw: 0, pitch: 0, fov: this.settings.fov };
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
            <p style="color: #ccc; margin-bottom: 20px;">点击"打开图片"选择全景相册</p>
            <p style="font-size: 13px; color: #888;">支持多选图片，可连续浏览</p>
        `;
        document.body.appendChild(welcomeMsg);

        document.getElementById('panorama').style.cssText = `
            background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
        `;
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
        let alphaDelta = alpha - this.gyroCalibration.baseAlpha;
        while (alphaDelta > 180) alphaDelta -= 360;
        while (alphaDelta < -180) alphaDelta += 360;

        let betaDelta = beta - this.gyroCalibration.baseBeta;

        // 应用灵敏度和反转
        const sensitivity = this.settings.gyroSensitivity;
        const invert = this.settings.invertGyro ? -1 : 1;

        // 转换为弧度
        const yawDelta = alphaDelta * (Math.PI / 180) * sensitivity * invert;
        const pitchDelta = betaDelta * (Math.PI / 180) * sensitivity * invert;

        // 应用到基准视角
        this.targetViewState.yaw = this.gyroCalibration.baseYaw + yawDelta;
        this.targetViewState.pitch = this.gyroCalibration.basePitch - pitchDelta;

        // 限制垂直视角
        const maxPitch = this.settings.pitchLimit * (Math.PI / 180);
        this.targetViewState.pitch = Math.max(-maxPitch, Math.min(maxPitch, this.targetViewState.pitch));
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
