import * as THREE from 'three';
import SceneManager from './SceneManager.js';
import AssetLoader from './AssetLoader.js';
import PhysicsEngine from './PhysicsEngine.js';
import Body from './Body.js';
import OrbitLine from './OrbitLine.js';
import SunManager from './SunManager.js';
import GUIManager from './GUIManager.js';
import DashboardUI from './DashboardUI.js';
import { planetData, specialDistances, SunState, M_SUN, SPIN_MULTIPLIER } from './constants.js';

export default class App {
    constructor(domContainer = document.body) {
        this.container = domContainer;
        this.sceneMgr = new SceneManager(domContainer);
        this.assetLoader = new AssetLoader();
        this.physics = new PhysicsEngine();
        this.guiManager = new GUIManager(this);
        this.dashboard = new DashboardUI(this);
        this.planetData = planetData;
        this.specialDistances = specialDistances;
        this.metersPerUnit = null;
        this.orbitLines = [];
        this.sunMesh = null;
        this.sunLight = null;
        this.lamps = [];
        this.clock = new THREE.Clock();
        this.SunMassDisplay = SunState.mass.toExponential(3);
    }

    // init: load background, create sun, create planets, finalize
    async init() {
        // background
        try {
            const bg = await this.assetLoader.loadTexture('/space.jpg');
            bg.mapping = THREE.EquirectangularReflectionMapping;
            bg.encoding = THREE.sRGBEncoding;
            this.sceneMgr.scene.background = bg;
            this.sceneMgr.scene.environment = bg;
            console.log('Background loaded — starting init()');
        } catch (err) {
            console.error('Failed to load background texture', err);
            // continue without background
        }

        // scene ambient
        this.sceneMgr.scene.add(new THREE.AmbientLight(0xffffff, 1));

        // sun light (central)
        this.sunLight = SunManager.createSunLight(4000);
        this.sceneMgr.scene.add(this.sunLight);

        // decorative lamps
        this.lamps = SunManager.createDecorativeLamps(60, 12, 10000);
        this.lamps.forEach(l => this.sceneMgr.scene.add(l));

        // load sun texture & create sun mesh
        const sunTex = await this.assetLoader.safeLoad('/public/sun2.jpg');
        this.sunMesh = SunManager.createSunMesh(sunTex, 60);
        this.sceneMgr.scene.add(this.sunMesh);

        // add sun body into physics engine as index 0 (fixed by default)
        const sunBody = new Body({
            name: 'sun',
            mesh: this.sunMesh,
            mass: SunState.mass,
            position_m: new THREE.Vector3(0, 0, 0),
            velocity_m: new THREE.Vector3(0, 0, 0),
            fixed: true,
            included: true
        });
        this.physics.addBody(sunBody);

        // compute metersPerUnit using Earth reference (index 2)
        const refIndex = 2;
        this.metersPerUnit = (planetData[refIndex].realdistance * 1000) / specialDistances[refIndex];
        console.log('METERS_PER_UNIT =', this.metersPerUnit);

        // build planets: load textures and create bodies + orbit lines
        await this._createPlanets();

        // after all bodies loaded:
        this._finalizeAfterLoads();

        // build GUI and dashboard
        this.guiManager.setup();
        // pass planetData to dashboard for initial DOM build
        this.dashboard.app.planetDataForUI = this.planetData;
        this.dashboard.build();

        // start animation loop
        this.animate();
    }

