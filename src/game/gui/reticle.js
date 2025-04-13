import * as THREE from 'three';

export default class Reticle {
    constructor(scene) {
        this.scene = scene;
        this.mesh = null;
        this.createReticle();
    }

    createReticle() {
        const geometry = new THREE.RingGeometry(0.5, 0.7, 32);
        const material = new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide });
        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.rotation.x = -Math.PI / 2;
        this.mesh.position.y = 0.7;
        this.mesh.visible = false;
        this.scene.add(this.mesh);
    }

    setPosition(position) {
        this.mesh.position.copy(position);
    }

    setScale(scale) {
        this.mesh.scale.set(scale, scale, scale);
    }

    setVisible(visible) {
        this.mesh.visible = visible;
    }
}
