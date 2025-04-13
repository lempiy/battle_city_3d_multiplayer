// src/game/battlemap.js

import * as THREE from 'three';
import * as CANNON from 'cannon';
import Crate from './objects/crate';
import { DestructibleCrateFactory } from './factories/destructable_crate_factory';
import DestructibleCrate from './objects/destructible_crate';


export default class BattleMap {
    constructor(scene, game, size = 50, obstaclesLevel = 6, map = null) {
        this.scene = scene;
        this.game = game;
        this.world = game.world;
        this.size = size;
        this.fence = [];
        this.crates = [];
        this.cratesMeta = [];
        this.crateSize = 2;
        this.crateResolution = 6;
        this.obstaclesLevel = obstaclesLevel;
        this.map = map;
        this.spawnPoints = map ? map.spawnPoints : null;
        this.obstacles = map ? map.obstacles : null;
        this.crateInstancedMesh = null;
        // Створюємо ці об'єкти один раз у конструкторі
        this.tempPosition = new THREE.Vector3();
        this.tempQuaternion = new THREE.Quaternion();
        this.tempScale = new THREE.Vector3(1, 1, 1);
        this.tempMatrix = new THREE.Matrix4();
        if (!this.map) {
            this.createMap();
        }
        this.createGround();
        this.createCrateInstancedMesh();
        this.createFence();
        this.createObstacles();
    }

    static fromMap(scene, game, map) {
        return new BattleMap(scene, game, map.size, map.obstaclesLevel, map);
    }

    createCrateInstancedMesh() {
        const geometry = new THREE.BoxGeometry(2, 2, 2);

        const metalTexture = this.game.loader.getTexture("crate").clone();
        const metalNormalTexture = this.game.loader.getTexture("crate_normal").clone();
        const metalMetallicTexture = this.game.loader.getTexture("crate_metallic").clone();
        const metalRoughnessTexture = this.game.loader.getTexture("crate_roughness").clone();
        const metalAoTexture = this.game.loader.getTexture("crate_ao").clone();

        const crateTexture = this.game.loader.getTexture("crate");
        const material = new THREE.MeshStandardMaterial({ 
            roughness: 0.8,
            color: new THREE.Color(0.2,0.2,0.2),
            metalness: 0.6,
            map: metalTexture,
            roughnessMap: metalRoughnessTexture,
            normalMap: metalNormalTexture,
            metalnessMap: metalMetallicTexture,
            aoMap: metalAoTexture,
         });
        
        // Створюємо InstancedMesh з великою кількістю інстансів
        this.crateInstancedMesh = new THREE.InstancedMesh(geometry, material, 1000);
        this.crateInstancedMesh.instanceMatrix.setUsage(THREE.StaticDrawUsage);
        this.crateInstancedMesh.castShadow = true;
        this.crateInstancedMesh.receiveShadow = true;
        this.crateInstancedMesh.count = 0;
        this.scene.add(this.crateInstancedMesh);
    }

    addCrate(position) {
        const crate = new Crate(position);
        this.fence.push(crate);
        this.world.addBody(crate.body);
        
        // Оновлюємо матрицю трансформації для нового інстансу
        const matrix = new THREE.Matrix4();
        matrix.setPosition(position.x, position.y, position.z);
        this.crateInstancedMesh.count = this.fence.length;
        this.crateInstancedMesh.setMatrixAt(this.fence.length - 1, matrix);
        this.crateInstancedMesh.instanceMatrix.needsUpdate = true;
        return crate;
    }

