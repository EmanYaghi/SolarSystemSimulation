import * as THREE from 'three';
import { SunState } from './constants.js';

export default class SunManager {
    static createSunMesh(textureOrNull, sunSize = 60) {
        const geo = new THREE.SphereGeometry(sunSize, 64, 64);
        let mat;
        if (textureOrNull) {
            mat = new THREE.MeshBasicMaterial({ map: textureOrNull });
        } else {
            mat = new THREE.MeshBasicMaterial({ color: 0xffff66 });
        }
        const mesh = new THREE.Mesh(geo, mat);
        mesh.name = 'sun';
        return mesh;
    }

    static createSunLight(intensity = 4000) {
        const light = new THREE.PointLight(0xffffff, intensity, 0, 2);
        light.position.set(0, 0, 0);
        return light;
    }

    static createDecorativeLamps(sunSize = 60, numLamps = 12, lampIntensity = 10000) {
        const lamps = [];
        const lampRadius = sunSize + 1;
        for (let i = 0; i < numLamps; i++) {
            const angle = (i / numLamps) * Math.PI * 2;
            const lx = Math.cos(angle) * lampRadius;
            const lz = Math.sin(angle) * lampRadius;
            const lamp = new THREE.PointLight(0xffffff, lampIntensity, 0, 2);
            lamp.position.set(lx, 0, lz);
            lamps.push(lamp);
        }
        return lamps;
    }

    // update visual properties based on SunState.mass
    static adjustVisuals({ sunLight, sunMesh }) {
        if (sunLight) {
            const ratio = Math.min(8, Math.max(0.25, SunState.mass / M_SUN));
        }
    }
}
