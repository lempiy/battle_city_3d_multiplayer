// projectile.js
import * as THREE from 'three';
import * as CANNON from 'cannon';
import Explosion from '../effects/explosion';
import ParticleSystem from '../effects/particle_system';
import { findContact } from '../utils/contact';

class Projectile {
    constructor(scene, world, position, direction, initialVelocity, velocityFactor, game, owner) {
        this.scene = scene;
        this.world = world;
        this.game = game;
        this.isDestroyed = false;
        this.initialVelocity = initialVelocity;
        this.velocityFactor = velocityFactor;
        this.owner = owner;

        // Створюємо 3D модель снаряду
        const geometry = new THREE.SphereGeometry(0.2, 16, 16);
        const material = new THREE.MeshPhongMaterial({ color: 0xff0000 });
        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.position.copy(position);
        this.scene.add(this.mesh);

        // Створюємо фізичне тіло для снаряду
        const shape = new CANNON.Sphere(0.2);
        this.body = new CANNON.Body({
            mass: 5,
            shape: shape,
            position: new CANNON.Vec3(position.x, position.y, position.z),
            velocity: new CANNON.Vec3(
                direction.x * initialVelocity,
                direction.y * initialVelocity,
                direction.z * initialVelocity
            )
        });

        // Додаємо гравітацію до снаряду
        this.body.force.set(0, -9.82 * this.body.mass, 0)

        this.world.addBody(this.body);

        // Створюємо систему частинок для сліду
        this.particleCount = 50;
        if (!this.game.headless) this.particleSystem = new ParticleSystem(scene, position, this.particleCount);

        // Зберігаємо попередню позицію для розрахунку швидкості
        this.previousPosition = position.clone();
    }

    onCollide(event) {
        if (this.isDestroyed) return;
        if (event.body.isCrate && (this.game.isSinglePlayer || this.game.headless)) {
            let localPoint = new CANNON.Vec3();
            event.body.pointToLocalFrame(event.contact.bj.position.clone().vadd(event.contact.rj), localPoint);
                const crate = this.game.battleMap.crates.find((c) => c.body === event.body);
                this.game.damageCrate(this.mesh.position, localPoint, 1, crate);
        }
        const explosionRadius = 1.5; // Можна змінювати за потребою
        this.explode(explosionRadius);
    }

    explode(radius) {
        if (this.isDestroyed) return;
        this.isDestroyed = true;
    
        const explosion = new Explosion(this.scene, this.mesh.position, radius, this.game, this.owner);
        this.game.addExplosion(explosion);
    
        const explosionPos = new CANNON.Vec3().copy(this.body.position);
        if (this.game.isSinglePlayer || this.game.headless) {
            // Перевіряємо всі танки на пошкодження
            this.game.tanks.forEach(tank => {
                const tankPos = tank.body.position;
                const distance = explosionPos.distanceTo(tankPos);
                if (distance <= radius * 2 || tank.isPointInsideTank(explosionPos)) {
                    const damage = this.calculateDamage(distance, radius);
                    this.game.damageTank(damage, tank, radius, this.mesh.position, this.owner);
                }
            });
        }
    
        // Починаємо затухання системи частинок
        if (!this.game.headless) this.particleSystem.startFadeOut();
        this.remove();
    }

    update(deltaTime) {
        // Оновлюємо позицію 3D моделі відповідно до фізичного тіла
        this.mesh.position.copy(this.body.position);
        this.mesh.quaternion.copy(this.body.quaternion);

        // Оновлюємо систему частинок
        if (!this.game.headless) this.particleSystem.update(deltaTime, this.mesh.position, this.previousPosition);

        // Оновлюємо попередню позицію
        this.previousPosition.copy(this.mesh.position);
        const contact = findContact(this.world.contacts, this.body.id);
        if (contact) this.onCollide(contact);
    }

    calculateDamage(distance, radius) {
        const maxDistanceDamage = 25;
        const velocityMaxBonusDamage = 20;
        
        const velocityFactor = this.velocityFactor;
        
        // Якщо вибух стався всередині танка, наносимо максимальні пошкодження
        if (distance === 0) {
            return Math.round(maxDistanceDamage + velocityMaxBonusDamage * velocityFactor);
        }
        
        // Інакше, розраховуємо пошкодження залежно від відстані та швидкості
        const distanceFactor = 1 - distance / (radius * 2);
        console.log(`Deal ${Math.round(maxDistanceDamage * distanceFactor + velocityMaxBonusDamage * velocityFactor)} damage. Velocity bonus: ${velocityMaxBonusDamage * velocityFactor}`);
        return Math.round(maxDistanceDamage * distanceFactor + velocityMaxBonusDamage * velocityFactor);
    }

    remove() {
        // Видаляємо снаряд зі сцени та фізичного світу
        this.scene.remove(this.mesh);
        this.world.removeBody(this.body);
        
        // Починаємо затухання системи частинок
        if (!this.game.headless) this.triggerParticles();
    }

    triggerParticles() {
        this.particleSystem.startFadeOut();
        this.game.addFadingParticleSystem(this.particleSystem);
    }

    createDestroyedTankEffect(tank, radius) {
        this.game.createDestroyedTankEffect(tank, this.mesh.position, radius)
    }

    createDestroyedCrateEffect(crate, count, deepPosition) {
        this.game.createDestroyedCrateEffect(crate, count, this.mesh.position, deepPosition);
    }
}

export default Projectile;