// ai_player.js
import * as THREE from 'three';
import * as CANNON from 'cannon';
import { BinaryHeap } from './utils/binary_heap.js';

class Node {
    constructor(position, g = 0, h = 0) {
        this.position = position;
        this.g = g; // Вартість від початку до цього вузла
        this.h = h; // Евристична оцінка від цього вузла до цілі
        this.f = g + h; // Загальна оцінка
        this.parent = null;
    }

    // Метод для створення унікального ключа для позиції
    getPositionKey() {
        return `${this.position.x},${this.position.y}`;
    }
}


export default class AIPlayer {
    constructor(game, tank) {
        this.game = game;
        this.tank = tank;
        this.target = null;
        this.state = 'search'; // 'search', 'attack', 'idle'
        this.lastFireTime = 0;
        this.lastIndirectFireTime = 0;
        this.fireCooldown = 2; // секунди між прямими пострілами
        this.indirectFireCooldown = 10; // секунди між непрямими пострілами
        this.directFireAccuracy = 0.4;
        this.indirectFireAccuracy = 0.3;
        this.currentPath = [];
        this.currentTargetAngle = null;
        this.debugPath = null;
        this.nextPoint = null;
        this.obstacleGrid = this.createObstacleGrid();
        this.lastPathfindingPosition = null;
        this.pathfindingThreshold = 1;
        this.lastNoPathDeadline = null;
        this.noPathCooldown = 1;
        this.isShooting = false;
        this.tank.deceleration = 3000; // units per second^2
        this.tank.turnDeceleration = 60;
        this.tank.acceleration = 60;
        // this.createDebugGrid();
    }

    createDebugGrid() {
        if (this.game.headless) return;
        if (this.debugGrid) {
            this.game.scene.remove(this.debugGrid);
        }
        if (this.obstacleMarkers) {
            this.obstacleMarkers.forEach(marker => this.game.scene.remove(marker));
        }
    
        const gridSize = 1; // Розмір клітинки сітки
        const mapSize = this.game.battleMap.size;
        const geometry = new THREE.BufferGeometry();
        const material = new THREE.LineBasicMaterial({ color: 0xFFFFFF, transparent: true, opacity: 0.3 });
    
        const points = [];
        for (let x = -mapSize / 2; x <= mapSize / 2; x += gridSize) {
            points.push(new THREE.Vector3(x, 0.1, -mapSize / 2));
            points.push(new THREE.Vector3(x, 0.1, mapSize / 2));
        }
        for (let z = -mapSize / 2; z <= mapSize / 2; z += gridSize) {
            points.push(new THREE.Vector3(-mapSize / 2, 0.1, z));
            points.push(new THREE.Vector3(mapSize / 2, 0.1, z));
        }
    
        geometry.setFromPoints(points);
        this.debugGrid = new THREE.LineSegments(geometry, material);
        this.game.scene.add(this.debugGrid);
    
        // Додаємо відображення перешкод
        this.obstacleMarkers = [];
        const obstacleMaterial = new THREE.MeshBasicMaterial({ color: 0xFF0000, transparent: true, opacity: 0.5 });
    
        for (let x = 0; x < this.obstacleGrid.length; x++) {
            for (let z = 0; z < this.obstacleGrid[0].length; z++) {
                if (this.obstacleGrid[x][z]) {
                    const obstacleGeometry = new THREE.PlaneGeometry(gridSize, gridSize);
                    const obstacleMesh = new THREE.Mesh(obstacleGeometry, obstacleMaterial);
                    obstacleMesh.rotation.x = -Math.PI / 2; // Повертаємо, щоб площина була горизонтальною
                    obstacleMesh.position.set(
                        x * gridSize - mapSize / 2 + gridSize / 2,
                        0.11, // Трохи вище сітки
                        z * gridSize - mapSize / 2 + gridSize / 2
                    );
                    this.game.scene.add(obstacleMesh);
                    this.obstacleMarkers.push(obstacleMesh);
                }
            }
        }
    }

    update(deltaTime) {
        if (this.tank.isDestroyed) {
            this.state = 'idle';
            this.isShooting = false;
            return;
        }

        this.updateState();
        
        switch (this.state) {
            case 'search':
                this.search(deltaTime);
                // if (this.currentPath) {
                //     this.visualizePath(this.currentPath);
                // }
                break;
            case 'siege':
                this.siege(deltaTime);
                // if (this.currentPath) {
                //     this.visualizePath(this.currentPath);
                // }
                break;
            case 'attack':
                this.attack(deltaTime);
                break;
            case 'idle':
                // Нічого не робимо в режимі очікування
                break;
        }
    }

