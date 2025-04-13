// destroyed_tank_effect.js
import * as THREE from 'three';
import { SquareDebris } from './square_debris';
import * as CANNON from 'cannon';

export class DestroyedTankEffect {
    constructor(scene, tank, world, explosionPosition, explosionRadius) {
        this.scene = scene;
        this.tank = tank;
        this.explosionPosition = explosionPosition;
        this.explosionRadius = explosionRadius;
        this.world = world;
        this.debris = [];
        this.duration = 5; // Збільшимо тривалість ефекту
        this.elapsedTime = 0;

        this.createDebris();
        this.createExplosionEffect();
        this.createFlyingTurret();
    }

    createDebris() {
        const debrisCount = 30; // кількість уламків
        const tankPosition = this.tank.mesh.position;
        const tankSize = new THREE.Vector3(1, 0.5, 2).multiplyScalar(this.tank.scale);

        for (let i = 0; i < debrisCount; i++) {
            const position = new THREE.Vector3(
                tankPosition.x + (Math.random() - 0.5) * tankSize.x,
                tankPosition.y + (Math.random() - 0.5) * tankSize.y,
                tankPosition.z + (Math.random() - 0.5) * tankSize.z
            );

            const debris = new SquareDebris(this.scene, position, this.tank.color);
            this.debris.push(debris);

            // Додаємо початкову швидкість від вибуху
            const direction = new THREE.Vector3().subVectors(position, this.explosionPosition).normalize();
            const speed = Math.random() * 10 + 5; // випадкова швидкість від 5 до 15

            // Додаємо вертикальну складову швидкості
            const verticalSpeed = Math.random() * 15 + 5; // випадкова вертикальна швидкість від 5 до 20
            direction.y += verticalSpeed / speed; // додаємо вертикальну складову
            direction.normalize(); // нормалізуємо вектор напрямку

            debris.velocity.copy(direction).multiplyScalar(speed);

            // Додаємо додаткову вертикальну швидкість для деяких уламків
            if (Math.random() < 0.3) { // 30% уламків отримають додаткову вертикальну швидкість
                debris.velocity.y += Math.random() * 7 + 2; // додаткова вертикальна швидкість від 5 до 15
            }
        }
    }

    createExplosionEffect() {
        // Створюємо геометрію для частинок
        const geometry = new THREE.BufferGeometry();
        const particleCount = 500;

        const positions = new Float32Array(particleCount * 3);
        const colors = new Float32Array(particleCount * 3);
        const sizes = new Float32Array(particleCount);

        const color = new THREE.Color();

        for (let i = 0; i < particleCount; i++) {
            const i3 = i * 3;

            // Позиції
            positions[i3] = this.explosionPosition.x + (Math.random() - 0.5) * this.explosionRadius;
            positions[i3 + 1] = this.explosionPosition.y + (Math.random() - 0.5) * this.explosionRadius;
            positions[i3 + 2] = this.explosionPosition.z + (Math.random() - 0.5) * this.explosionRadius;

            // Кольори
            color.setHSL(0.1 + 0.1 * Math.random(), 1.0, 0.5);
            colors[i3] = color.r;
            colors[i3 + 1] = color.g;
            colors[i3 + 2] = color.b;

            // Розміри
            sizes[i] = Math.random() * 0.5 + 0.1;
        }

        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

        // Створюємо матеріал для частинок
        const material = new THREE.PointsMaterial({
            size: 0.1,
            vertexColors: true,
            blending: THREE.AdditiveBlending,
            transparent: true,
            sizeAttenuation: true,
            depthWrite: false
        });

        // Створюємо систему частинок
        this.particleSystem = new THREE.Points(geometry, material);
        this.scene.add(this.particleSystem);

        // Створюємо анімацію для частинок
        this.particleVelocities = [];
        for (let i = 0; i < particleCount; i++) {
            const velocity = new THREE.Vector3(
                (Math.random() - 0.5) * 10,
                (Math.random() - 0.5) * 10,
                (Math.random() - 0.5) * 10
            );
            this.particleVelocities.push(velocity);
        }
    }

