// particleSystem.js
import * as THREE from 'three';

let count = 1;

class ParticleSystem {
    constructor(scene, initialPosition, particleCount) {
        this.scene = scene;
        this.particleCount = particleCount;
        this.isFadingOut = false;
        this.fadeOutDuration = 1; // секунди
        this.fadeOutTimer = 0;
        this.activeParticles = 0;

        this.setupParticles(initialPosition);
    }

    setupParticles(initialPosition) {
        this.particles = new THREE.BufferGeometry();
        this.particlePositions = new Float32Array(this.particleCount * 3);
        this.particleOpacities = new Float32Array(this.particleCount);
        this.particleSizes = new Float32Array(this.particleCount);
        this.particleColors = new Float32Array(this.particleCount * 3);

        for (let i = 0; i < this.particleCount; i++) {
            this.particlePositions[i * 3] = initialPosition.x;
            this.particlePositions[i * 3 + 1] = initialPosition.y;
            this.particlePositions[i * 3 + 2] = initialPosition.z;
            this.particleOpacities[i] = 0;
            this.particleSizes[i] = 0;
            this.particleColors[i * 3] = 0.7;     // R
            this.particleColors[i * 3 + 1] = 0.7; // G
            this.particleColors[i * 3 + 2] = 0.7;   // B
        }

        this.particles.setAttribute('position', new THREE.BufferAttribute(this.particlePositions, 3));
        this.particles.setAttribute('opacity', new THREE.BufferAttribute(this.particleOpacities, 1));
        this.particles.setAttribute('size', new THREE.BufferAttribute(this.particleSizes, 1));
        this.particles.setAttribute('color', new THREE.BufferAttribute(this.particleColors, 3));

        this.particleMaterial = new THREE.PointsMaterial({
            size: 0.2,
            transparent: true,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            vertexColors: true,
            sizeAttenuation: true
        });

        this.particleSystem = new THREE.Points(this.particles, this.particleMaterial);
        this.scene.add(this.particleSystem);
    }

    update(deltaTime, currentPosition, previousPosition) {
        if (this.isFadingOut) {
            this.updateFadeOut(deltaTime);
        } else {
            this.updateActiveParticles(deltaTime, currentPosition, previousPosition);
        }

        // Оновлення буферів
        this.particles.attributes.position.needsUpdate = true;
        this.particles.attributes.opacity.needsUpdate = true;
        this.particles.attributes.size.needsUpdate = true;
        this.particles.attributes.color.needsUpdate = true;
    }

    updateActiveParticles(deltaTime, currentPosition, previousPosition) {
        const velocity = new THREE.Vector3().subVectors(currentPosition, previousPosition).divideScalar(deltaTime);
        const speed = velocity.length();

        // Збільшуємо кількість активних частинок
        this.activeParticles = Math.min(this.activeParticles + 2, this.particleCount);

        // Зсуваємо всі частинки назад
        for (let i = this.activeParticles - 1; i > 0; i--) {
            this.particlePositions[i * 3] = this.particlePositions[(i - 1) * 3];
            this.particlePositions[i * 3 + 1] = this.particlePositions[(i - 1) * 3 + 1];
            this.particlePositions[i * 3 + 2] = this.particlePositions[(i - 1) * 3 + 2];
            
            // Оновлюємо прозорість та розмір частинок
            const fadeRate = 0.95;
            this.particleOpacities[i] = this.particleOpacities[i - 1] * fadeRate;
            this.particleSizes[i] = this.particleSizes[i - 1] * fadeRate;

            // Оновлюємо колір частинок (від яскравого до темного)
            const colorFade = 1 - (i / this.activeParticles);
            this.particleColors[i * 3] = 0.7 * colorFade;     // R
            this.particleColors[i * 3 + 1] = 0.7 * colorFade; // G
            this.particleColors[i * 3 + 2] = 0.7 * colorFade;   // B
        }

        // Оновлюємо першу частинку
        this.particlePositions[0] = currentPosition.x;
        this.particlePositions[1] = currentPosition.y;
        this.particlePositions[2] = currentPosition.z;
        this.particleOpacities[0] = Math.min(speed / 5, 1);
        this.particleSizes[0] = Math.min(speed / 2, 0.4);

        // Додаємо випадкове відхилення для активних частинок
        for (let i = 1; i < this.activeParticles; i++) {
            if (Math.random() < 0.2) {
                this.particlePositions[i * 3] += (Math.random() - 0.5) * 0.15;
                this.particlePositions[i * 3 + 1] += (Math.random() - 0.5) * 0.15;
                this.particlePositions[i * 3 + 2] += (Math.random() - 0.5) * 0.15;
            }
        }

        // Застосовуємо ефект затухання для активних частинок
        for (let i = 0; i < this.activeParticles; i++) {
            const fade = Math.pow(1 - (i / this.activeParticles), 0.5);
            this.particleOpacities[i] *= fade;
        }

        // Встановлюємо нульову прозорість для неактивних частинок
        for (let i = this.activeParticles; i < this.particleCount; i++) {
            this.particleOpacities[i] = 0;
            this.particleSizes[i] = 0;
        }
    }

    updateFadeOut(deltaTime) {
        this.fadeOutTimer += deltaTime;
        const fadeProgress = this.fadeOutTimer / this.fadeOutDuration;

        if (fadeProgress >= 1) {
            this.scene.remove(this.particleSystem);
            return;
        }

        const opacity = 1-fadeProgress;
        this.particleMaterial.opacity = opacity;
    }

    remove() {
        this.scene.remove(this.particleSystem);
    }


    startFadeOut() {
        this.isFadingOut = true;
    }
}

export default ParticleSystem;