    updateState() {
        const opponents = this.game.tanks.filter(tank => tank !== this.tank && !tank.isDestroyed);
        
        if (opponents.length === 0) {
            this.state = 'idle';
            return;
        }
        const newTarget = this.findNearestOpponent(opponents);
        
        // Перевіряємо, чи змінилася ціль
        if (newTarget !== this.target) {
            this.target = newTarget;
            this.recalculatePath();
            this.isShooting = false;
        } else if (this.target) {
            // Перевіряємо, чи ціль перемістилася достатньо далеко
            this.checkTargetMovement();
        }
        if (this.isShooting) return;
        const distanceToTarget = this.distanceToTarget();
    
        if (distanceToTarget <= 30 && this.hasLineOfSight()) {
            this.state = 'attack';
        } else {
            const currentTime = this.game.clock.getElapsedTime();
            // todo: more smart siege switch mode decision making
            if (currentTime - this.lastIndirectFireTime < this.indirectFireCooldown) {
                this.state = 'search';
            } else {
                this.state = 'siege';
            }
            
        }
    }

    recalculatePath() {
        const tankPosition = new THREE.Vector2(this.tank.mesh.position.x, this.tank.mesh.position.z);
        const targetPosition = new THREE.Vector2(this.target.mesh.position.x, this.target.mesh.position.z);
        
        this.currentPath = this.findPath(tankPosition, targetPosition);
        this.lastPathfindingPosition = targetPosition.clone();
        // if (this.currentPath) {
        //     this.visualizePath(this.currentPath);
        // }
    }

    checkTargetMovement() {
        if (!this.lastPathfindingPosition) {
            this.recalculatePath();
            return;
        }
    
        const currentTargetPosition = new THREE.Vector2(this.target.mesh.position.x, this.target.mesh.position.z);
        const distance = this.lastPathfindingPosition.distanceTo(currentTargetPosition);
    
        if (distance >= this.pathfindingThreshold) {
            this.recalculatePath();
        }
    }

    hasLineOfSight() {
        const from = this.tank.body.position;
        const to = this.target.body.position;
    
        // Створюємо вектор напрямку
        const direction = to.vsub(from);
        const distance = direction.length();
        direction.normalize();
    
        // Створюємо RaycastResult для зберігання результату
        const result = new CANNON.RaycastResult();
    
        // Створюємо Ray
        const ray = new CANNON.Ray(from, to);
        // Масив тіл для перевірки (всі ящики на карті)
        const bodies = this.game.battleMap.crates.map(crate => crate.body);
    
        // Виконуємо перевірку перетину
        ray.intersectBodies(bodies, result);
        //this.visualizeRay(from, to, !result.hasHit || result.distance > distance);
        // Якщо відстань до перешкоди менша, ніж відстань до цілі, то лінії прямої видимості немає
        return !result.hasHit || result.distance > distance;
    }

    visualizeRay(from, to, hasLineOfSight) {
        // Видаляємо попередню лінію, якщо вона існує
        if (this.debugLine) {
            this.game.scene.remove(this.debugLine);
        }

        const material = new THREE.LineBasicMaterial({
            color: hasLineOfSight ? 0x00ff00 : 0xff0000
        });
    
        const points = [];
        points.push(new THREE.Vector3(from.x, from.y, from.z));
        points.push(new THREE.Vector3(to.x, to.y, to.z));
    
        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        this.debugLine = new THREE.Line(geometry, material);
        this.game.scene.add(this.debugLine);
    }
    
    search(deltaTime) {
        this.moveTowardsTarget();
    }

    siege(deltaTime) {
        this.stopTank();
        this.tryIndirectFire(deltaTime);
    }

    attack(deltaTime) {
        this.stopTank();
        //this.moveTowardsTarget();
        this.tryDirectFire(deltaTime);
    }

    stopTank() {
        this.tank.move(0);
        this.tank.rotate(0);
    }

    updatePathVisualization() {
        if (this.currentPath && this.currentPath.length > 0) {
            const remainingPath = this.currentPath.slice();
            remainingPath.unshift(new THREE.Vector2(
                Math.floor((this.tank.mesh.position.x + this.game.battleMap.size / 2) / 2),
                Math.floor((this.tank.mesh.position.z + this.game.battleMap.size / 2) / 2)
            ));
            this.visualizePath(remainingPath);
        }
    }

