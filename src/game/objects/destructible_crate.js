import * as THREE from 'three';
import * as CANNON from 'cannon';
import { FallingCrateDerbisEffect } from '../effects/falling_crate_derbis_effect';

export default class DestructibleCrate {
    static objectId = 2;
    constructor(scene, game, position, mesh, offset, geometryScale, color, size = 2, resolution = 6, height = 6) {
        this.id = game.generateCrateId();
        this.scene = scene;
        this.game = game;
        this.mesh = mesh;
        this.color = color;
        this.colorHex = new THREE.Color();
        this.colorHex.setHex(color);
        this.offset = offset;
        this.geometryScale = geometryScale;
        this.world = game.world;
        this.position = position;
        this.size = size;
        this.resolution = resolution;
        this.height = height;
        this.cubeSize = size / resolution;
        this.cubes = [];
        this.shapes = [];
        this.scale = 1;
        this.rectSizes = null;
        this.boxQuaternion = new THREE.Quaternion();
        this.scaleVec = new THREE.Vector3(1, 1, 1);
        this.boxIndexes = [];
        this.rectIndexes = [];
        this.isDirty = false;
        this.activeCount = 0;

        this.buildMesh();
        this.createPhysicsBody();
    }

    buildMesh() {
        this.geometry = new THREE.BoxGeometry(this.cubeSize*2, this.cubeSize, this.cubeSize);
        this.verticalGeometry = new THREE.BoxGeometry(this.cubeSize, this.cubeSize, this.cubeSize*2);
        this.rectSizes = new THREE.Vector3(this.cubeSize*2, this.cubeSize, this.cubeSize);

        let index = this.offset;
        const matrix = new THREE.Matrix4();

        const buildPyramidBot = (posY, offset) => {
            for (let z = 0; z < this.resolution - (offset ? 1 : 0); z++) {
                for (let x = 0; x < ((this.resolution/2) - z) - (offset ? 1 : 0); x++) {
                    const posX = offset + z * this.cubeSize + x * (this.cubeSize*2) - this.size / 2 + (this.cubeSize*2) / 2;
                    const posZ = z * this.cubeSize - this.size / 2 + this.cubeSize / 2;

                    const mx = matrix.makeRotationY(0);
                    mx.setPosition(
                        this.position.x + posX,
                        this.position.y + posY,
                        this.position.z + posZ
                    );
                    mx.scale(this.geometryScale); 
                    this.mesh.setMatrixAt(index, mx);
                    //this.mesh.setColorAt(index, this.colorHex);
                    const shape = new CANNON.Box(new CANNON.Vec3(this.cubeSize, this.cubeSize/2, this.cubeSize/2));
                    this.shapes.push({shape, offset: new THREE.Vector3(posX, posY, posZ), active: false});
                    this.cubes.push({ index: index, isVertical: false, position: new THREE.Vector3(posX, posY, posZ), active: true });
                    index++;
                    this.activeCount++;
                }
            }
        }

        const buildPyramidRight = (posY, offset) => {
            for (let x = 0; x < (this.resolution/2) - (offset ? 1 : 0); x++) {
                for (let z = 0; z < ((this.resolution/2)-x) - (offset ? 1 : 0); z++) {
                    const posZ = offset + x * this.cubeSize + z * (this.cubeSize*2) - this.size / 2 + (this.cubeSize*2) / 2;
                    const posX = x * this.cubeSize - this.size / 2 + this.cubeSize / 2;
                    
                    const mx = matrix.makeRotationY(Math.PI / 2);
                    mx.setPosition(
                        this.position.x + posX,
                        this.position.y + posY,
                        this.position.z + posZ
                    );
                    mx.scale(this.geometryScale); 
                    this.mesh.setMatrixAt(index, mx);
                    //this.mesh.setColorAt(index, this.colorHex);
                    const shape = new CANNON.Box(new CANNON.Vec3(this.cubeSize/2, this.cubeSize/2, this.cubeSize));
                    this.shapes.push({shape, offset: new THREE.Vector3(posX, posY, posZ), active: false});
                    this.cubes.push({ index: index, isVertical: true, position: new THREE.Vector3(posX, posY, posZ), active: true });
                    index++;
                    this.activeCount++;
                }
            }
        }

        const buildPyramidLeft = (posY, offset) => {
            let level = 0;
            for (let x = this.resolution-1-(offset ? 1 : 0); x >= (this.resolution/2); x--) {
                for (let z = ((this.resolution/2)-level)-1-(offset ? 1 : 0); z >= 0; z--) {
                    const posZ = level * this.cubeSize + z * (this.cubeSize*2) - this.size / 2 + (this.cubeSize*2) / 2 + offset;
                    const posX = x * this.cubeSize - this.size / 2 + this.cubeSize / 2 + offset;
                    const mx = matrix.makeRotationY(Math.PI / 2);
                    mx.setPosition(
                        this.position.x + posX,
                        this.position.y + posY,
                        this.position.z + posZ
                    );   
                    mx.scale(this.geometryScale); 
                    this.mesh.setMatrixAt(index, mx);
                    //this.mesh.setColorAt(index, this.colorHex);
                    const shape = new CANNON.Box(new CANNON.Vec3(this.cubeSize/2, this.cubeSize/2, this.cubeSize));
                    this.shapes.push({shape, offset: new THREE.Vector3(posX, posY, posZ), active: false});
                    this.cubes.push({ index: index, isVertical: true, position: new THREE.Vector3(posX, posY, posZ), active: true });
                    index++;
                    this.activeCount++;
                }
                level++;
            }
        }

        const buildPyramidTop = (posY, offset) => {
            let level = 0;
            for (let z = this.resolution-1-(offset ? 1 : 0); z >= 0; z--) {
                for (let x = 0; x < ((this.resolution/2)-level)-(offset ? 1 : 0); x++) {
                    const posX = level * this.cubeSize + x * (this.cubeSize*2) - this.size / 2 + (this.cubeSize*2) / 2 + offset;
                    const posZ = z * this.cubeSize - this.size / 2 + this.cubeSize / 2 + offset;

                    const mx = matrix.makeRotationY(0);
                    mx.setPosition(
                        this.position.x + posX,
                        this.position.y + posY,
                        this.position.z + posZ
                    );   
                    mx.scale(this.geometryScale); 
                    this.mesh.setMatrixAt(index, mx);
                    //this.mesh.setColorAt(index, this.colorHex);
                    const shape = new CANNON.Box(new CANNON.Vec3(this.cubeSize, this.cubeSize/2, this.cubeSize/2));
                    this.shapes.push({shape, offset: new THREE.Vector3(posX, posY, posZ), active: false});
                    this.cubes.push({ index: index, isVertical: false, position: new THREE.Vector3(posX, posY, posZ), active: true });
                    index++;
                    this.activeCount++;
                }
                level++;
            }
        }

        for (let y = 0; y < this.height; y++) {
            const isOdd = y % 2 == 0;
            const posY = y * this.cubeSize - this.size / 2 + this.cubeSize / 2;
            buildPyramidBot(posY, isOdd ? this.cubeSize : 0);
            buildPyramidTop(posY, isOdd ? this.cubeSize : 0);
            buildPyramidRight(posY, !isOdd ? this.cubeSize : 0);
            buildPyramidLeft(posY, !isOdd ? this.cubeSize : 0);
        }
        this.indexBlocks();
    }