    async _createPlanets() {
        const loadPromises = this.planetData.map(async (d, index) => {
            try {
                const tx = await this.assetLoader.safeLoad(d.texture);
                const planetVisualScale = 1.8;
                const geo = new THREE.SphereGeometry(d.scale * planetVisualScale, 48, 48);
                const mat = new THREE.MeshStandardMaterial({ map: tx, roughness: 0.7, metalness: 0 });
                const mesh = new THREE.Mesh(geo, mat);
                this.sceneMgr.scene.add(mesh);

                const theta0 = index * 0.6;
                const a_m = d.realdistance * 1000;
                const r_m = a_m * (1 - d.e * d.e) / (1 + d.e * Math.cos(theta0));
                const x = r_m * Math.cos(theta0);
                const z = r_m * Math.sin(theta0);
                const pos_m = new THREE.Vector3(x, 0, z);

                const v_magnitude = Math.sqrt(Math.max(0, 6.674e-11 * SunState.mass * (2 / r_m - 1 / a_m)));
                let tang = new THREE.Vector3(-Math.sin(theta0), 0, Math.cos(theta0)).normalize();
                const testCrossY = new THREE.Vector3().crossVectors(pos_m, tang).y;
                if (testCrossY < 0) tang.negate();
                const vel_m = tang.multiplyScalar(v_magnitude);

                const cross = new THREE.Vector3().crossVectors(pos_m, vel_m);
                const areal0 = 0.5 * cross.length();

                const body = new Body({
                    name: d.name,
                    mesh,
                    mass: d.mass,
                    position_m: pos_m,
                    velocity_m: vel_m,
                    a_m,
                    e: d.e,
                    included: true
                });
                body.areal0 = areal0;
                body.areal_count = 1;
                body.areal_mean = areal0;

                // add to physics bodies (sun at index 0 remains)
                this.physics.addBody(body);
                const bodyIndex = this.physics.bodies.length - 1;

                // create orbitline and set userData mapping
                const orbit = new OrbitLine({ a_m, e: d.e, metersPerUnit: this.metersPerUnit });
                const lineObj = orbit.getObject3D();
                lineObj.userData = { planetIndex: bodyIndex };
                this.orbitLines.push(lineObj);
                this.sceneMgr.scene.add(lineObj);
            } catch (err) {
                console.error('Failed to load planet texture for', d.name, err);
            }
        });

        // wait for all to finish
        await Promise.all(loadPromises);
    }

    _finalizeAfterLoads() {
        // place meshes correct positions
        for (let i = 0; i < this.physics.bodies.length; i++) {
            const b = this.physics.bodies[i];
            if (b.mesh) b.mesh.position.copy(b.position_m.clone().divideScalar(this.metersPerUnit));
        }

        // remove COM motion (included bodies only)
        this.physics.removeCenterOfMassVelocity();

        // default sim params if not set
        const params = window._simParams || { softening: 1e6 };
        this.physics.computeAllAccelerations(params.softening, !!params.nBody);
        console.log('Finalized bodies:', this.physics.bodies.map(b => b.name));
    }

    // API used by GUIManager / DashboardUI
    computeSystemEnergyAndMomentum(softening = 1e6, includeOnly = true) {
        return this.physics.computeSystemEnergyAndMomentum(softening, includeOnly);
    }

    // called by GUI reset
    resetSystem() {
        const metersPerUnit = this.metersPerUnit;
        if (!this.physics.bodies.length) return;

        // reset sun
        this.physics.bodies[0].position_m.set(0, 0, 0);
        this.physics.bodies[0].velocity_m.set(0, 0, 0);
        this.physics.bodies[0].mass = SunState.mass;

        for (let i = 0; i < this.planetData.length; i++) {
            const d = this.planetData[i];
            const body = this.physics.bodies[i + 1];
            const theta0 = i * 0.6;
            const a_m = d.realdistance * 1000;
            const r_m = a_m * (1 - d.e * d.e) / (1 + d.e * Math.cos(theta0));
            const x = r_m * Math.cos(theta0);
            const z = r_m * Math.sin(theta0);
            body.position_m.set(x, 0, z);

            const v_magnitude = Math.sqrt(Math.max(0, 6.674e-11 * SunState.mass * (2 / r_m - 1 / a_m)));
            let tang = new THREE.Vector3(-Math.sin(theta0), 0, Math.cos(theta0)).normalize();
            const testCrossY = new THREE.Vector3().crossVectors(body.position_m, tang).y;
            if (testCrossY < 0) tang.negate();

            body.velocity_m.copy(tang.multiplyScalar(v_magnitude));
            body.accel_m.set(0, 0, 0);

            const cross = new THREE.Vector3().crossVectors(body.position_m, body.velocity_m);
            body.areal0 = 0.5 * cross.length();
            body.areal_count = 1;
            body.areal_mean = body.areal0;
            body.areal_M2 = 0;

            if (body.mesh) body.mesh.position.copy(body.position_m.clone().divideScalar(metersPerUnit));
        }

        this.physics.removeCenterOfMassVelocity();
        const params = window._simParams || { softening: 1e6 };
        this.physics.computeAllAccelerations(params.softening, !!params.nBody);
    }

