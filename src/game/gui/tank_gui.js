import * as THREE from 'three';

export default class TankGUI {
    constructor(tank) {
        this.tank = tank;
        this.scene = tank.scene;

        this.createStatusBar();
    }

    createStatusBar() {
        const width = 1.4;
        const height = 0.2;
        const depth = 0.01;

        // Створюємо контейнер для статус бару
        this.statusBarContainer = new THREE.Object3D();

        // Створюємо healthBar
        this.healthBar = new THREE.Mesh(
            new THREE.BoxGeometry(width, height, depth),
            new THREE.MeshBasicMaterial({ color: 0x00ff00 })
        );
        this.healthBar.position.y = height / 2;
        this.healthBar.position.x = width / 2;

        // Створюємо shotVelocityBar
        this.shotVelocityBar = new THREE.Mesh(
            new THREE.BoxGeometry(width, height, depth),
            new THREE.MeshBasicMaterial({ color: 0xff6666 })
        );
        this.shotVelocityBar.position.y = -height / 2;
        this.shotVelocityBar.position.x = width / 2;

        // Додаємо бари до контейнера
        this.statusBarContainer.add(this.healthBar);
        this.statusBarContainer.add(this.shotVelocityBar);

        // Позиціонуємо статус бар над танком
        this.statusBarContainer.position.y = 2;

        // Додаємо статус бар до танка
        this.tank.mesh.add(this.statusBarContainer);

        this.width = width;
        this.health = height;
        this.depth = depth;
    }

    update() {
        // Оновлюємо healthBar
        const healthPercentage = this.tank.health / this.tank.maxHealth;
        this.healthBar.scale.x = Math.max(0, healthPercentage);
        this.healthBar.position.x = (this.width / 2) - healthPercentage * (this.width / 2);
    
        // Оновлюємо shotVelocityBar
        const velocityPercentage = (this.tank.shotVelocity - this.tank.minShotVelocity) / (this.tank.maxShotVelocity - this.tank.minShotVelocity);
        this.shotVelocityBar.scale.x = velocityPercentage;
        this.shotVelocityBar.position.x = (this.width / 2) - velocityPercentage * (this.width / 2);
    
        // Отримуємо позицію камери
        const cameraPosition = this.tank.game.cameraController.getCameraPosition();
    
        // Обчислюємо вектор напрямку від статус-бару до камери
        const direction = new THREE.Vector3().subVectors(cameraPosition, this.statusBarContainer.getWorldPosition(new THREE.Vector3()));
    
        // Застосовуємо поворот до статус-бару, щоб він дивився на камеру
        this.statusBarContainer.lookAt(direction.add(this.statusBarContainer.getWorldPosition(new THREE.Vector3())));
    
        // Додатково повертаємо на 180 градусів, щоб текст був правильно орієнтований
        this.statusBarContainer.rotateY(Math.PI);
    }
}