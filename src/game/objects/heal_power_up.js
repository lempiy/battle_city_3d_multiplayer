
// healpowerup.js
import PowerUp from './power_up';
import * as THREE from 'three';

export default class HealPowerUp extends PowerUp {
    static objectId = 3;
    constructor(scene, world, position, game) {
        super(scene, world, position, game);
    }

    static getMesh() {
        const mesh = PowerUp.getMesh();
        const innerMesh = new THREE.Group();

        // Матеріал для хреста
        const crossMaterial = new THREE.MeshPhongMaterial({ 
            color: 0xff0000,
            specular: 0x000055,
            shininess: 30,
            flatShading: true
        });

        // Горизонтальна частина хреста
        const horizontalGeometry = new THREE.BoxGeometry(0.5, 0.1, 0.1);
        const horizontalMesh = new THREE.Mesh(horizontalGeometry, crossMaterial);
        innerMesh.add(horizontalMesh);

        // Вертикальна частина хреста
        const verticalGeometry = new THREE.BoxGeometry(0.1, 0.5, 0.1);
        const verticalMesh = new THREE.Mesh(verticalGeometry, crossMaterial);
        innerMesh.add(verticalMesh);

        // Додаємо невеликі кубики на кінцях для округлення
        const endGeometry = new THREE.BoxGeometry(0.1, 0.1, 0.1);
        const positions = [
            [0.25, 0, 0], [-0.25, 0, 0],  // горизонтальні кінці
            [0, 0.25, 0], [0, -0.25, 0]   // вертикальні кінці
        ];
        positions.forEach(pos => {
            const endMesh = new THREE.Mesh(endGeometry, crossMaterial);
            endMesh.position.set(...pos);
            innerMesh.add(endMesh);
        });
        mesh.children[0].material.needsUpdate = true;
        mesh.children[0].material.color.setHex(0xffffff);
        mesh.remove(mesh.children[1]); // Видаляємо старий innerMesh
        mesh.add(innerMesh);
        return mesh;
    }

    createMesh() {
        super.createMesh();
        const cross = this.game.loader.getModel("cross");
        this.innerMesh = cross;
        this.innerMesh.children[0].material.color.set(1,0,0)
        this.innerMesh.scale.set(0.18,0.18,0.18);
        this.mesh.remove(this.mesh.children[1]); // Видаляємо старий innerMesh
        this.mesh.add(this.innerMesh);
        this.dashedMaterial.needsUpdate = true;
        this.dashedMaterial.color.setHex(0xffffff);
    }

    onCollect(tank) {
        tank.heal(50);
        this.remove();
    }
}
