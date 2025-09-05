import * as THREE from 'three';

export default class EclipseManager {
    constructor({ scene, app }) {
        this.scene = scene;
        this.app = app;
        this.enabled = true;

        // containers / meshes
        this.moonShadow = null;   // disk on moon
        this.earthShadow = null;  // disk on earth
        this.indicator = null;    // sprite indicator

        // مواد ومتغيرات إضافية للتحكم بإضاءة القمر
        this.originalMoonMaterials = null; // لتخزين المواد الأصلية للقمر
        this.originalMoonOpacity = null; // لتخزين قيمة opacity الأصلية

        // materials (re-used)
        this.shadowMat = new THREE.MeshBasicMaterial({
            color: 0x000000,
            transparent: true,
            opacity: 0.65,
            depthWrite: false,
            side: THREE.DoubleSide
        });

        this.initDone = false;
        this.lastLunarState = false; // لتتبع حالة الكسوف السابقة
        this.lunarEclipseIntensity = 0; // شدة الكسوف (0 - 1)
    }

    makeIndicatorTexture(text) {
        const w = 256, h = 96;
        const canvas = document.createElement('canvas');
        canvas.width = w; canvas.height = h;
        const ctx = canvas.getContext('2d');
        // background transparent
        ctx.clearRect(0, 0, w, h);
        ctx.fillStyle = 'rgba(255,255,255,0.95)';
        ctx.font = '26px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, w / 2, h / 2);
        const tex = new THREE.CanvasTexture(canvas);
        tex.needsUpdate = true;
        return tex;
    }

    _ensureMeshes() {
        if (this.initDone) return;
        // disk geometries created with radius 1 and scaled later
        const segs = 64;
        const circGeo = new THREE.CircleGeometry(1, segs);
        this.moonShadow = new THREE.Mesh(circGeo, this.shadowMat.clone());
        this.moonShadow.visible = false;
        this.moonShadow.renderOrder = 999;
        this.moonShadow.material.depthTest = false;
        this.scene.add(this.moonShadow);

        this.earthShadow = new THREE.Mesh(circGeo, this.shadowMat.clone());
        this.earthShadow.visible = false;
        this.earthShadow.renderOrder = 999;
        this.earthShadow.material.depthTest = false;
        this.scene.add(this.earthShadow);

        // indicator sprite
        const spriteMat = new THREE.SpriteMaterial({
            map: this.makeIndicatorTexture(''),
            depthTest: false,
            depthWrite: false
        });
        this.indicator = new THREE.Sprite(spriteMat);
        this.indicator.scale.set(6, 2.5, 1); // scene units; adjust visually if needed
        this.indicator.visible = false;
        this.scene.add(this.indicator);

        this.initDone = true;
    }

    getMeshRadius(worldMesh) {
        if (!worldMesh || !worldMesh.geometry) return 0.1;
        const geom = worldMesh.geometry;
        if (geom.boundingSphere === null) geom.computeBoundingSphere();
        return geom.boundingSphere ? geom.boundingSphere.radius * (worldMesh.scale ? worldMesh.scale.x : 1) : 0.1;
    }

    // check if point P lies "behind" ref (on same ray direction), and compute perp distance from axis (origin->axisDir)
    _axisProjectionInfo(origin, axisDir, point) {
        const v = point.clone().sub(origin);
        const t = v.dot(axisDir); // signed distance along axis
        const closest = origin.clone().add(axisDir.clone().multiplyScalar(t));
        const perp = point.clone().sub(closest).length();
        return { t, perp, closest };
    }

