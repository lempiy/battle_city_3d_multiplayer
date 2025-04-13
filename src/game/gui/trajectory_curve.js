// trajectory_curve.js
import * as THREE from 'three';

export default class TrajectoryCurve {
    constructor(scene, options = {color: 0xffffff}) {
        this.scene = scene;
        this.curve = null;
        this.line = null;
        this.color = new THREE.Color();
        this.options = options;
        this.color.setHex(options.color);
        this.createCurve();
    }

    createCurve() {
        const material = this.options.dashSize ? new THREE.LineDashedMaterial(({
            color: 0xffffff,
            linewidth: 2,
            scale: 1,
            gapSize: 1,
            opacity: 0.5,
            transparent: true,
            ...this.options,
        })) : new THREE.LineBasicMaterial({
            color: 0xff0000,
            linewidth: 3,
            opacity: 0.5,
            transparent: true,
            ...this.options,
        });

        const geometry = new THREE.BufferGeometry();
        const points = new Float32Array(300); // 100 points * 3 coordinates
        geometry.setAttribute('position', new THREE.BufferAttribute(points, 3));

        this.line = new THREE.Line(geometry, material);
        this.line.computeLineDistances(); // Це потрібно для пунктирної лінії
        this.scene.add(this.line);
    }

    update(trajectoryPoints) {
        if (!this.visible) return;
        if (trajectoryPoints) {
            const positions = this.line.geometry.attributes.position.array;
            for (let i = 0; i < trajectoryPoints.length; i++) {
                const point = trajectoryPoints[i];
                positions[i * 3] = point.x;
                positions[i * 3 + 1] = point.y;
                positions[i * 3 + 2] = point.z;
            }
            if (this.line.material.color != this.color) {
                this.line.material.color = this.color;
            }
            this.line.geometry.attributes.position.needsUpdate = true;
            this.line.geometry.setDrawRange(0, trajectoryPoints.length);
            this.line.computeLineDistances(); // Оновлюємо відстані для пунктирної лінії
            this.line.visible = true;
        } else {
            this.line.visible = false;
        }
    }

    setColor(color) {
        this.color = color;
    }

    setVisible(visible) {
        this.visible = visible;
        this.line.visible = visible;
    }
}