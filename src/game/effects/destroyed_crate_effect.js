// destroyed_crate_effect.js
import * as THREE from 'three';
import { SquareDebris } from './square_debris';


export class DestroyedCrateEffect {
    constructor(scene, crate, world, debrisCount, explosionPosition, deepPosition) {
        this.scene = scene;
        this.crate = crate;
        this.fromPosition = deepPosition;
        this.toPosition = explosionPosition;
        this.world = world;
        this.debris = [];
        this.duration = 3;
        this.elapsedTime = 0;
        this.debrisCount = debrisCount;

        this.createDebris();
    }

    createDebris() {
        const debrisCount = Math.min(this.debrisCount, 20); // кількість уламків
        const toPosition = this.toPosition;
        const crateSize = new THREE.Vector3(this.crate.size, this.crate.size, this.crate.size).multiplyScalar(this.crate.scale);
        for (let i = 0; i < debrisCount; i++) {
            const position = new THREE.Vector3(
                toPosition.x + (Math.random() - 0.5) * crateSize.x,
                toPosition.y + (Math.random() - 0.5) * crateSize.y,
                toPosition.z + (Math.random() - 0.5) * crateSize.z
            );
            const debris = new SquareDebris(this.scene, position, this.crate.color, 
                Math.random() > 0.5 ? 0 : Math.PI / 2,
                new THREE.Vector3(this.crate.cubeSize * 2, this.crate.cubeSize, this.crate.cubeSize));
            this.debris.push(debris);

            // Додаємо початкову швидкість від вибуху
            const direction = new THREE.Vector3().subVectors(position, this.fromPosition).normalize();
            const speed = Math.random() * 1 + 2; // випадкова швидкість від 2 до 3

            // Додаємо вертикальну складову швидкості
            const verticalSpeed = Math.random() * 1 + 2; // випадкова вертикальна швидкість від 2 до 3
            direction.y += verticalSpeed / speed; // додаємо вертикальну складову
            direction.normalize(); // нормалізуємо вектор напрямку

            debris.velocity.copy(direction).multiplyScalar(speed);

            // Додаємо додаткову вертикальну швидкість для деяких уламків
            if (Math.random() < 0.3) { // 30% уламків отримають додаткову вертикальну швидкість
                debris.velocity.y += Math.random() * 1 + 5; // додаткова вертикальна швидкість від 5 до 6
            }
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