    // دالة جديدة لتخفيف إضاءة القمر أثناء الكسوف
    _dimMoonLight(moonMesh, isLunarEclipse, umbraFactor) {
        if (!moonMesh) return;

        // حساب شدة الكسوف بناءً على مدى دخول القمر في ظل الأرض
        // umbraFactor يتراوح بين 0 (خارج الظل) و 1 (في منتصف الظل)
        const targetIntensity = isLunarEclipse ? 1 - umbraFactor : 0;

        // تطبيق تغيير تدريجي لشدة الكسوف
        this.lunarEclipseIntensity += (targetIntensity - this.lunarEclipseIntensity) * 0.1;

        // إذا كانت حالة الكسوف لم تتغير بشكل كبير، لا تفعل شيئاً
        if (isLunarEclipse === this.lastLunarState && Math.abs(this.lunarEclipseIntensity - targetIntensity) < 0.01) return;

        if (isLunarEclipse) {
            // حفظ المواد الأصلية للقمر إذا كانت هذه المرة الأولى
            if (!this.originalMoonMaterials) {
                this.originalMoonMaterials = moonMesh.material.clone();
                this.originalMoonOpacity = moonMesh.material.opacity;

                // إذا كان القمر يحتوي على حلقات، نحتاج إلى معالجتها أيضاً
                if (moonMesh.children && moonMesh.children.length > 0) {
                    this.originalMoonChildrenMaterials = [];
                    moonMesh.children.forEach((child, index) => {
                        this.originalMoonChildrenMaterials[index] = child.material.clone();
                    });
                }
            }

            // تخفيف إضاءة القمر بناءً على شدة الكسوف
            const darkness = 0.9 * this.lunarEclipseIntensity; // 90% أقصى تخفيف
            moonMesh.material.opacity = Math.max(0.1, this.originalMoonOpacity - darkness);
            moonMesh.material.needsUpdate = true;

            // تطبيق نفس التعتيم على الأطفال إذا كانوا موجودين
            if (moonMesh.children && this.originalMoonChildrenMaterials) {
                moonMesh.children.forEach((child, index) => {
                    if (this.originalMoonChildrenMaterials[index]) {
                        child.material.opacity = Math.max(0.1, this.originalMoonChildrenMaterials[index].opacity - darkness);
                        child.material.needsUpdate = true;
                    }
                });
            }
        } else {
            // استعادة الإضاءة الأصلية للقمر
            if (this.originalMoonMaterials) {
                moonMesh.material.opacity = this.originalMoonOpacity;
                moonMesh.material.needsUpdate = true;

                // استعادة إضاءة الأطفال إذا كانت موجودة
                if (moonMesh.children && this.originalMoonChildrenMaterials) {
                    moonMesh.children.forEach((child, index) => {
                        if (this.originalMoonChildrenMaterials[index]) {
                            child.material.opacity = this.originalMoonChildrenMaterials[index].opacity;
                            child.material.needsUpdate = true;
                        }
                    });
                }

                // إذا انتهى الكسوف تماماً، مسح البيانات المحفوظة
                if (this.lunarEclipseIntensity < 0.01) {
                    this.originalMoonMaterials = null;
                    this.originalMoonOpacity = null;
                    this.originalMoonChildrenMaterials = null;
                }
            }
        }

        // تحديث حالة الكسوف السابقة
        this.lastLunarState = isLunarEclipse;
    }