    indexBlocks() {
        this.boxIndexes = new Array(this.height*this.resolution**2).fill(null);
        for (let y = 0; y < this.height; y++) {
            for (let z = 0; z < this.resolution; z++) {
                for (let x = 0; x < this.resolution; x++) {
                    const posX = x * this.cubeSize - this.size / 2 + this.cubeSize / 2;
                    const posY = y * this.cubeSize - this.size / 2 + this.cubeSize / 2;
                    const posZ = z * this.cubeSize - this.size / 2 + this.cubeSize / 2;

                    const point = new THREE.Vector3(
                        posX,
                        posY,
                        posZ
                    );
                    
                    for (let i = y*this.resolution**2/2; i < (y+1)*this.resolution**2/2; i++) {
                        const {position, isVertical} = this.cubes[i];
                        const geometry = isVertical ? this.verticalGeometry : this.geometry;
                        if (this.isPointInsideBox(point, geometry, position)) {
                            const index = y * this.resolution * this.resolution + z * this.resolution + x;
                            this.boxIndexes[index] = i;
                        }
                    }
                    
                }
            }
        }
    }

    addBodyShapes(shapes) {
        shapes.forEach(({shape, offset, orientation}) => {
            const shapeOffset = new CANNON.Vec3();
            const shapeOrientation = new CANNON.Quaternion();
         
            if(offset){
                shapeOffset.copy(offset);
            }
            if(orientation){
                shapeOrientation.copy(orientation);
            }
         
            this.body.shapes.push(shape);
            this.body.shapeOffsets.push(shapeOffset);
            this.body.shapeOrientations.push(shapeOrientation);
        })
        this.body.updateMassProperties();
        this.body.updateBoundingRadius();
        this.body.aabbNeedsUpdate = true;
    }