    // apply Sun mass changes (triggered from GUI)
    applySunMass() {
        const params = window._simParams;
        if (!params) return;
        const newMass = Number(params.sunMass);
        if (!isFinite(newMass) || newMass <= 0) {
            console.warn('Invalid sun mass value', params.sunMass);
            return;
        }

        const before = this.computeSystemEnergyAndMomentum(params.softening, true);

        SunState.mass = newMass;
        // ensure physics body updated
        if (this.physics.bodies[0]) this.physics.bodies[0].mass = SunState.mass;

        if (params.recomputeSpeeds) {
            for (let i = 1; i < this.physics.bodies.length; i++) {
                const b = this.physics.bodies[i];
                if (!b.included) continue;
                const r_m = b.position_m.length();
                if (b.a_m && b.a_m > 0 && r_m > 0) {
                    const term = Math.max(0, 6.674e-11 * SunState.mass * (2 / r_m - 1 / b.a_m));
                    const v_new = Math.sqrt(term || 0);
                    const tang = new THREE.Vector3(-b.position_m.z, 0, b.position_m.x).normalize();
                    if (new THREE.Vector3().crossVectors(b.position_m, tang).y < 0) tang.negate();
                    b.velocity_m.copy(tang.multiplyScalar(v_new));
                }
            }
        }

        const soft = window._simParams ? window._simParams.softening : 1e6;
        this.physics.computeAllAccelerations(soft, !!(window._simParams && window._simParams.nBody));

        if (window._simParams && window._simParams.nBody) this.physics.removeCenterOfMassVelocity();

        // visual adjustments (match original)
        if (this.sunLight) {
            const ratio = Math.min(8, Math.max(0.25, SunState.mass / M_SUN));
            this.sunLight.intensity = 4000 * ratio;
        }
        if (this.sunMesh) {
            const scale = Math.min(6, Math.max(0.5, SunState.mass / M_SUN));
            this.sunMesh.scale.setScalar(scale);
        }

        const after = this.computeSystemEnergyAndMomentum(soft, true);
        console.log('applySunMass: before=', before, 'after=', after);
        this.SunMassDisplay = SunState.mass.toExponential(3);
    }

    // include/exclude planet by name (dashboard calls this)
    setPlanetIncluded(name, included) {
        // find body by name
        const body = this.physics.bodies.find(b => b.name === name);
        if (!body) {
            console.warn('setPlanetIncluded: body not found for', name);
            return;
        }
        body.included = !!included;
        if (body.mesh) body.mesh.visible = !!included;

        // find orbit line by mapping userData.planetIndex
        const idx = this.physics.bodies.indexOf(body);
        for (let i = 0; i < this.orbitLines.length; i++) {
            const ol = this.orbitLines[i];
            if (ol && ol.userData && ol.userData.planetIndex === idx) {
                ol.visible = !!included && (window._simParams ? window._simParams.showOrbits : true);
            }
        }

        // recompute accelerations and optionally remove COM
        const params = window._simParams || {};
        this.physics.computeAllAccelerations(params.softening, !!params.nBody);
        if (params.nBody) this.physics.removeCenterOfMassVelocity();
    }

    // animate loop
    animate = () => {
        requestAnimationFrame(this.animate);

        const deltaReal = this.clock.getDelta();
        const params = window._simParams;
        if (!params) return;

        const dtSim = deltaReal * params.timeScale;
        if (!params.pause && dtSim > 0) {
            this.physics.step(dtSim, params);
        }

        // update mesh positions
        const mpu = this.metersPerUnit || 1;
        for (let i = 0; i < this.physics.bodies.length; i++) {
            const b = this.physics.bodies[i];
            if (b.mesh) b.mesh.position.copy(b.position_m.clone().divideScalar(mpu));
        }

        // spin rotation for planets
        if (!params.pause && dtSim > 0) {
            for (let i = 1; i < this.physics.bodies.length; i++) {
                const b = this.physics.bodies[i];
                if (!b.mesh || !b.included) continue;
                const r = b.position_m.length();
                if (r <= 1e-6) continue;
                const u_t = new THREE.Vector3(-b.position_m.z, 0, b.position_m.x).divideScalar(r);
                const v_tan = b.velocity_m.dot(u_t);
                const omega = v_tan / r;
                const spin = omega * SPIN_MULTIPLIER;
                b.mesh.rotation.y += spin * dtSim;
            }
        }

        // update UI and render
        this.dashboard.update(this.physics.bodies, this.metersPerUnit, params);
        this.sceneMgr.controls.update();
        this.sceneMgr.render();
    }
}
