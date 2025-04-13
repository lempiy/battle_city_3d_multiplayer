import * as THREE from 'three';

class PowerUpFactory {
    constructor() {
        const geometry = new THREE.BoxGeometry(2, 2, 2);
        const textureLoader = new THREE.TextureLoader();
        const crateTexture = textureLoader.load(crateSrc);
        const material = new THREE.MeshStandardMaterial({ map: crateTexture });

        this.crateInstancedMesh = new THREE.InstancedMesh(geometry, material, 1000);
        this.crateInstancedMesh.instanceMatrix.setUsage(THREE.StaticDrawUsage);
        this.crateInstancedMesh.castShadow = true;
        this.crateInstancedMesh.receiveShadow = true;
        this.crateInstancedMesh.count = 0;
    }

    createHealPowerUp(position) {

    }
}