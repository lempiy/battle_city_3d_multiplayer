// powerup.js
import * as THREE from 'three';
import * as CANNON from 'cannon';
import { findContact } from '../utils/contact';

export default class PowerUp {
    constructor(scene, world, position, game) {
        this.scene = scene;
        this.world = world;
        this.position = position;
        this.game = game;
        this.isDestroyed = false;

        this.createMesh();
        this.createPhysicsBody();
        this.createGlowEffect();
        this.startAnimation();
        this.onCollideListener = null;
    }

    static getMesh() {
        // Створюємо "клітку" з пунктирних ліній
        const cageGeometry = new THREE.BoxGeometry(1, 1, 1);
        const cageEdges = new THREE.EdgesGeometry(cageGeometry);
        const dashedMaterial = new THREE.LineDashedMaterial({ 
            color: 0xffffff, 
            dashSize: 0.4, 
            gapSize: 0.2,
            linewidth: 2 // Зробили лінії товщими
        });
        const cageMesh = new THREE.LineSegments(cageEdges, dashedMaterial);
        cageMesh.computeLineDistances(); // Необхідно для пунктирних ліній

        // Створюємо внутрішній символ (за замовчуванням куб)
        const innerGeometry = new THREE.BoxGeometry(0.5, 0.5, 0.5);
        const innerMaterial = new THREE.MeshPhongMaterial({ color: 0xffff00 });
        const innerMesh = new THREE.Mesh(innerGeometry, innerMaterial);

        // Групуємо все разом
        const mesh = new THREE.Group();
        mesh.add(cageMesh);
        mesh.add(innerMesh);
        return mesh;
    }

    createMesh() {
        // Створюємо "клітку" з пунктирних ліній
        const cageGeometry = new THREE.BoxGeometry(1, 1, 1);
        const cageEdges = new THREE.EdgesGeometry(cageGeometry);
        this.dashedMaterial = new THREE.LineDashedMaterial({ 
            color: 0xffffff, 
            dashSize: 0.4, 
            gapSize: 0.2,
            linewidth: 2 // Зробили лінії товщими
        });
        this.cageMesh = new THREE.LineSegments(cageEdges, this.dashedMaterial);
        this.cageMesh.computeLineDistances(); // Необхідно для пунктирних ліній

        // Створюємо внутрішній символ (за замовчуванням куб)
        const innerGeometry = new THREE.BoxGeometry(0.5, 0.5, 0.5);
        this.innerMaterial = new THREE.MeshPhongMaterial({ color: 0xffff00 });
        this.innerMesh = new THREE.Mesh(innerGeometry, this.innerMaterial);

        // Групуємо все разом
        this.mesh = new THREE.Group();
        this.mesh.add(this.cageMesh);
        this.mesh.add(this.innerMesh);

        this.mesh.position.copy(this.position);
        this.scene.add(this.mesh);
    }

    createGlowEffect() {
        const glowColor = new THREE.Color(0xffffff);

        // Створюємо точкове світло
        this.glowLight = new THREE.PointLight(glowColor, 1, 3);
        this.glowLight.position.set(0, 0, 0);
        this.mesh.add(this.glowLight);
    }

    createPhysicsBody() {
        const shape = new CANNON.Box(new CANNON.Vec3(0.5, 0.5, 0.5));
        this.body = new CANNON.Body({
            mass: 0,
            shape: shape,
            collisionFilterGroup: 2,
            position: new CANNON.Vec3(this.position.x, this.position.y, this.position.z),
        });
        this.body.collisionResponse = false;
        this.world.addBody(this.body);
    }

    onCollide(event) {
        if (this.isDestroyed) return;

        const tank = this.game.tanks.find((tank) => tank.body.id == event.body.id);
        if (!tank) return;
        this.onCollect(tank);
    }

    startAnimation() {
        this.animationTime = 0;
    }

    update(deltaTime) {
        this.animationTime += deltaTime;

        // Обертання
        this.cageMesh.rotation.y = this.animationTime * 0.5;
        this.innerMesh.rotation.y = this.animationTime * -0.5;

        // Підйом і опускання
        const yOffset = Math.sin(this.animationTime * 2) * 0.1;
        this.mesh.position.y = this.position.y + yOffset;

        // Анімація світіння
        const glowIntensity = 0.5 + Math.sin(this.animationTime * 4) * 0.3;
        this.glowLight.intensity = glowIntensity;
        const contact = findContact(this.world.contacts, this.body.id);
        if (contact) this.onCollide(contact);
    }

    onCollect(tank) {
        // Буде перевизначено в дочірніх класах
        
    }

    remove() {
        this.scene.remove(this.mesh);
        this.isDestroyed = true;
        this.world.removeBody(this.body);
    }
}