    createGround() {
        const grassTexture = this.game.loader.getTexture("grass");
        grassTexture.wrapS = THREE.RepeatWrapping;
        grassTexture.wrapT = THREE.RepeatWrapping;
        grassTexture.repeat.set(5, 5);

        const metalTexture = this.game.loader.getTexture("metal").clone();
        metalTexture.wrapS = THREE.RepeatWrapping;
        metalTexture.wrapT = THREE.RepeatWrapping;
        metalTexture.repeat.set(6, 6);

        const metalNormalTexture = this.game.loader.getTexture("metal_normal").clone();
        metalNormalTexture.wrapS = THREE.RepeatWrapping;
        metalNormalTexture.wrapT = THREE.RepeatWrapping;
        metalNormalTexture.repeat.set(6, 6);


        const metalMetallicTexture = this.game.loader.getTexture("metal_metallic").clone();
        metalMetallicTexture.wrapS = THREE.RepeatWrapping;
        metalMetallicTexture.wrapT = THREE.RepeatWrapping;
        metalMetallicTexture.repeat.set(6, 6);


        const metalRoughnessTexture = this.game.loader.getTexture("metal_roughness").clone();
        metalRoughnessTexture.wrapS = THREE.RepeatWrapping;
        metalRoughnessTexture.wrapT = THREE.RepeatWrapping;
        metalRoughnessTexture.repeat.set(6, 6);

        const metalAoTexture = this.game.loader.getTexture("metal_ao").clone();
        metalAoTexture.wrapS = THREE.RepeatWrapping;
        metalAoTexture.wrapT = THREE.RepeatWrapping;
        metalAoTexture.repeat.set(6, 6);
   

        const groundGeometry = new THREE.PlaneGeometry(this.size, this.size);
        // const reflection = reflector( { resolution: 0.5 } ); // 0.5 is half of the rendering view
        // reflection.target.rotateX( - Math.PI / 2 );
        // reflection.uvNode = reflection.uvNode.add( floorNormalOffset );

        const groundMaterial = new THREE.MeshStandardMaterial({
            roughness: 0.8,
            color: new THREE.Color(0.2,0.2,0.2),
            metalness: 0.6,
            map: metalTexture,
            roughnessMap: metalRoughnessTexture,
            normalMap: metalNormalTexture,
            metalnessMap: metalMetallicTexture,
            aoMap: metalAoTexture,
        });
        this.ground = new THREE.Mesh(groundGeometry, groundMaterial);
        this.ground.rotation.x = -Math.PI / 2;
        this.ground.receiveShadow = true;
        this.scene.add(this.ground);

        const groundShape = new CANNON.Plane();
        const groundBody = new CANNON.Body({ mass: 0, material: new CANNON.Material({ friction: 1.5, restitution: 0.3 }) });
        groundBody.addShape(groundShape);
        groundBody.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), -Math.PI / 2);
        this.world.addBody(groundBody);
    }

    createFence() {
        const halfSize = this.size / 2;
        for (let x = -halfSize; x <= halfSize; x += 2) {
            this.addCrate(new THREE.Vector3(x, 1, -halfSize));
            this.addCrate(new THREE.Vector3(x, 1, halfSize));
        }
        for (let z = -halfSize + 2; z < halfSize; z += 2) {
            this.addCrate(new THREE.Vector3(-halfSize, 1, z));
            this.addCrate(new THREE.Vector3(halfSize, 1, z));
        }
        this.crateInstancedMesh.instanceMatrix.needsUpdate = true;
    }

    createMap() {
        const gridSize = this.obstaclesLevel;
        const cellSize = this.size / gridSize;
        const halfSize = this.size / 2;

        // Визначаємо зони безпеки для танків (тепер їх 4)
        this.spawnPoints = [
            // Гравець
            {
                box: new THREE.Box3(
                    new THREE.Vector3(-halfSize, 0, -halfSize),
                    new THREE.Vector3(-halfSize + cellSize * 1.25, cellSize * 1.25, -halfSize + cellSize * 1.25)
                ),
                position: new THREE.Vector3(-25, 0.5, -25),
                rotation: -3 * Math.PI / 4
            },
            // AI 1
            {
                box: new THREE.Box3(
                    new THREE.Vector3(halfSize - cellSize * 1.25, 0, halfSize - cellSize * 1.25),
                    new THREE.Vector3(halfSize, cellSize * 1.25, halfSize)
                ),
                position: new THREE.Vector3(25, 0.5, 25),
                rotation: Math.PI / 4
            },
            // AI 2
            {
                box: new THREE.Box3(
                    new THREE.Vector3(-halfSize, 0, halfSize - cellSize * 1.25),
                    new THREE.Vector3(-halfSize + cellSize * 1.25, cellSize * 1.25, halfSize)
                ),
                position: new THREE.Vector3(-25, 0.5, 25),
                rotation: 3 * Math.PI / 4
            },
            // AI 3
            {
                box: new THREE.Box3(
                    new THREE.Vector3(halfSize - cellSize * 1.25, 0, -halfSize),
                    new THREE.Vector3(halfSize, cellSize * 1.25, -halfSize + cellSize * 1.25)
                ),
                position: new THREE.Vector3(25, 0.5, -25),
                rotation: -Math.PI / 4
            }
        ];
        const cratesMeta = [];
        for (let i = 0; i < gridSize; i++) {
            for (let j = 0; j < gridSize; j++) {
                if (Math.random() < 0.7) {
                    const x = (i - gridSize/2 + 0.5) * cellSize;
                    const z = (j - gridSize/2 + 0.5) * cellSize;
                    
                    // Перевіряємо, чи не знаходиться ця позиція в зоні безпеки
                    const position = new THREE.Vector3(x, 1, z);
                    if (!this.spawnPoints.some(spawn => spawn.box.containsPoint(position))) {
                        const height = Math.random() < 0.3 ? this.crateResolution*2 : this.crateResolution;
                        cratesMeta.push({position: position, height: height, isDirty: false, inactiveCubes: []});
                    }
                }
            }
        }

        this.obstacles = {
            [DestructibleCrate.objectId]: {id: DestructibleCrate.objectId, options: {
                size: this.crateSize,
                resolution: this.crateResolution,
                basicCount: 50,
                crates: cratesMeta
            }}
        };
        this.map = {
            ...this.map,
            spawnPoints: this.spawnPoints,
            obstacles: this.obstacles,
            obstaclesLevel: this.obstaclesLevel,
            size: this.size,
        }
    }

    getMap() {
        const map = this.map;
        map.obstacles[DestructibleCrate.objectId].options.crates = map.
            obstacles[DestructibleCrate.objectId].options.crates.map((o, i) => {
            const c = this.crates[i];
            return {...o, isDirty: c.isDirty, inactiveCubes: c.cubes.filter((cube) => !cube.active).map((cube) => cube.index)}
        })
        return map;
    }

    createObstacles() {
        const destructible = this.obstacles[DestructibleCrate.objectId].options;
        const factory = new DestructibleCrateFactory(this.scene, this.game, destructible.size, destructible.resolution, destructible.basicCount)
        this.crates.push(...factory.produceCrates(destructible.crates));
    }

    removeCrate(crate) {
        const idx = this.crates.indexOf(crate);
        if (idx != -1) {
            this.crates.splice(idx, 1);
        }
    }

    update() {
        // this.crates.forEach((crate, index) => {
        //     if (!crate.body) return;
        //     this.tempPosition.set(
        //         crate.body.position.x,
        //         crate.body.position.y,
        //         crate.body.position.z
        //     );
            
        //     this.tempQuaternion.set(
        //         crate.body.quaternion.x,
        //         crate.body.quaternion.y,
        //         crate.body.quaternion.z,
        //         crate.body.quaternion.w
        //     );
    
        //     this.tempMatrix.compose(this.tempPosition, this.tempQuaternion, this.tempScale);
            
        //     this.crateInstancedMesh.setMatrixAt(index, this.tempMatrix);
        //     crate.update();
        // });
    
        
    }

    getSpawnPoints() {
        return this.spawnPoints.map(spawnPoint => ({
            position: spawnPoint.position.clone(),
            rotation: spawnPoint.rotation
        }));
    }
}
