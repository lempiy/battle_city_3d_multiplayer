import * as THREE from 'three';

export class FakeLoader {
    constructor() {
        this.model = new THREE.Object3D()
        const geometry = new THREE.BoxGeometry(1, 1, 1);

        const material = new THREE.MeshStandardMaterial({ 
            color: new THREE.Color(),
        });
        const mesh = new THREE.Mesh(geometry, material)
        this.model.children.push(mesh);

        this.texture = new THREE.DataTexture( new Uint8Array(), 16, 16 );
    }

    getModel(id) {
        return this.model;
    }

    getTexture(id) {
        return this.texture;
    }
}
