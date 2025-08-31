import * as THREE from 'three';

export default class OrbitLine {
    constructor({ a_m, e, metersPerUnit, segments = 512, color = 0x8888ff, opacity = 0.7 }) {
        this.a_m = a_m;
        this.e = e;
        this.metersPerUnit = metersPerUnit;
        this.segments = segments;

        const pts = [];
        for (let i = 0; i <= segments; i++) {
            const th = (i / segments) * Math.PI * 2;
            const r = a_m * (1 - e * e) / (1 + e * Math.cos(th));
            pts.push(new THREE.Vector3(Math.cos(th) * r / metersPerUnit, 0, Math.sin(th) * r / metersPerUnit));
        }
        const geo = new THREE.BufferGeometry().setFromPoints(pts);
        const mat = new THREE.LineBasicMaterial({ color, transparent: true, opacity });
        this.line = new THREE.Line(geo, mat);
    }

    // convenience to set userData after creation
    setPlanetIndex(idx) {
        if (!this.line.userData) this.line.userData = {};
        this.line.userData.planetIndex = idx;
    }

    getObject3D() {
        return this.line;
    }
}
