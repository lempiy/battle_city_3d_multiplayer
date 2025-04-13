// square_debris.js
import * as THREE from 'three';

export class SquareDebris {
    constructor(scene, position, color, rotation = 0, size = new THREE.Vector3(0.2,0.2,0.2)) {
        this.scene = scene;
        this.position = position;
        this.color = color;
        this.size = size;
        this.rotation = rotation;
        this.velocity = new THREE.Vector3();
        this.angularVelocity = new THREE.Vector3(
            Math.random() * 5 - 2.5,
            Math.random() * 5 - 2.5,
            Math.random() * 5 - 2.5
        );
        this.removed = false;

        this.createMesh();
    }

    createMesh() {
        const geometry = new THREE.BoxGeometry(this.size.x, this.size.y, this.size.z);
        const material = new THREE.MeshPhongMaterial({ color: this.color });
        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.rotateY(this.rotation);
        this.mesh.position.copy(this.position);
        this.scene.add(this.mesh);
    }

    update(deltaTime) {
        if (this.removed) return;
        if (this.mesh.position.y < -this.size.y) {
            return this.remove();
        }
        // Оновлюємо позицію
        this.mesh.position.addScaledVector(this.velocity, deltaTime);

        // Оновлюємо обертання
        this.mesh.rotation.x += this.angularVelocity.x * deltaTime;
        this.mesh.rotation.y += this.angularVelocity.y * deltaTime;
        this.mesh.rotation.z += this.angularVelocity.z * deltaTime;

        // Додаємо гравітацію
        this.velocity.y -= 9.8 * deltaTime;

        // Зменшуємо швидкість з часом (опір повітря)
        this.velocity.multiplyScalar(0.99);
    }

    remove() {
        if (!this.removed) this.scene.remove(this.mesh);
        this.removed = true;
    }
}