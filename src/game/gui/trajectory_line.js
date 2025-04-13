// trajectory_line.js
import * as THREE from 'three';

export default class TrajectoryLine {
    constructor(scene, isMobile) {
        this.scene = scene;
        this.line = null;
        this.isMobile = isMobile;
        this.createLine();
    }

    createLine() {
        const material = new THREE.LineDashedMaterial({
            color: 0xffffff,
            linewidth: 1,
            scale: 1,
            dashSize: 0.2,
            gapSize: 1,
            opacity: 0.5,
            transparent: true
        });

        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(9); // 3 points * 3 coordinates
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

        this.line = new THREE.Line(geometry, material);
        this.line.computeLineDistances();
        this.scene.add(this.line);
    }

    update(tankPosition, reticlePosition, intersectsEnemy) {
        if (!this.visible) return;
        const direction = new THREE.Vector3().subVectors(reticlePosition, tankPosition).normalize();
        const endPoint = new THREE.Vector3().addVectors(
            reticlePosition,
            direction.multiplyScalar(1000)
        );

        const positions = this.line.geometry.attributes.position.array;
        positions[0] = tankPosition.x;
        positions[1] = tankPosition.y;
        positions[2] = tankPosition.z;
        positions[3] = reticlePosition.x;
        positions[4] = reticlePosition.y;
        positions[5] = reticlePosition.z;
        positions[6] = endPoint.x;
        positions[7] = endPoint.y;
        positions[8] = endPoint.z;

        this.line.geometry.attributes.position.needsUpdate = true;
        this.line.computeLineDistances();

        // Змінюємо прозорість лінії в залежності від перетину з ворожим танком
        this.line.material.opacity = intersectsEnemy ? 1 : 0.5;
    }

    setVisible(visible) {
        this.visible = this.isMobile || visible;
        this.line.visible = this.isMobile || visible;
    }
}