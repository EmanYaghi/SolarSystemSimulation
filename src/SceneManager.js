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

        // controls
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
    }

    _onWindowResize() {
        this.camera.aspect = innerWidth / innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(innerWidth, innerHeight);
    }

    render() {
        this.renderer.render(this.scene, this.camera);
    }
}
