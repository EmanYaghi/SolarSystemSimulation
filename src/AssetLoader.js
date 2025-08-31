import * as THREE from 'three';

export default class AssetLoader {
    constructor() {
        this.texLoader = new THREE.TextureLoader();
    }

    loadTexture(url) {
        return new Promise((resolve, reject) => {
            this.texLoader.load(
                url,
                (tex) => resolve(tex),
                undefined,
                (err) => reject(err)
            );
        });
    }

    async safeLoad(url) {
        try {
            const t = await this.loadTexture(url);
            return t;
        } catch (e) {
            console.warn('AssetLoader.safeLoad failed for', url, e);
            return null;
        }
    }
}
