import GUI from 'lil-gui';
import { M_SUN, SunState } from './constants.js';

export default class GUIManager {
    constructor(app) {
        this.app = app; // reference to App instance
        this.gui = null;
    }

    setup() {
        if (this.gui) {
            try { this.gui.destroy(); } catch (e) { }
            this.gui = null;
        }

        const defaultParams = {
            timeScale: 60 * 60 * 24,
            showOrbits: true,
            nBody: false,
            softening: 1e6,
            pause: false,
            checkKepler: true,
            maxSubstepSeconds: 1000,
            reset: () => this.app.resetSystem(),
            sunMass: SunState.mass,
            recomputeSpeeds: true,
            applySunMass: () => this.app.applySunMass()
        };

        const g = new GUI();
        g.add(defaultParams, 'timeScale', 60, 60 * 60 * 24 * 365 * 10).name('timeScale (s/s)').step(60);
        g.add(defaultParams, 'showOrbits').name('Show Orbits').onChange(v => {
            if (!this.app.orbitLines) return;
            this.app.orbitLines.forEach(L => {
                if (L && L.userData && typeof L.userData.planetIndex === 'number') {
                    const idx = L.userData.planetIndex;
                    const b = this.app.physics.bodies[idx];
                    L.visible = !!v && b && b.included;
                }
            });
        });
        g.add(defaultParams, 'nBody').name('Enable N-body').onChange(v => {
            const sun = this.app.physics.bodies[0];
            if (sun) sun.fixed = !v;
            this.app.physics.computeAllAccelerations(defaultParams.softening, v);
        });
        g.add(defaultParams, 'softening', 0, 1e8).name('Softening (m)').step(1e5).onChange(v => {
            this.app.physics.computeAllAccelerations(v, defaultParams.nBody);
        });
        g.add(defaultParams, 'maxSubstepSeconds', 10, 86400).name('Max substep (s)').step(10);
        g.add(defaultParams, 'pause').name('Pause');
        g.add(defaultParams, 'checkKepler').name('Check Kepler 2nd Law');

        const sunFolder = g.addFolder('Sun mass (kg)');
        sunFolder.add(defaultParams, 'sunMass').name('sunMass').min(M_SUN * 0.1).max(M_SUN * 4).step(M_SUN * 0.01).onChange(v => {
            defaultParams.sunMass = v;
        });
        sunFolder.add(defaultParams, 'recomputeSpeeds').name('Recompute velocities?');
        sunFolder.add(defaultParams, 'applySunMass').name('Apply Sun Mass');

        g.add(defaultParams, 'reset').name('Reset Positions');

        g.add({ metersPerUnit: this.app.metersPerUnit }, 'metersPerUnit').name('Meters / scene unit').listen();

        window._simParams = defaultParams;
        this.gui = g;
    }

    destroy() {
        if (this.gui) {
            try { this.gui.destroy(); } catch (e) { }
            this.gui = null;
        }
    }
}