    createFlyingTurret() {
        // Створюємо башту
        const turretGeometry = new THREE.CylinderGeometry(0.4 * this.tank.scale, 0.4 * this.tank.scale, 0.3 * this.tank.scale, 16);
        const turretMaterial = new THREE.MeshPhongMaterial({ color: 0x333333 });
        this.turret = new THREE.Mesh(turretGeometry, turretMaterial);
        
        // Створюємо дуло
        const barrelGeometry = new THREE.CylinderGeometry(0.1 * this.tank.scale, 0.1 * this.tank.scale, 1.5 * this.tank.scale, 8);
        const barrelMaterial = new THREE.MeshPhongMaterial({ color: 0x222222 });
        this.barrel = new THREE.Mesh(barrelGeometry, barrelMaterial);
        
        // Позиціонуємо дуло відносно башти
        this.barrel.position.set(0, 0.15 * this.tank.scale, -0.75 * this.tank.scale);
        this.barrel.rotation.x = Math.PI / 2;
        
        // Додаємо дуло до башти
        this.turret.add(this.barrel);
        
        // Встановлюємо початкову позицію та обертання башти
        this.turret.position.copy(this.tank.mesh.position);
        this.turret.position.y += 0.4 * this.tank.scale;
        this.turret.rotation.y = this.tank.mesh.rotation.y + this.tank.turretRotation;
        
        // Додаємо башту до сцени
        this.scene.add(this.turret);

        // Створюємо фізичне тіло для башти
        const shape = new CANNON.Cylinder(
            0.4 * this.tank.scale,
            0.4 * this.tank.scale,
            0.3 * this.tank.scale,
            16
        );
        this.turretBody = new CANNON.Body({
            mass: 500, // маса башти
            shape: shape,
            material: new CANNON.Material({ friction: 0.3, restitution: 0.3 })
        });

        // Встановлюємо початкову позицію та обертання фізичного тіла
        this.turretBody.position.copy(this.turret.position);
        this.turretBody.quaternion.copy(this.turret.quaternion);

        // Задаємо початкову швидкість та кутову швидкість
        const upwardSpeed = Math.random() * 5 + 10;
        const horizontalSpeed = Math.random() * 4 - 2;
        this.turretBody.velocity.set(horizontalSpeed, upwardSpeed, horizontalSpeed);
        this.turretBody.angularVelocity.set(
            Math.random() * 2 - 1,
            Math.random() * 2 - 1,
            Math.random() * 2 - 1
        );

        // Додаємо фізичне тіло до світу
        this.world.addBody(this.turretBody);
    }

    update(deltaTime) {
        this.elapsedTime += deltaTime;

        if (this.elapsedTime >= this.duration) {
            this.remove();
            return false;
        }

        // Оновлюємо уламки
        this.debris.forEach(debris => debris.update(deltaTime));

        // Оновлюємо частинки вибуху
        const positions = this.particleSystem.geometry.attributes.position.array;
        const sizes = this.particleSystem.geometry.attributes.size.array;

        for (let i = 0; i < positions.length; i += 3) {
            const velocity = this.particleVelocities[i / 3];

            positions[i] += velocity.x * deltaTime;
            positions[i + 1] += velocity.y * deltaTime;
            positions[i + 2] += velocity.z * deltaTime;

            // Зменшуємо розмір частинок з часом
            sizes[i / 3] *= 0.99;
        }

        this.particleSystem.geometry.attributes.position.needsUpdate = true;
        this.particleSystem.geometry.attributes.size.needsUpdate = true;

        // Зменшуємо непрозорість частинок з часом
        this.particleSystem.material.opacity = 1 - (this.elapsedTime / this.duration);

        // Оновлюємо позицію та обертання башти відповідно до фізичного тіла
        this.turret.position.copy(this.turretBody.position);
        this.turret.quaternion.copy(this.turretBody.quaternion);

        return true;
    }

    remove() {
        this.debris.forEach(debris => debris.remove());
        this.scene.remove(this.particleSystem);
        this.scene.remove(this.turret);
        this.world.removeBody(this.turretBody);
    }
}