    findPath(start, end) {
        const gridSize = 1;
        const openSet = new BinaryHeap(node => node.f);
        const closedSet = new Set();
        const startNode = new Node(new THREE.Vector2(Math.round(start.x / gridSize) * gridSize, Math.round(start.y / gridSize) * gridSize));
        const endNode = new Node(this.findNearestFreeNode(new THREE.Vector2(Math.round(end.x / gridSize) * gridSize, Math.round(end.y / gridSize) * gridSize)));

        startNode.g = 0;
        startNode.h = this.manhattanDistance(startNode.position, endNode.position);
        startNode.f = startNode.h;
    
        openSet.push(startNode);
    
        let iterations = 0;
        const maxIterations = 1000; // Максимальна кількість ітерацій
        const maxSearchRadius = Infinity; // this.game.battleMap.size; // Максимальний радіус пошуку
    
        while (!openSet.isEmpty() && iterations < maxIterations) {
            iterations++;
    
            const currentNode = openSet.pop();

            // Перевірка, чи досягнуто цільового вузла
            if (currentNode.position.distanceTo(endNode.position) < gridSize) {
                let path = [];
                let current = currentNode;
                while (current != null) {
                    path.unshift(current.position);
                    current = current.parent;
                }
                return path;
            }
    
            closedSet.add(currentNode.getPositionKey());
    
            // Перевірка, чи не виходимо за межі максимального радіусу пошуку
            if (currentNode.position.distanceTo(startNode.position) > maxSearchRadius) {
                return null;
            }
    
            const neighbors = this.getNeighbors(currentNode, gridSize);
    
            for (let neighbor of neighbors) {
                if (closedSet.has(neighbor.getPositionKey())) continue;
    
                const tentativeGScore = currentNode.g + currentNode.position.distanceTo(neighbor.position);
    
                if (!openSet.content.some(node => node.position.equals(neighbor.position)) || tentativeGScore < neighbor.g) {
                    neighbor.parent = currentNode;
                    neighbor.g = tentativeGScore;
                    neighbor.h = this.manhattanDistance(neighbor.position, endNode.position);
                    neighbor.f = neighbor.g + neighbor.h;
    
                    if (!openSet.content.some(node => node.position.equals(neighbor.position))) {
                        openSet.push(neighbor);
                    }
                }
            }
        }
    
        // Якщо досягнуто ліміту ітерацій, повертаємо null або частковий шлях
        if (iterations >= maxIterations) {
            console.log("Досягнуто максимальної кількості ітерацій при пошуку шляху");
            return null;
        }
    
        // Шлях не знайдено
        return null;
    }
    
    manhattanDistance(a, b) {
        return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
    }


    getNeighbors(node, gridSize) {
        const neighbors = [];
        const directions = [
            new THREE.Vector2(1, 0), new THREE.Vector2(-1, 0),
            new THREE.Vector2(0, 1), new THREE.Vector2(0, -1),
            new THREE.Vector2(1, 1), new THREE.Vector2(1, -1),
            new THREE.Vector2(-1, 1), new THREE.Vector2(-1, -1)
        ];

        for (let dir of directions) {
            const neighborPos = new THREE.Vector2(
                node.position.x + dir.x * gridSize,
                node.position.y + dir.y * gridSize
            );

            if (this.isWalkable(neighborPos)) {
                neighbors.push(new Node(neighborPos));
            }
        }

        return neighbors;
    }

    isWalkable(position) {
        const gridSize = 1;
        const mapSize = this.game.battleMap.size;
        const x = Math.floor((position.x + mapSize / 2) / gridSize);
        const y = Math.floor((position.y + mapSize / 2) / gridSize);
    
        if (x < 0 || x >= this.obstacleGrid.length || y < 0 || y >= this.obstacleGrid[0].length) {
            return false;
        }
    
        return !this.obstacleGrid[x][y];
    }

    createObstacleGrid() {
        const gridSize = 1;
        const mapSize = this.game.battleMap.size;
        const gridDimension = Math.ceil(mapSize / gridSize);
        const grid = new Array(gridDimension).fill(null).map(() => new Array(gridDimension).fill(false));
    
        this.game.battleMap.crates.forEach(crate => {
            const minX = Math.floor((crate.position.x - (crate.size*1.3) / 2 + mapSize / 2) / gridSize);
            const maxX = Math.ceil((crate.position.x + (crate.size*1.3) / 2 + mapSize / 2) / gridSize);
            const minY = Math.floor((crate.position.z - (crate.size*1.3) / 2 + mapSize / 2) / gridSize);
            const maxY = Math.ceil((crate.position.z + (crate.size*1.3) / 2 + mapSize / 2) / gridSize);
            for (let x = minX; x < maxX; x++) {
                for (let y = minY; y < maxY; y++) {
                    if (x >= 0 && x < gridDimension && y >= 0 && y < gridDimension) {
                        grid[x][y] = true;
                    }
                }
            }
        });
        
        return grid;
    }