    update() {
        if (!this.enabled) return;
        this._ensureMeshes();

        // get references
        const app = this.app;
        const scene = this.scene;
        const bodies = app.physics.bodies;
        if (!bodies || bodies.length < 2) {
            this.moonShadow.visible = this.earthShadow.visible = this.indicator.visible = false;
            return;
        }

        const sunMesh = app.sunMesh;
        if (!sunMesh) return;

        // find earth & moon meshes
        const earthBody = bodies.find(b => b.name === 'earth');
        const moonBody = bodies.find(b => b.name === (app.moonState ? app.moonState.name : 'moon')) || bodies.find(b => b.name === 'moon');
        // fallback by searching mesh names:
        const earthMesh = earthBody && earthBody.mesh ? earthBody.mesh :
            scene.getObjectByName && scene.getObjectByName('earth');
        const moonMesh = moonBody && moonBody.mesh ? moonBody.mesh :
            scene.getObjectByName && scene.getObjectByName('moon');

        if (!earthMesh || !moonMesh) {
            this.moonShadow.visible = this.earthShadow.visible = this.indicator.visible = false;
            return;
        }

        // use current mesh positions (these are in scene units: App sets mesh.position = position_m / metersPerUnit)
        const S = sunMesh.position.clone();
        const E = earthMesh.position.clone();
        const M = moonMesh.position.clone();

        // radii in scene units (mesh geometry)
        const R_e = this.getMeshRadius(earthMesh);
        const R_m = this.getMeshRadius(moonMesh);

        // ---- check LUNAR ECLIPSE: Earth between Sun and Moon ----
        // axis from Sun -> Earth
        const u_se = E.clone().sub(S).normalize();
        const projMoonOnSE = this._axisProjectionInfo(S, u_se, M);
        const projEarthOnSE = this._axisProjectionInfo(S, u_se, E);

        let lunar = false;
        let umbraFactor = 0; // عامل يحدد مدى دخول القمر في ظل الأرض
        const margin = 0.01; // small margin

        // moon must be further along axis than earth (behind earth relative to sun)
        if (projMoonOnSE.t > projEarthOnSE.t + margin) {
            // perpendicular distance of moon from Sun->Earth axis must be less than Earth radius (approx umbra)
            // use factor to tighten threshold (umbra smaller than Earth radius because of Sun size, but we approximate)
            const maxUmbraFactor = 0.95;
            if (projMoonOnSE.perp < R_e * maxUmbraFactor) {
                lunar = true;
                // حساب مدى دخول القمر في ظل الأرض (0 إلى 1)
                umbraFactor = 1 - (projMoonOnSE.perp / (R_e * maxUmbraFactor));
                umbraFactor = Math.max(0, Math.min(1, umbraFactor)); // التأكد من أن القيمة بين 0 و 1
            }
        }

        // ---- check SOLAR ECLIPSE: Moon between Sun and Earth ----
        // ray from Sun through Moon: S + t * u_sm
        const u_sm = M.clone().sub(S).normalize();
        // solve intersection of ray with Earth sphere: |S + t u - E|^2 = R_e^2
        const SE = S.clone().sub(E); // S - E
        const b = 2 * u_sm.dot(SE);
        const c = SE.lengthSq() - R_e * R_e;
        const disc = b * b - 4 * c; // a = 1
        let solar = false;
        let solarHitPoint = null;
        if (disc >= 0) {
            const sqrtD = Math.sqrt(disc);
            const t1 = (-b - sqrtD) / 2;
            const t2 = (-b + sqrtD) / 2;
            // choose smallest positive t
            const t = (t1 > 0) ? t1 : (t2 > 0 ? t2 : null);
            if (t !== null) {
                // ensure moon is between sun and that intersection is beyond moon (i.e., moon casts shadow onto earth)
                const tMoon = u_sm.clone().dot(M.clone().sub(S)); // distance along ray to moon center
                if (tMoon > 0 && t > 0 && t > 0.5 * tMoon) {
                    // we have ray intersection point on Earth surface => shadow exists (approx)
                    solar = true;
                    solarHitPoint = S.clone().add(u_sm.clone().multiplyScalar(t));
                }
            }
        }

        // تطبيق تخفيف الإضاءة على القمر أثناء الكسوف القمري
        this._dimMoonLight(moonMesh, lunar, umbraFactor);

        // ---- update visuals ----
        // default hide
        this.moonShadow.visible = false;
        this.earthShadow.visible = false;
        this.indicator.visible = false;

        if (lunar) {
            // إخفاء دائرة الظل الصغيرة (لأننا نستخدم تخفيف الإضاءة بدلاً من ذلك)
            this.moonShadow.visible = false;

            // indicator near moon
            this.indicator.material.map = this.makeIndicatorTexture('LUNAR ECLIPSE');
            this.indicator.material.map.needsUpdate = true;
            this.indicator.position.copy(M.clone().add(new THREE.Vector3(0, R_m + 1.5, 0)));
            this.indicator.visible = true;
        } else if (solar && solarHitPoint) {
            // place dark circle on earth surface at solarHitPoint
            // normal pointing outwards from earth center
            const normal = solarHitPoint.clone().sub(E).normalize();
            const center = solarHitPoint.clone().add(normal.clone().multiplyScalar(0.0005));
            // approximate disk radius on Earth's surface: r ≈ R_e * (R_m / d_em)
            const d_em = M.clone().distanceTo(E);
            const r_disk = Math.max(0.0005, R_e * (R_m / Math.max(0.0001, d_em)));

            this.earthShadow.position.copy(center);
            const q = new THREE.Quaternion();
            q.setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal);
            this.earthShadow.quaternion.copy(q);
            this.earthShadow.scale.setScalar(r_disk);
            this.earthShadow.visible = true;

            // indicator near earthHit point (slightly above)
            this.indicator.material.map = this.makeIndicatorTexture('SOLAR ECLIPSE');
            this.indicator.material.map.needsUpdate = true;
            this.indicator.position.copy(center.clone().add(normal.clone().multiplyScalar(1.2)));
            this.indicator.visible = true;
        } else {
            // nothing
            this.moonShadow.visible = this.earthShadow.visible = this.indicator.visible = false;
        }
    }
}