    removeBodyShapes(shapes) {
        shapes.forEach(({shape}) => {
            const i = this.body.shapes.indexOf(shape);
            this.body.shapes.splice(i, 1);
            this.body.shapeOffsets.splice(i, 1);
            this.body.shapeOrientations.splice(i, 1);
        })
        this.body.updateMassProperties();
        this.body.updateBoundingRadius();
        this.body.aabbNeedsUpdate = true;
    }

    updatePhysicalBody() {
        if (!this.isDirty) {
            this.removeBodyShapes([this.initialShape]);
            const shapesToAdd = this.shapes.filter((s, i) => this.cubes[i].active);
            this.addBodyShapes(shapesToAdd);
            shapesToAdd.forEach((s) => s.active = true);
            this.isDirty = true;
            return
        }
        const shapesToRemove = this.shapes.filter((s, i) => (!this.cubes[i].active && s.active));
        shapesToRemove.forEach(s => s.active = false);
        this.removeBodyShapes(shapesToRemove);
    }

    createPhysicsBody() {
        this.body = new CANNON.Body({ mass: 0 });
        this.body.position.copy(this.position);
        this.body.isCrate = true;
        this.body.model = this;
        this.initialShape = {shape: new CANNON.Box(new CANNON.Vec3(this.size/2, this.cubeSize*this.height/2, this.size/2))};
        this.addBodyShapes([this.initialShape]);
        this.world.addBody(this.body);
    }

    applyState({isDirty, inactiveCubes}) {
        const matrix = new THREE.Matrix4();
        this.isDirty = isDirty;
        if (!isDirty) return;
        inactiveCubes.forEach((index) => {
            const cube = this.cubes.find((cube) => cube.index === index);
            if (cube.active) {
                this.mesh.setMatrixAt(cube.index, matrix.set(0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0));
                this.mesh.instanceMatrix.addUpdateRange(cube.index*16, 16);
                cube.active = false;
                this.activeCount--;
            }
        })
        this.mesh.instanceMatrix.needsUpdate = true;
        this.updatePhysicalBody();
        if (!this.activeCount) {
            this.remove();
        }
    }

    destroyCubesInRadius(hitPoint, radius) {
        const matrix = new THREE.Matrix4();
        let lastCurePosition = null;
        let count = 0;
        this.cubes.forEach(cube => {
            if (cube.active) {
                const distance = cube.position.distanceTo(hitPoint);
                if (distance <= radius) {
                    this.mesh.setMatrixAt(cube.index, matrix.set(0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0));
                    this.mesh.instanceMatrix.addUpdateRange(cube.index*16, 16);
                    lastCurePosition = cube.position;
                    cube.active = false;
                    this.activeCount--;
                    count++;
                }
            }
        });
        
        const floatingCubesIndexSet = this.findFloatingCubes();
        if (floatingCubesIndexSet.size) {
            this.clearFloatingCubes(floatingCubesIndexSet);
        }
        this.mesh.instanceMatrix.needsUpdate = true;
        this.updatePhysicalBody();
        if (!this.activeCount) {
            this.remove();
        }
        return new THREE.Vector4(
            lastCurePosition ? this.position.x + lastCurePosition.x :  this.position.x,
            lastCurePosition ? this.position.y + lastCurePosition.y : this.position.y,
            lastCurePosition ? this.position.z + lastCurePosition.z : this.position.z ,
            count
        )
    }