    moveTowardsTarget() {
        if (!this.target) return;
        if (!this.ensureDirectMode()) return;
        const tankPosition = new THREE.Vector2(this.tank.mesh.position.x, this.tank.mesh.position.z);
        
        // Якщо шлях ще не знайдено або ми досягли кінця поточного шляху, знаходимо новий шлях
        if (!this.currentPath || this.currentPath.length === 0) {
            const currentTime = this.game.clock.getElapsedTime();
            if (currentTime - this.lastNoPathDeadline < this.noPathCooldown) return;
            this.recalculatePath();
            this.lastNoPathDeadline = currentTime;
            if (!this.currentPath) {
                console.log("Не вдалося знайти шлях до цілі");
                return;
            }
        }
        // Отримуємо наступну точку шляху
        let nextPoint = this.currentPath[0];
        const distanceToNextPoint = tankPosition.distanceTo(nextPoint);
    
        // Якщо ми досягли поточної точки, переходимо до наступної
        if (distanceToNextPoint < 1) {
            this.currentPath.shift();
            if (this.currentPath.length > 0) {
                nextPoint = this.currentPath[0];
            } else {
                // Шлях закінчився, зупиняємося
                this.tank.move(0);
                return;
            }
        }

        if (!this.currentTargetAngle) {
            this.currentTargetAngle = getYRotationAngle(this.tank.mesh.position, new THREE.Vector3(nextPoint.x, 0, nextPoint.y));
        }

        // Повертаємо танк до цілі
        const angleDiff = getDeltaAngle(this.tank.mesh.rotation.y, this.currentTargetAngle);
        if (Math.abs(angleDiff) > 0.05) {
            this.tank.rotate(-Math.sign(angleDiff));
            this.tank.move(0);
        } else {
            this.tank.rotate(0);
            this.currentTargetAngle = null;
            
            // Якщо танк спрямований правильно, рухаємося вперед
            this.tank.move(1);
        }
        this.nextPoint = nextPoint;
    }
    

    visualizePath(path) {
        if (this.pathLine) {
            this.game.scene.remove(this.pathLine);
        }
    
        const geometry = new THREE.BufferGeometry().setFromPoints(
            path.map(p => new THREE.Vector3(p.x, 0.2, p.y))
        );
        const material = new THREE.LineBasicMaterial({ color: 0x00FF00 });
        this.pathLine = new THREE.Line(geometry, material);
        this.game.scene.add(this.pathLine);
    }

    onDebug(callback) {
        this.callback = callback;
    }


    aimAtTarget(deltaTime) {
        if (!this.target) return false;
        if (this.tank.isTransitioning) return false;
        const toTarget = new THREE.Vector3().subVectors(this.target.mesh.position, this.tank.mesh.position);
        const targetAngle = Math.atan2(toTarget.x, toTarget.z);
        
        const tankBodyAngle = this.tank.mesh.rotation.y;
        
        // Обчислюємо необхідний кут повороту башти відносно корпусу танка
        
        const randomError = (Math.random() - 0.5) * 0.04; // Випадкова похибка ±2%
        let turretAngle = (targetAngle - tankBodyAngle - Math.PI)+randomError*4;
        // Нормалізуємо кут до діапазону [-PI, PI]
        while (turretAngle > Math.PI) turretAngle -= 2 * Math.PI;
        while (turretAngle < -Math.PI) turretAngle += 2 * Math.PI;
        // Встановлюємо цільовий кут повороту башти
        this.tank.targetTurretAngle = turretAngle;
        
    
        // Решта коду залишається без змін
        const distance = toTarget.length();
        let elevationAngle = Math.atan2(toTarget.y, Math.sqrt(toTarget.x * toTarget.x + toTarget.z * toTarget.z));
        
        elevationAngle = Math.max(this.tank.barrelMinAngle, Math.min(elevationAngle, this.tank.barrelMaxAngle));
        
        this.tank.setBarrelTargetAngle(elevationAngle);

        this.aimCalculatedShotVelocity = this.tank.calculateVelocity(this.target.mesh.position);
        
        if (this.tank.shotVelocity < this.aimCalculatedShotVelocity) {
            this.tank.accelerateShotVelocity();
        } else {
            this.tank.stopAccelarateShotVelocity();
        }
        elevationAngle += randomError;
        this.callback && this.callback(Math.abs(this.tank.turretRotation - turretAngle) < 0.05,
            Math.abs(this.tank.barrelAngle - elevationAngle) < 0.05, 
            this.tank.shotVelocity >= this.aimCalculatedShotVelocity, this.tank.turretRotation, turretAngle);
        // Перевіряємо, чи досягнуто потрібного кута прицілювання
        return Math.abs(this.tank.turretRotation - turretAngle) < 0.05 && 
            Math.abs(this.tank.barrelAngle - elevationAngle) < 0.05 &&
            this.tank.shotVelocity >= this.aimCalculatedShotVelocity;
    }

