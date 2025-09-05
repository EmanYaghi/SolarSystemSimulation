import * as THREE from 'three';
import SceneManager from './SceneManager.js';
import AssetLoader from './AssetLoader.js';
import PhysicsEngine from './PhysicsEngine.js';
import Body from './Body.js';
import OrbitLine from './OrbitLine.js';
import SunManager from './SunManager.js';
import GUIManager from './GUIManager.js';
import DashboardUI from './DashboardUI.js';
import EclipseManager from './EclipseManager.js';
import { G, planetData, specialDistances, SunState, M_SUN, SPIN_MULTIPLIER, moonData } from './constants.js';

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

        this.moonState = null;           // will hold { bodyIndex, parentIndex, r, theta, n }
        this.MOON_EXTRA_FACTOR = 26;
    }

    async init() {
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
                if (d.name === 'saturn' && d.hasRings) {
                    try {
                        // تحميل القوام الرئيسي للحلقات
                        const ringTex = await this.assetLoader.safeLoad(d.ringTexture);

                        // إنشاء حلقة مخصصة بإحداثيات UV دائرية
                        const innerRadius = d.innerRadius * d.scale * planetVisualScale;
                        const outerRadius = d.outerRadius * d.scale * planetVisualScale;
                        const segments = 128; // زيادة الدقة للحصول على شكل دائري أفضل

                        // إنشاء geometry مخصص للحلقات بدلاً من RingGeometry القياسي
                        const ringGeometry = new THREE.BufferGeometry();

                        const vertices = [];
                        const uvs = [];
                        const indices = [];

                        // إنشاء vertices وUVs للحلقة
                        for (let i = 0; i <= segments; i++) {
                            const angle = (i / segments) * Math.PI * 2;
                            const cos = Math.cos(angle);
                            const sin = Math.sin(angle);

                            // Vertex للحافة الداخلية
                            vertices.push(cos * innerRadius, 0, sin * innerRadius);
                            uvs.push(0, i / segments);

                            // Vertex للحافة الخارجية
                            vertices.push(cos * outerRadius, 0, sin * outerRadius);
                            uvs.push(1, i / segments);
                        }

                        // إنشاء indices للمثلثات
                        for (let i = 0; i < segments; i++) {
                            const i2 = i * 2;

                            // المثلث الأول
                            indices.push(i2, i2 + 1, i2 + 2);

                            // المثلث الثاني
                            indices.push(i2 + 2, i2 + 1, i2 + 3);
                        }

                        // إضافة البيانات إلى geometry
                        ringGeometry.setIndex(indices);
                        ringGeometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
                        ringGeometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
                        ringGeometry.computeVertexNormals();

                        // استخدام MeshPhongMaterial للحصول على مظهر أكثر واقعية
                        const ringMaterial = new THREE.MeshPhongMaterial({
                            map: ringTex,
                            side: THREE.DoubleSide,
                            transparent: true,
                            opacity: 0.8,
                            alphaTest: 0.5,
                            emissive: 0x888888,
                            specular: 0x222222
                        });

                        const ringMesh = new THREE.Mesh(ringGeometry, ringMaterial);
                        //  ringMesh.rotation.x = Math.PI / 2;

                        mesh.add(ringMesh);

                        console.log('Saturn rings created successfully with circular texture mapping');
                    } catch (err) {
                        console.error('Failed to load ring texture for Saturn', err);
                        const ringGeometry = new THREE.RingGeometry(
                            d.innerRadius * d.scale * planetVisualScale,
                            d.outerRadius * d.scale * planetVisualScale,
                            64
                        );

                        const ringMaterial = new THREE.MeshBasicMaterial({
                            color: 0xFFFFFF,
                            side: THREE.DoubleSide,
                            transparent: true,
                            opacity: 0.3
                        });

                        const ringMesh = new THREE.Mesh(ringGeometry, ringMaterial);
                        //ringMesh.rotation.x = Math.PI / 2;
                        mesh.add(ringMesh);
                    }
                }
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

                this.physics.addBody(body);
                const bodyIndex = this.physics.bodies.length - 1;

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

        // find earth body dynamically (avoid hard-coded index)
        const earthIndexInBodies = this.physics.bodies.findIndex(b => b.name === 'earth');
        const earthBody = earthIndexInBodies >= 0 ? this.physics.bodies[earthIndexInBodies] : null;

        if (earthBody) {
            try {
                const moonTex = await this.assetLoader.safeLoad(moonData.texture);
                const moonVisualScale = 2;
                const geo = new THREE.SphereGeometry(moonData.scale * moonVisualScale, 48, 48);
                const mat = new THREE.MeshStandardMaterial({
                    map: moonTex,
                    roughness: 0.7,
                    metalness: 0
                });
                const mesh = new THREE.Mesh(geo, mat);

                // For stability we force the moon onto a circular orbit around Earth at fixed radius
                const theta0 = 0;
                const r_m = moonData.realdistance * this.MOON_EXTRA_FACTOR; // fixed radius (m)

                // Relative position around Earth (initial)
                const x = r_m * Math.cos(theta0);
                const z = r_m * Math.sin(theta0);
                const moonPosRel = new THREE.Vector3(x, 0, z);
                const pos_m = moonPosRel.clone().add(earthBody.position_m);

                // Circular-orbit speed magnitude around Earth: v = sqrt(G * M_earth / r)
                const v_circ = Math.sqrt(Math.max(0, G * earthBody.mass / r_m));
                let tang = new THREE.Vector3(-Math.sin(theta0), 0, Math.cos(theta0)).normalize();
                if (new THREE.Vector3().crossVectors(moonPosRel, tang).y < 0) tang.negate();
                const vel_rel = tang.multiplyScalar(v_circ);
                const vel_m = vel_rel.clone().add(earthBody.velocity_m);

                const body = new Body({
                    name: moonData.name,
                    mesh,
                    mass: moonData.mass,
                    position_m: pos_m,
                    velocity_m: vel_m,
                    a_m: r_m, // store radius in a_m for reference
                    e: 0,     // we force circular behavior for stability
                    included: true
                });

                this.physics.addBody(body);

                const moonLight = new THREE.PointLight(0xffffff, 1, 100);
                mesh.add(moonLight);

                // add mesh to scene (we'll control its position from physics.body.position_m)
                this.sceneMgr.scene.add(mesh);

                // store moonState: fixed radius circular orbit around Earth
                const n = Math.sqrt(G * earthBody.mass / (r_m * r_m * r_m)); // mean motion for circular orbit
                this.moonState = {
                    bodyIndex: this.physics.bodies.length - 1,
                    parentIndex: earthIndexInBodies,
                    r: r_m,
                    theta: theta0,
                    n // rad/s
                };

                console.log('Moon created and linked to Earth at radius (m):', r_m, 'moonBodyIndex:', this.moonState.bodyIndex);

            } catch (err) {
                console.error('Failed to load moon texture', err);
            }
        } else {
            console.error('Earth body not found for moon creation');
        }
    }

    _finalizeAfterLoads() {
        // place meshes correct positions
        for (let i = 0; i < this.physics.bodies.length; i++) {
            const b = this.physics.bodies[i];
            if (b.mesh) b.mesh.position.copy(b.position_m.clone().divideScalar(this.metersPerUnit));
        }
        this.eclipseManager = new EclipseManager({ scene: this.sceneMgr.scene, app: this });
        this.eclipseManager.update();
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

        // re-initialize moonState absolute position & velocity around Earth (if exists)
        if (this.moonState) {
            const ms = this.moonState;
            const moonBody = this.physics.bodies[ms.bodyIndex];
            const earthBody = this.physics.bodies[ms.parentIndex];
            if (moonBody && earthBody) {
                ms.theta = 0; // reset phase
                const r = ms.r;
                const x = r * Math.cos(ms.theta);
                const z = r * Math.sin(ms.theta);
                const rel = new THREE.Vector3(x, 0, z);
                const pos_m = rel.clone().add(earthBody.position_m);
                moonBody.position_m.copy(pos_m);

                // circular speed v = n * r
                const v_mag = ms.n * r;
                let tang = new THREE.Vector3(-Math.sin(ms.theta), 0, Math.cos(ms.theta)).normalize();
                if (new THREE.Vector3().crossVectors(rel, tang).y < 0) tang.negate();
                const vel_rel = tang.multiplyScalar(v_mag);
                moonBody.velocity_m.copy(vel_rel.clone().add(earthBody.velocity_m));

                moonBody.accel_m.set(0, 0, 0);

                if (moonBody.mesh) moonBody.mesh.position.copy(moonBody.position_m.clone().divideScalar(metersPerUnit));
            }
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

            // --- keep moon strictly linked to Earth's center at fixed radius ---
            if (this.moonState && dtSim > 0) {
                const ms = this.moonState;
                const moonBody = this.physics.bodies[ms.bodyIndex];
                const earthBody = this.physics.bodies[ms.parentIndex];
                if (moonBody && earthBody) {
                    // advance phase by mean motion * dt
                    ms.theta += ms.n * dtSim;

                    // relative vector at fixed radius r
                    const r = ms.r;
                    const x = r * Math.cos(ms.theta);
                    const z = r * Math.sin(ms.theta);
                    const rel = new THREE.Vector3(x, 0, z);

                    // update absolute position and velocity
                    const newPos = rel.clone().add(earthBody.position_m);
                    moonBody.position_m.copy(newPos);

                    // circular tangential speed v = n * r (direction is tangential)
                    const v_rel_mag = ms.n * r;
                    let tang = new THREE.Vector3(-Math.sin(ms.theta), 0, Math.cos(ms.theta)).normalize();
                    if (new THREE.Vector3().crossVectors(rel, tang).y < 0) tang.negate();
                    const vel_rel = tang.multiplyScalar(v_rel_mag);
                    const vel_abs = vel_rel.clone().add(earthBody.velocity_m);
                    moonBody.velocity_m.copy(vel_abs);

                    // reset accel to avoid weird transients (physics will recompute)
                    moonBody.accel_m.set(0, 0, 0);
                }
            }
        }

        // update mesh positions
        const mpu = this.metersPerUnit || 1;
        for (let i = 0; i < this.physics.bodies.length; i++) {
            const b = this.physics.bodies[i];
            if (b.mesh) b.mesh.position.copy(b.position_m.clone().divideScalar(mpu));
        }
        if (this.eclipseManager) this.eclipseManager.update();

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
        if (this.sunMesh) {
            this.sunMesh.rotation.y += 0.01 * deltaReal;
        }
        // update UI and render
        this.dashboard.update(this.physics.bodies, this.metersPerUnit, params);
        this.sceneMgr.controls.update();
        this.sceneMgr.render();
    }

}
