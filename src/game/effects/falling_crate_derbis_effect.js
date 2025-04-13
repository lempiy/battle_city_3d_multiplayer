// destroyed_crate_effect.js
import * as THREE from 'three';
import { SquareDebris } from './square_debris';


export class FallingCrateDerbisEffect {
    constructor(scene, crate, world, rectangles) {
        this.scene = scene;
        this.crate = crate;
        this.world = world;
        this.debris = [];
        this.duration = 3;
        this.elapsedTime = 0;
        this.rectangles = rectangles;

        this.createDebris();
    }

    createDebris() {
        for (let i = 0; i < this.rectangles.length; i++) {
            const rectangle = this.rectangles[i];
            const position = new THREE.Vector3(
                rectangle.position.x + this.crate.position.x,
                rectangle.position.y + this.crate.position.y,
                rectangle.position.z + this.crate.position.z
            );
            const debris = new SquareDebris(this.scene, position, this.crate.color, 
                rectangle.isVertical ? 0 : Math.PI / 2,
                new THREE.Vector3(this.crate.cubeSize * 2, this.crate.cubeSize, this.crate.cubeSize));
            this.debris.push(debris);
            const fromPosition = position.clone();
            // direction down
            fromPosition.y = 0;
            const direction = new THREE.Vector3().subVectors(position, fromPosition).normalize();
            const speed = 2;
            debris.velocity.copy(direction).multiplyScalar(speed);
        }
    }


    update(deltaTime) {
        this.elapsedTime += deltaTime;

        if (this.elapsedTime >= this.duration) {
            this.remove();
            return false;
        }
        // Оновлюємо уламки
        this.debris.forEach(debris => debris.update(deltaTime));
        return true;
    }

    remove() {
        this.debris.forEach(debris => debris.remove());
    }
}
