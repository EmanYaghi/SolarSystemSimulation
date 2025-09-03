import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

export default class SceneManager {
    constructor(domContainer = document.body) {
        this.container = domContainer;
        this.scene = new THREE.Scene();
        this.camera = null;
        this.renderer = null;
        this.controls = null;
        this._initRendererAndCamera();
        window.addEventListener('resize', this._onWindowResize.bind(this), false);
    }

    _initRendererAndCamera() {
        // camera
        this.camera = new THREE.PerspectiveCamera(75, innerWidth / innerHeight, 0.1, 1e9);
        this.camera.position.set(0, 40, 400);

        // renderer
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(innerWidth, innerHeight);
        this.renderer.outputEncoding = THREE.sRGBEncoding;
        this.renderer.physicallyCorrectLights = true;
        this.container.appendChild(this.renderer.domElement);

        // controls - تحسين الإعدادات
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.screenSpacePanning = true;
        this.controls.minDistance = 50;
        this.controls.maxDistance = 5000;
        this.controls.maxPolarAngle = Math.PI;
        this.controls.enablePan = true;
        this.controls.panSpeed = 1.0;

        // إعدادات إضافية للتحكم السلس
        this.controls.enableKeys = true;
        this.controls.keyPanSpeed = 20.0;

        // إضافة وضع التحكم الحر
        this.freeControlsEnabled = false;
        this.moveSpeed = 50.0;   // units per second
        this.rollSpeed = 0.05;   // radians per frame for rotation keys

        // إعدادات لوحة المفاتيح للتحكم الحر
        this.keyStates = {};

        // previousTime used for delta time
        this.previousTime = performance.now();

        // Event listeners
        document.addEventListener('keydown', (e) => {
            // don't intercept keys while typing in input/textarea or contentEditable
            const active = document.activeElement;
            if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.isContentEditable)) {
                return;
            }

            const key = e.key.toLowerCase();
            this.keyStates[key] = true;

            // prevent default behaviour for movement keys to avoid page scrolling
            const movementKeys = ['w', 'a', 's', 'd', 'q', 'e', 'z', 'x', 'c', 'v', ' '];
            if (movementKeys.includes(key)) {
                e.preventDefault();
            }

            // تبديل وضع التحكم الحر بمفتاح F
            if (key === 'f') {
                this.toggleFreeControls();
            }
        });

        document.addEventListener('keyup', (e) => {
            const key = e.key.toLowerCase();
            this.keyStates[key] = false;
        });
    }

    toggleFreeControls() {
        this.freeControlsEnabled = !this.freeControlsEnabled;
        this.controls.enabled = !this.freeControlsEnabled;

        if (this.freeControlsEnabled) {
            console.log("تم تفعيل التحكم الحر في الكاميرا");
            console.log("استخدم WASD للحركة، QE للصعود/النزول، Z/X/C/V للدوران، وF للعودة إلى التحكم العادي");
            // when entering free mode nothing else needed
        } else {
            console.log("تم تعطيل التحكم الحر في الكاميرا — إعادة تمكين OrbitControls");
            // Smartly set the orbit controls target to a point in front of the camera to avoid snapping
            const dir = new THREE.Vector3();
            this.camera.getWorldDirection(dir);
            const targetDistance = 100; // اختيار مسافة معقولة للأفق/الهدف
            const newTarget = this.camera.position.clone().add(dir.multiplyScalar(targetDistance));
            this.controls.target.copy(newTarget);
            this.controls.update();
        }
    }

    updateFreeControls(deltaTime) {
        if (!this.freeControlsEnabled) return;

        const speed = this.moveSpeed * deltaTime;

        // forward / backward
        if (this.keyStates['w']) {
            this.camera.translateZ(-speed);
        }
        if (this.keyStates['s']) {
            this.camera.translateZ(speed);
        }

        // left / right
        if (this.keyStates['a']) {
            this.camera.translateX(-speed);
        }
        if (this.keyStates['d']) {
            this.camera.translateX(speed);
        }

        // up / down
        if (this.keyStates['e']) {
            this.camera.translateY(speed);
        }
        if (this.keyStates['q']) {
            this.camera.translateY(-speed);
        }

        // rotation (use rotate methods to keep quaternion consistent)
        // yaw
        if (this.keyStates['z']) {
            this.camera.rotateY(-this.rollSpeed);
        }
        if (this.keyStates['x']) {
            this.camera.rotateY(this.rollSpeed);
        }
        // pitch
        if (this.keyStates['c']) {
            this.camera.rotateX(-this.rollSpeed);
        }
        if (this.keyStates['v']) {
            this.camera.rotateX(this.rollSpeed);
        }
    }

    _onWindowResize() {
        this.camera.aspect = innerWidth / innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(innerWidth, innerHeight);
    }

    render() {
        const time = performance.now();
        const deltaTime = (time - this.previousTime) / 1000;
        this.previousTime = time;

        // update free controls (if active)
        this.updateFreeControls(deltaTime);

        // only update OrbitControls if enabled
        if (!this.freeControlsEnabled) {
            this.controls.update();
        }

        this.renderer.render(this.scene, this.camera);
    }
}
