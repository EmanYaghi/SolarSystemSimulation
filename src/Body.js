import * as THREE from 'three';

export default class Body {
    constructor({
        name = 'body',
        mesh = null,
        mass = 0,
        position_m = new THREE.Vector3(),
        velocity_m = new THREE.Vector3(),
        fixed = false,
        included = true,
        a_m = 0,
        e = 0
    } = {}) {
        this.name = name;
        this.mesh = mesh;
        this.mass = mass;
        this.position_m = position_m.clone();
        this.velocity_m = velocity_m.clone();
        this.accel_m = new THREE.Vector3();
        this.fixed = !!fixed;
        this.included = !!included;

        // Kepler bookkeeping
        this.a_m = a_m || 0;
        this.e = e || 0;
        this.areal0 = 0;
        this.areal_count = 0;
        this.areal_mean = 0;
        this.areal_M2 = 0;
    }

    updateMesh(metersPerUnit = 1) {
        if (!this.mesh) return;
        this.mesh.position.copy(this.position_m.clone().divideScalar(metersPerUnit));
    }

    kineticEnergy() {
        return 0.5 * this.mass * this.velocity_m.lengthSq();
    }

    potentialWith(other, safeMin = 1e-6) {
        const r = this.position_m.distanceTo(other.position_m);
        const safeR = Math.max(r, safeMin);
        return - (this.mass * other.mass) / safeR;
    }
}
