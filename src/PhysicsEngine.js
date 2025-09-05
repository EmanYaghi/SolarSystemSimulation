import * as THREE from 'three';
import { G } from './constants.js';

/*
  PhysicsEngine: contains bodies array (Body instances) and all physics logic
  Methods:
   - addBody(body)
   - computeAllAccelerations(softening, useNBody)
   - removeCenterOfMassVelocity()
   - computeSystemEnergyAndMomentum(softening, includeOnly)
   - step(dtSim, params)  // do integration sub-steps and update bodies' positions/velocities
 */
export default class PhysicsEngine {
    constructor() {
        this.bodies = [];
    }

    addBody(body) {
        this.bodies.push(body);
    }

    computeAllAccelerations(softening = 1e6, useNBody = false) {
        // reset accels
        for (let b of this.bodies) b.accel_m.set(0, 0, 0);

        if (!useNBody) {
            // sun-only acceleration on each included planet
            const sun = this.bodies[0];
            if (!sun) return;
            for (let i = 1; i < this.bodies.length; i++) {
                const b = this.bodies[i];
                if (!b.included) continue;
                const r_vec = new THREE.Vector3().subVectors(sun.position_m, b.position_m); // r_sun - r_b
                const dist2 = r_vec.lengthSq() + softening * softening;
                const invDist3 = 1 / Math.pow(dist2, 1.5);
                const a_on_b = r_vec.clone().multiplyScalar(G * sun.mass * invDist3);
                b.accel_m.copy(a_on_b);
            }
        } else {
            // full N-body (pairwise), ignoring excluded bodies
            for (let i = 0; i < this.bodies.length; i++) {
                const bi = this.bodies[i];
                if (!bi.included) continue;
                for (let j = i + 1; j < this.bodies.length; j++) {
                    const bj = this.bodies[j];
                    if (!bj.included) continue;
                    const r_ji = new THREE.Vector3().subVectors(bj.position_m, bi.position_m);
                    const dist2 = r_ji.lengthSq() + softening * softening;
                    const invDist3 = 1 / Math.pow(dist2, 1.5);
                    const f = r_ji.clone().multiplyScalar(G * bi.mass * bj.mass * invDist3);
                    const a_i = f.clone().divideScalar(bi.mass);
                    const a_j = f.clone().divideScalar(-bj.mass);
                    bi.accel_m.add(a_i);
                    bj.accel_m.add(a_j);
                }
            }
        }
    }

    removeCenterOfMassVelocity() {
        let totalMass = 0;
        const mom = new THREE.Vector3(0, 0, 0);
        for (let b of this.bodies) {
            if (!b.included) continue;
            totalMass += b.mass;
            mom.add(b.velocity_m.clone().multiplyScalar(b.mass));
        }
        if (totalMass === 0) return;
        const v_com = mom.divideScalar(totalMass);
        for (let b of this.bodies) {
            if (!b.included) continue;
            b.velocity_m.sub(v_com);
        }
    }

    computeSystemEnergyAndMomentum(softening = 1e6, includeOnly = true) {
        let K = 0;
        let Px = 0, Py = 0, Pz = 0;
        let Mtot = 0;

        for (let b of this.bodies) {
            if (includeOnly && !b.included) continue;
            Mtot += b.mass;
            K += 0.5 * b.mass * b.velocity_m.lengthSq();
            const p = b.velocity_m.clone().multiplyScalar(b.mass);
            Px += p.x; Py += p.y; Pz += p.z;
        }

        // potential
        let U = 0;
        for (let i = 0; i < this.bodies.length; i++) {
            const bi = this.bodies[i];
            if (includeOnly && !bi.included) continue;
            for (let j = i + 1; j < this.bodies.length; j++) {
                const bj = this.bodies[j];
                if (includeOnly && !bj.included) continue;
                const r = bi.position_m.distanceTo(bj.position_m);
                const safeR = Math.max(r, 1e-6);
                U += -G * bi.mass * bj.mass / safeR;
            }
        }

        const Pvec = new THREE.Vector3(Px, Py, Pz);
        const Pmag = Pvec.length();
        const v_com = (Mtot > 0) ? Pmag / Mtot : 0;

        return { K, U, E: K + U, Pmag, Pvec, Mtot, v_com };
    }

    // dtSim: simulated seconds (not real delta). params contains { pause, maxSubstepSeconds, softening, nBody, ...}
    step(dtSim, params = {}) {
        if (!params || params.pause || dtSim <= 0) return;

        const maxSub = Math.max(1, params.maxSubstepSeconds || 3600);
        const nSub = Math.max(1, Math.ceil(dtSim / maxSub));
        const dtSub = dtSim / nSub;

        for (let sub = 0; sub < nSub; sub++) {
            this.computeAllAccelerations(params.softening, !!params.nBody);

            // first half velocity update and position advance
            for (let i = 0; i < this.bodies.length; i++) {
                const b = this.bodies[i];
                if (b.fixed || !b.included) continue;
                const v_half = b.velocity_m.clone().add(b.accel_m.clone().multiplyScalar(dtSub * 0.5));
                b.position_m.add(v_half.clone().multiplyScalar(dtSub));
                b._v_half = v_half;
            }

            this.computeAllAccelerations(params.softening, !!params.nBody);

            for (let i = 0; i < this.bodies.length; i++) {
                const b = this.bodies[i];
                if (b.fixed || !b.included) continue;
                const v_half = b._v_half || b.velocity_m.clone();
                b.velocity_m = v_half.add(b.accel_m.clone().multiplyScalar(dtSub * 0.5));
                delete b._v_half;
            }
        }
    }
}