    ensureIndirectMode() {
        if (this.tank.isTransitioning) {
            return false;
        }
        if (!this.tank.isIndirectFireMode) {
            this.tank.startTransition(true); 
            return false};
        return true;
    }

    ensureDirectMode() {
        if (this.tank.isTransitioning) {
            return false;
        }
        if (this.tank.isIndirectFireMode) {
            this.tank.startTransition(false); 
            return false};
        return true;
    }

    tryDirectFire(deltaTime) {
        this.isShooting = true;
        const currentTime = this.game.clock.getElapsedTime();
        if (currentTime - this.lastFireTime < this.fireCooldown) return;
        if (!this.ensureDirectMode()) {
            return;
        }
        if (this.aimAtTarget(deltaTime)) {
            this.tank.shoot();
            this.isShooting = false;
            this.lastFireTime = currentTime;
        }
    }

    tryIndirectFire(deltaTime) {
        if (!this.ensureIndirectMode()) {
            return;
        }
        const currentTime = this.game.clock.getElapsedTime();
        this.isShooting = true;
        if (this.aimAtTarget(deltaTime)) {
            this.tank.shoot();
            this.isShooting = false;
            this.lastIndirectFireTime = currentTime;
        }
    }

    findNearestOpponent(opponents) {
        return opponents.reduce((nearest, current) => {
            const distToNearest = nearest.mesh.position.distanceTo(this.tank.mesh.position);
            const distToCurrent = current.mesh.position.distanceTo(this.tank.mesh.position);
            return distToCurrent < distToNearest ? current : nearest;
        });
    }

    distanceToTarget() {
        if (!this.target) return Infinity;
        return this.tank.mesh.position.distanceTo(this.target.mesh.position);
    }

    findNearestFreeNode(position) {
        const gridSize = 1;
        const mapSize = this.game.battleMap.size;
        const startX = Math.floor((position.x + mapSize / 2) / gridSize);
        const startY = Math.floor((position.y + mapSize / 2) / gridSize);
    
        let nearestFreeNode = null;
        let minDistance = Infinity;
    
        // Перевіряємо вузли в радіусі до 5 клітинок
        for (let dx = -5; dx <= 5; dx++) {
            for (let dy = -5; dy <= 5; dy++) {
                const x = startX + dx;
                const y = startY + dy;
    
                if (x >= 0 && x < this.obstacleGrid.length && y >= 0 && y < this.obstacleGrid[0].length) {
                    if (!this.obstacleGrid[x][y]) {
                        const nodePosition = new THREE.Vector2(
                            (x * gridSize + gridSize / 2) - mapSize / 2,
                            (y * gridSize + gridSize / 2) - mapSize / 2
                        );
                        const distance = nodePosition.distanceTo(position);
    
                        if (distance < minDistance) {
                            minDistance = distance;
                            nearestFreeNode = nodePosition;
                        }
                    }
                }
            }
        }
    
        return nearestFreeNode || position;
    }
}

function getYRotationAngle(from, to) {
    // Створюємо вектор напрямку
    const direction = new THREE.Vector3().subVectors(from, to);
    
    // Проектуємо на площину XZ
    const directionXZ = new THREE.Vector3(direction.x, 0, direction.z);
    
    // Обчислюємо кут за допомогою Math.atan2
    return Math.atan2(directionXZ.x, directionXZ.z);
  }

const getDeltaAngle = function () {

var TAU = 2 * Math.PI;
var mod = function ( a, n ) { return ( a % n + n ) % n; }

return function ( current, target ) {

var a = mod( ( current - target ), TAU );
var b = mod( ( target - current ), TAU );

    return a < b ? -a : b;

}

}();