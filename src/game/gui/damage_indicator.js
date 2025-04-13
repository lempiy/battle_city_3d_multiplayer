import * as THREE from 'three';

class DamageIndicator {
    constructor(scene, position, damage) {
        this.scene = scene;
        this.position = position.clone();
        this.damage = damage;
        this.lifeTime = 1; // Час життя індикатора в секундах
        this.elapsedTime = 0;

        this.createText();
    }

    createText() {
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.width = 128;
        canvas.height = 64;

        context.font = 'bold 48px Arial';
        context.fillStyle = 'red';
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        context.fillText(this.damage.toString(), canvas.width / 2, canvas.height / 2);


        const texture = new THREE.CanvasTexture(canvas);
        const material = new THREE.SpriteMaterial({ map: texture, transparent: true });
        this.sprite = new THREE.Sprite(material);
        this.sprite.position.copy(this.position);
        this.sprite.position.y += 2;
        this.sprite.scale.set(2, 1, 1);

        this.scene.add(this.sprite);
    }

    update(deltaTime) {
        this.elapsedTime += deltaTime;

        if (this.elapsedTime >= this.lifeTime) {
            this.remove();
            return false;
        }

        const progress = this.elapsedTime / this.lifeTime;
        
        // Рух вгору
        this.sprite.position.y += deltaTime * 5;
        
        // Зменшення прозорості
        this.sprite.material.opacity = 1 - Math.pow(progress, 3);

        return true;
    }

    remove() {
        this.scene.remove(this.sprite);
    }
}

export default DamageIndicator;