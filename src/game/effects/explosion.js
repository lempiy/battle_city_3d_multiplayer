import * as THREE from 'three';


class Explosion {
    constructor(scene, position, radius, game, owner) {
        this.scene = scene;
        this.position = position;
        this.radius = radius;
        this.duration = 1;
        this.elapsedTime = 0;
        this.game = game;
        this.owner = owner;

        this.createExplosionCore();
        this.createShockwave();
    }

    createExplosionCore() {
        const geometry = new THREE.SphereGeometry(this.radius/3, 32, 32);
        const material = new THREE.MeshPhongMaterial({
            color: 0xff3300,
            emissive: 0xff7700,
            transparent: true,
            opacity: 0.9
        });
        this.core = new THREE.Mesh(geometry, material);
        this.core.position.copy(this.position);
        this.scene.add(this.core);
    }

    createShockwave() {
        const geometry = new THREE.SphereGeometry(this.radius/3, 32, 32);
        const material = new THREE.MeshBasicMaterial({
            color: 0xff9900,
            transparent: true,
            opacity: 0.7,
            side: THREE.DoubleSide
        });
        this.shockwave = new THREE.Mesh(geometry, material);
        this.shockwave.position.copy(this.position);
        this.shockwave.rotation.x = Math.PI / 2;
        this.scene.add(this.shockwave);
    }

    update(deltaTime) {
        this.elapsedTime += deltaTime;
        const progress = this.elapsedTime / this.duration;

        if (progress >= 1) {
            this.remove();
            return false;
        }

        // Анімація ядра вибуху
        const coreScale = 1 + progress * 0.5;
        this.core.scale.set(coreScale, coreScale, coreScale);
        this.core.material.opacity = 0.9 * (1 - progress);

        // Анімація ударної хвилі
        const shockwaveScale = 1 + progress * 2;
        this.shockwave.scale.set(shockwaveScale, shockwaveScale, shockwaveScale);
        this.shockwave.material.opacity = 0.7 * (1 - progress);

        return true;
    }

    remove() {
        this.scene.remove(this.core);
        this.scene.remove(this.shockwave);
        this.scene.remove(this.particles);
        this.scene.remove(this.light);
    }
}

export default Explosion;