    clearFloatingCubes(floatingCubesIndexSet) {
        const matrix = new THREE.Matrix4();
        const rectangles = this.cubes.filter((c, i) => c.active && floatingCubesIndexSet.has(i)).map(cube => {
            this.mesh.setMatrixAt(cube.index, matrix.set(0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0));
            this.mesh.instanceMatrix.addUpdateRange(cube.index*16, 16);
            cube.active = false;
            this.activeCount--;
            return cube;
        });
        if (!this.activeCount) {
            this.remove();
        }
        if (!this.game.headless) this.createFallingCrateDerbisEffect(rectangles)
    }

    findFloatingCubes() {
        const visited = new Set();
        const floating = new Set(this.boxIndexes.map((i, index) => [i, index])
            .filter(([i]) => this.cubes[i].active).map(([_, index]) => index));
        // Функція для рекурсивного "затоплення"
        const flood = (x, y, z) => {
            const index = this.getIndex(x, y, z);
            if (index === -1 || !floating.has(index)) return;

            floating.delete(index);
            visited.add(index);

            // Перевіряємо сусідні кубики
            [
                [x+1, y, z], [x-1, y, z],
                [x, y+1, z], [x, y-1, z],
                [x, y, z+1], [x, y, z-1]
            ].forEach(([nx, ny, nz]) => {
                if (!visited.has(this.getIndex(nx, ny, nz))) {
                    flood(nx, ny, nz);
                }
            });
        };

        // Починаємо "затоплення" з нижнього рівня
        for (let z = 0; z < this.resolution; z++) {
            for (let x = 0; x < this.resolution; x++) {
                flood(x, 0, z);
            }
        }

        return new Set(Array.from(floating).map(i => this.boxIndexes[i]));
    }

    getIndex(x, y, z) {
        if (x < 0 || x >= this.resolution || y < 0 || y >= this.height || z < 0 || z >= this.resolution) {
            return -1;
        }
        return y * this.resolution * this.resolution + z * this.resolution + x;
    }

    isPointInsideBox(point, boxGeometry, boxPosition) {
        // Отримуємо розміри BoxGeometry
        const size = new THREE.Vector3();
        boxGeometry.computeBoundingBox();
        boxGeometry.boundingBox.getSize(size);
        
        // Створюємо матрицю трансформації для BoxGeometry
        const matrix = new THREE.Matrix4();
        matrix.compose(boxPosition, this.boxQuaternion, this.scaleVec);
        
        // Обчислюємо обернену матрицю
        const inverseMatrix = new THREE.Matrix4();
        inverseMatrix.copy(matrix).invert();
        
        // Перетворюємо точку в локальні координати BoxGeometry
        const localPoint = point.clone().applyMatrix4(inverseMatrix);
        
        // Перевіряємо, чи знаходиться точка всередині BoxGeometry
        return (
            Math.abs(localPoint.x) <= size.x / 2 &&
            Math.abs(localPoint.y) <= size.y / 2 &&
            Math.abs(localPoint.z) <= size.z / 2
        );
    }

    createFallingCrateDerbisEffect(rectangles) {
        const fallingDerbisEffect = new FallingCrateDerbisEffect(this.scene, this, this.world, rectangles);
        this.game.addDestroyedEffect(fallingDerbisEffect);
    }

    remove() {
        this.game.battleMap.removeCrate(this);
        this.world.removeBody(this.body);
    }

    update() {

    }
}