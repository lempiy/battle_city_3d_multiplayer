// tank.js
import * as THREE from 'three';
import * as CANNON from 'cannon';
import Projectile from './projectile';
import './../utils/slerp';

export default class Tank {
    static objectId = 4;
    constructor(scene, world, game, color, position, rotation) {
        this.id = game.generateTankId();
        this.scene = scene;
        this.world = world;
        this.game = game;
        this.color = color;
        this.position = position;
        this.rotation = rotation;
        this.scale = 1.5;

        this.health = 100;
        this.maxHealth = 100;


        this.moveDirection = 0;
        this.rotateDirection = 0;
        this.turnSpeed = .75;
        this.currentSpeed = 0;
        this.currentTurnSpeed = 0;
        this.maxSpeed = 30;
        this.acceleration = 60; // units per second^2
        this.deceleration = 60; // units per second^2
        this.turnAcceleration = 2; // radians per second^2
        this.turnDeceleration = 3; // radians per second^2
        this.isDestroyed = false;

        this.barrelPivot = null;
        this.barrelAngle = 0;
        this.barrelRotationSpeed = 0.1; // radian

        this.maxRotationPerFrame = Math.PI / 30; // Максимальний кут обертання за кадр

        this.indirectBarrelMinAngle = Math.PI / 9; // 20 градусів
        this.indirectBarrelMaxAngle =  Math.PI / 4;
        this.indirectFireInitialAngle = this.indirectBarrelMaxAngle - this.indirectBarrelMinAngle / 2;
        
        this.directBarrelMinAngle = -Math.PI / 24;
        this.directBarrelMaxAngle = 0; 
        this.directFireInitialAngle = this.directBarrelMaxAngle;
        
        this.barrelMaxAngle = this.directBarrelMaxAngle; 
        this.barrelMinAngle = this.directBarrelMinAngle;

        this.turretRotation = 0;
        this.turretRotationSpeed = 0.1; // радіани

        
        this.minShotVelocityDirect = 10;
        this.maxShotVelocityDirect = 60;

        this.minShotVelocityIndirect = 5;
        this.maxShotVelocityIndirect = 25;

        this.shotVelocity = this.minShotVelocityDirect;
        this.minShotVelocity = this.minShotVelocityDirect;
        this.maxShotVelocity = this.maxShotVelocityDirect;

        this.targetTurretAngle = 0;
        this.targetBarrelAngle = 0;
        this.isIndirectFireMode = false;
        this.barrelTransitionSpeed = 70; // Швидкість переходу дула
        this.isChangingMode = false;

        this.scale = 1.5;
        this.isTransitioning = false;
        this.transitionProgress = 0;
        this.transitionDuration = 500; // 0.5 секунд у мілісекундах
        this.originalDimensions = new THREE.Vector3(1, 0.5, 2);
        this.squareDimensions = new THREE.Vector3(1.5, 0.5, 1.5);
        this.isAcceleratingShot = false;

        this.serverState = {
            position: new CANNON.Vec3(0,0,0),
            quaternion: new CANNON.Quaternion(0,0,0),
            velocity: new CANNON.Vec3(0,0,0),
            angularVelocity: new CANNON.Vec3(0,0,0),
            targetBarrelAngle: null,
            targetTurretAngle: null,
            shotVelocity: null,
            isIndirectFireMode: null,
            isTransitioning: null,
            isAcceleratingShot: null,
        };
        this.lastUpdateTime = null;
        this.serverUpdateDelta = 0;
        this.interpolationTime = 50;


        this.createMesh();
        this.createPhysicsBody();
    }

    getStateData() {
        return {
            shotVelocity: this.shotVelocity,
            isIndirectFireMode: this.isIndirectFireMode,
            isAcceleratingShot: this.isAcceleratingShot,
            isTransitioning: this.isTransitioning,
            targetBarrelAngle: this.targetBarrelAngle,
            targetTurretAngle: this.targetTurretAngle,
            position: this.body.position,
            quaternion: this.body.quaternion,
            velocity: this.body.velocity,
            angularVelocity: this.body.angularVelocity,
            isDestroyed: this.isDestroyed,
        }
    }

    // Новий метод для початку переходу
    startTransition(toIndirect) {
        if (toIndirect == this.isIndirectFireMode) return;
        if (this.isTransitioning) return;
        
        this.isTransitioning = true;
        this.transitionProgress = 0;
        this.isIndirectFireMode = toIndirect;
    }

    setIndirectFireMode(isIndirect) {
        this.isIndirectFireMode = isIndirect;
        this.isChangingMode = true;
        if (isIndirect) {
            this.shotVelocity = this.minShotVelocityIndirect;
            this.minShotVelocity = this.minShotVelocityIndirect;
            this.maxShotVelocity = this.maxShotVelocityIndirect;
            this.barrelMinAngle = this.indirectBarrelMinAngle;
            this.barrelMaxAngle =  this.indirectBarrelMaxAngle;
            this.targetBarrelAngle = this.indirectFireInitialAngle;
        } else {
            this.barrelMinAngle = this.directBarrelMinAngle;
            this.barrelMaxAngle = this.directBarrelMaxAngle;
            this.targetBarrelAngle = this.directFireInitialAngle;
            this.shotVelocity = this.minShotVelocityDirect;
            this.minShotVelocity = this.minShotVelocityDirect;
            this.maxShotVelocity = this.maxShotVelocityDirect;
        }
    }

    rotateTurretLeft(deltaTime) {
        this.turretRotation += this.turretRotationSpeed;
        this.updateTurretRotation(deltaTime);
    }
    
    rotateTurretRight(deltaTime) {
        this.turretRotation -= this.turretRotationSpeed;
        this.updateTurretRotation(deltaTime);
    }

    takeDamage(amount, dealer) {
        this.health = Math.max(0, this.health - amount);
        console.log(`Tank took ${amount} damage from ${dealer.id}. Current health: ${this.health}`);
    }

    updateServerState(state, timestamp) {
        this.serverState.position.copy(state.position);
        this.serverState.quaternion.copy(state.quaternion);
        this.serverState.velocity.copy(state.velocity);
        this.serverState.angularVelocity.copy(state.angularVelocity);
        this.serverState.targetBarrelAngle = state.targetBarrelAngle;
        this.serverState.targetTurretAngle = state.targetTurretAngle;
        this.serverState.shotVelocity = state.shotVelocity;
        this.serverState.isIndirectFireMode = state.isIndirectFireMode;
        this.serverState.isTransitioning = state.isTransitioning;
        this.serverState.isAcceleratingShot = state.isAcceleratingShot;
        this.serverState.isDestroyed = state.isDestroyed;
        this.lastUpdateTime = timestamp;
    }

    interpolate(currentTime) {       
        const delta = currentTime - this.lastUpdateTime;
        const alpha = Math.min(delta / this.interpolationTime, 1);
        
        if (!this.serverState.isDestroyed) {
            // Інтерполяція позиції
            this.body.position.lerp(this.serverState.position, alpha, this.body.position);
        
            // Інтерполяція обертання
            this.body.quaternion.slerp(this.serverState.quaternion, alpha);
        }
        this.body.velocity.copy(this.serverState.velocity)
        // Інтерполяція швидкості
        //this.body.velocity.lerp(this.serverState.velocity, alpha, this.body.velocity);
        this.body.angularVelocity.copy(this.serverState.angularVelocity)
        // Інтерполяція кутової швидкості
        //this.body.angularVelocity.lerp(this.serverState.angularVelocity, alpha, this.body.angularVelocity);
        this.targetBarrelAngle =  this.serverState.targetBarrelAngle;
        this.targetTurretAngle =  this.serverState.targetTurretAngle;
        if (this.serverState.isTransitioning != this.isTransitioning) {
            this.startTransition(this.serverState.isIndirectFireMode)
        }
        if (!this.isTransitioning && this.serverState.isIndirectFireMode != this.isIndirectFireMode) {
            this.setIndirectFireMode(this.serverState.isIndirectFireMode)
        }
        this.isDestroyed = this.serverState.isDestroyed;
        this.isAcceleratingShot = this.serverState.isAcceleratingShot
        this.shotVelocity = this.serverState.shotVelocity
    }

    extrapolate(currentTime) {   
        const delta = (currentTime - this.lastUpdateTime) / 1000; // перетворюємо в секунди
        // Екстраполяція позиції
        const extrapolatedPosition = new CANNON.Vec3();
        extrapolatedPosition.copy(this.serverState.position);
        extrapolatedPosition.vadd(this.serverState.velocity.scale(delta), extrapolatedPosition);
        this.body.position.copy(extrapolatedPosition);
    
        // Екстраполяція обертання
        const extrapolatedQuaternion = new CANNON.Quaternion();
        const angularVelocityLength = this.serverState.angularVelocity.length();
        if (angularVelocityLength > 0) {
            const axis = this.serverState.angularVelocity.unit();
            const angle = angularVelocityLength * delta;
            extrapolatedQuaternion.setFromAxisAngle(axis, angle);
            extrapolatedQuaternion.mult(this.serverState.quaternion, extrapolatedQuaternion);
        } else {
            extrapolatedQuaternion.copy(this.serverState.quaternion);
        }
        this.body.quaternion.copy(extrapolatedQuaternion);
    
        // Зберігаємо швидкості
        this.body.velocity.copy(this.serverState.velocity);
        this.body.angularVelocity.copy(this.serverState.angularVelocity);
        this.targetBarrelAngle =  this.serverState.targetBarrelAngle;
        this.targetTurretAngle =  this.serverState.targetTurretAngle;
        this.targetBarrelAngle =  this.serverState.targetBarrelAngle;
        this.targetTurretAngle =  this.serverState.targetTurretAngle;
        if (this.serverState.isTransitioning != this.isTransitioning) {
            this.startTransition(this.serverState.isIndirectFireMode)
        }
        if (!this.isTransitioning && this.serverState.isIndirectFireMode != this.isIndirectFireMode) {
            this.setIndirectFireMode(this.serverState.isIndirectFireMode)
        }
        this.serverState.isAcceleratingShot = this.isAcceleratingShot
        this.serverState.shotVelocity = this.shotVelocity
    }

    updateTurretRotation(deltaTime) {
        let turretAngleDiff = this.targetTurretAngle - this.turretRotation;
        
        // Нормалізуємо різницю кутів
        if (turretAngleDiff > Math.PI) turretAngleDiff -= 2 * Math.PI;
        if (turretAngleDiff < -Math.PI) turretAngleDiff += 2 * Math.PI;
        
        // Обмежуємо максимальний кут обертання за кадр
        const maxRotation = this.maxRotationPerFrame * (deltaTime / 16.67);
        const rotation = Math.sign(turretAngleDiff) * Math.min(Math.abs(turretAngleDiff), maxRotation);
        
        this.turretRotation += rotation;
        while (this.turretRotation > Math.PI) this.turretRotation -= 2 * Math.PI;
        while (this.turretRotation < -Math.PI) this.turretRotation += 2 * Math.PI;
        // Нормалізуємо кут обертання башти
        this.turret.rotation.y = this.turretRotation;
    }

    updateBarrelRotation(deltaTime) {
        const barrelAngleDiff = this.targetBarrelAngle - this.barrelAngle
        // Плавно змінюємо кут дула
        this.barrelAngle += barrelAngleDiff * (this.barrelTransitionSpeed * (deltaTime / 16.67));
        // Обмежуємо кут дула
        this.barrelAngle = this.isChangingMode ? this.barrelAngle : Math.max(this.barrelMinAngle, Math.min(this.barrelAngle, this.barrelMaxAngle));
        this.barrelPivot.rotation.x = this.barrelAngle;
        if (this.isChangingMode && Math.floor(this.barrelAngle*100) === Math.floor((this.isIndirectFireMode ? 
            this.indirectFireInitialAngle : this.directFireInitialAngle)*100)) {
            this.isChangingMode = false;
        }
    }

    createMesh() {
        // Створюємо основне тіло танка
        const bodyGeometry = new THREE.BoxGeometry(1, 0.5, 2);
        const bodyMaterial = new THREE.MeshStandardMaterial({
            color: this.color,
            roughness: 0.1,
            metalness: 0.7
        });

        this.bodyMesh = new THREE.Mesh(bodyGeometry, bodyMaterial);
        this.bodyMesh.scale.multiplyScalar(this.scale);
        this.bodyMesh.castShadow = true;

        // Створюємо групу для всього танка
        this.mesh = new THREE.Group();
        this.mesh.add(this.bodyMesh);

        this.mesh.position.copy(this.position);
        this.mesh.rotation.y = this.rotation;
        this.mesh.rotation.order = "YXZ";
        

        // Створюємо башту танка
        const turretGeometry = new THREE.CylinderGeometry(0.4 * this.scale, 0.4 * this.scale, 0.3 * this.scale, 16);
        const turretMaterial = new THREE.MeshStandardMaterial({
            color: this.color,
            roughness: 0.1,
            metalness: 0.7
        });
        this.turret = new THREE.Mesh(turretGeometry, turretMaterial);
        this.turret.position.set(0, 0.4 * this.scale, 0); // Підняли башту трохи вище
        this.turret.castShadow = true;
        this.mesh.add(this.turret);

        // Створюємо дуло танка
        const barrelGeometry = new THREE.CylinderGeometry(0.1 * this.scale, 0.1 * this.scale, 1.5 * this.scale, 8);
        const barrelMaterial = new THREE.MeshStandardMaterial({
            color: 0x666666,
            roughness: 0.1,
            metalness: 0.7
        });
        const barrel = new THREE.Mesh(barrelGeometry, barrelMaterial);
        barrel.castShadow = true;
        
        // Створюємо порожній об'єкт, який буде використовуватися як точка обертання
        this.barrelPivot = new THREE.Object3D();
        this.barrelPivot.position.set(0, 0.15 * this.scale, 0);
        
        // Розташовуємо дуло відносно точки обертання
        barrel.position.set(0, 0, -0.75 * this.scale);
        barrel.rotation.x = -Math.PI / 2; // Повертаємо дуло горизонтально
        
        // Додаємо дуло до точки обертання
        this.barrelPivot.add(barrel);
        
        // Додаємо точку обертання з дулом до башти
        this.turret.add(this.barrelPivot);

        // Додаємо весь танк до сцени
        this.scene.add(this.mesh);
    }

    createPhysicsBody() {
        const shape = new CANNON.Box(new CANNON.Vec3(
            this.originalDimensions.x * this.scale / 2,
            this.originalDimensions.y * this.scale / 2,
            this.originalDimensions.z * this.scale / 2
        ));
        this.body = new CANNON.Body({ 
            mass: 1000 * this.scale, // Збільшуємо масу пропорційно до розміру
            material: new CANNON.Material({ friction: 1.5, restitution: 0.3 }),
            collisionFilterGroup: 1,
            collisionFilterMask: 1 | 2,
        });
        this.body.addShape(shape);
        this.body.position.copy(this.position);
        this.body.quaternion.setFromEuler(0, this.rotation, 0);
        this.body.linearDamping = 0.5;
        this.body.angularDamping = 0.9;

        this.body.fixedRotation = true;
        this.body.updateMassProperties();

        this.world.addBody(this.body);
    }

    setOriginalBodyState() {
        this.bodyMesh.scale.set(
            this.scale,
            this.scale,
            this.scale
        );

        const halfExtents = new CANNON.Vec3(
            this.originalDimensions.x * this.scale / 2,
            this.originalDimensions.y * this.scale / 2,
            this.originalDimensions.z * this.scale / 2
        );
        
        this.body.shapes[0].halfExtents = halfExtents;
        this.body.shapes[0].updateConvexPolyhedronRepresentation();
        this.body.updateBoundingRadius();
    }

    setSquareBodyState() {
        this.bodyMesh.scale.set(
            this.scale,
            this.scale,
            this.scale
        );

        const halfExtents = new CANNON.Vec3(
            this.squareDimensions.x * this.scale / 2,
            this.squareDimensions.y * this.scale / 2,
            this.squareDimensions.z * this.scale / 2
        );
        
        this.body.shapes[0].halfExtents = halfExtents;
        this.body.shapes[0].updateConvexPolyhedronRepresentation();
        this.body.updateBoundingRadius();
    }

    updateTransition(deltaTime) {
        this.transitionProgress += deltaTime * 1000;
        const t = Math.min(this.transitionProgress / this.transitionDuration, 1);
        
        // Інтерполяція між оригінальними та квадратними розмірами
        const currentDimensions = new THREE.Vector3();
        currentDimensions.lerpVectors(
            this.originalDimensions,
            this.squareDimensions,
            this.isIndirectFireMode ? t : 1 - t
        );
        
        // Оновлення лише основи танка (bodyMesh)
        this.bodyMesh.scale.set(
            currentDimensions.x / this.originalDimensions.x * this.scale,
            this.scale,
            currentDimensions.z / this.originalDimensions.z * this.scale
        );
        
        // Оновлення позиції башти, щоб вона залишалася на верху основи
        this.turret.position.y = this.bodyMesh.scale.y / 2;
        
        // Оновлення фізичного тіла
        const halfExtents = new CANNON.Vec3(
            currentDimensions.x * this.scale / 2,
            this.originalDimensions.y * this.scale / 2,
            currentDimensions.z * this.scale / 2
        );
        
        this.body.shapes[0].halfExtents = halfExtents;
        this.body.shapes[0].updateConvexPolyhedronRepresentation();
        this.body.updateBoundingRadius();
        
        if (t === 1) {
            this.setIndirectFireMode(this.isIndirectFireMode);
            this.isTransitioning = false;
        }
    }

    heal(amount) {
        this.health = Math.min(this.health + amount, this.maxHealth);
        console.log(`Tank healed for ${amount}. Current health: ${this.health}`);
    }

    update(deltaTime) {
        if (this.isTransitioning) {
            this.updateTransition(deltaTime);
        }

        if (this.isAcceleratingShot) {
            const step = (this.maxShotVelocity-this.minShotVelocity)/2*deltaTime;
            this.shotVelocity = Math.min(this.shotVelocity+step, this.maxShotVelocity);
        }

        const currentTime = Date.now();
        if (this.lastUpdateTime) {
            if (currentTime < this.lastUpdateTime + this.interpolationTime) {
                this.interpolate(currentTime);
            } else {
                this.interpolate(currentTime);
            }
        }


        this.mesh.position.copy(this.body.position);
        this.mesh.quaternion.copy(this.body.quaternion);
        
        //this.mesh.rotation.setFromQuaternion(this.mesh.quaternion);
        // Плавне прискорення/сповільнення
        // if (Math.abs(this.currentSpeed) > 0.01) {
        //     this.currentSpeed *= 0.95;
        // } else {
        //     this.currentSpeed = 0;
        // }

        // if (Math.abs(this.currentTurnSpeed) > 0.01) {
        //     this.currentTurnSpeed *= 0.95;
        // } else {
        //     this.currentTurnSpeed = 0;
        // }

        // Плавно повертаємо башту до цільового кута
        let turretAngleDiff = this.targetTurretAngle - this.turretRotation;
        
        // Забезпечуємо, щоб різниця кутів була в межах [-PI, PI]
        if (turretAngleDiff > Math.PI) turretAngleDiff -= 2 * Math.PI;
        if (turretAngleDiff < -Math.PI) turretAngleDiff += 2 * Math.PI;
        
        this.turretRotation += turretAngleDiff * 0.1; // Можна налаштувати швидкість повороту

        // Нормалізуємо кут обертання башти
        this.turretRotation = (this.turretRotation + Math.PI) % (2 * Math.PI) - Math.PI;

        // Плавно нахиляємо дуло до цільового кута
        // const barrelAngleDiff = this.targetBarrelAngle - this.barrelAngle;
        // this.barrelAngle += barrelAngleDiff * 0.1; // Можна налаштувати швидкість нахилу
        this.setMoveSpeed(deltaTime);
        this.setRotateSpeed(deltaTime);
        
        this.applyMovement(deltaTime);
        this.updateTurretRotation(deltaTime);
        this.updateBarrelRotation(deltaTime);
    }

    applyMovement(deltaTime) {
        if (this.isTransitioning || this.isIndirectFireMode) return;
        const forward = new CANNON.Vec3(0, 0, -1);
        const result = new CANNON.Vec3(0, 0, 0);
        this.body.vectorToWorldFrame(forward, result);
        result.y = 0;
        result.normalize();
        const velocity = result.scale(this.currentSpeed);
        velocity.y = this.body.velocity.y;
        this.body.velocity.copy(velocity);
    
        this.body.angularVelocity.set(0, -this.currentTurnSpeed, 0);
    }

    applyState(state) {
        this.body.position.copy(state.position);
        this.body.quaternion.copy(state.quaternion);
        this.body.angularVelocity.copy(state.angularVelocity);
        this.body.velocity.copy(state.velocity);

        this.turretRotation = state.turretRotation;
        this.turret.rotation.y = state.turretRotation;
        this.targetTurretAngle = state.turretRotation;

        this.barrelAngle = state.barrelAngle;
        this.barrelPivot.rotation.x = state.barrelAngle;
        this.targetBarrelAngle = state.barrelAngle;

        this.isIndirectFireMode = state.isIndirectFireMode;
        if (!state.isIndirectFireMode) {
            this.setOriginalBodyState();
        } else {
            this.setSquareBodyState();
        }
        this.isAcceleratingShot = state.isAcceleratingShot;
        this.shotVelocity = state.shotVelocity;
        this.isDestroyed = state.isDestroyed;
        this.health = state.hp;
        this.mesh.visible = state.visible;
    }

    move(direction) {
        if (this.isIndirectFireMode) return;
        this.moveDirection = direction;
    }

    setMoveSpeed(deltaTime) {
        const targetSpeed = Math.sign(this.moveDirection) * this.maxSpeed;
        if (Math.sign(this.moveDirection) !== 0) {
            const accelerationThisFrame = this.acceleration * deltaTime;
            this.currentSpeed = Math.sign(targetSpeed - this.currentSpeed) * 
                Math.min(Math.abs(targetSpeed - this.currentSpeed), accelerationThisFrame) + 
                this.currentSpeed;
        } else {
            const decelerationThisFrame = this.deceleration * deltaTime;
            if (Math.abs(this.currentSpeed) <= decelerationThisFrame) {
                this.currentSpeed = 0;
            } else {
                this.currentSpeed -= Math.sign(this.currentSpeed) * decelerationThisFrame;
            }
        }
    }

    rotate(direction) {
        if (this.isIndirectFireMode) return;
        this.rotateDirection = direction;
    }

    setRotateSpeed(deltaTime) {
        const targetTurnSpeed = Math.sign(this.rotateDirection) * this.turnSpeed;
        if (Math.sign(this.rotateDirection) !== 0) {
            const accelerationThisFrame = this.turnAcceleration * deltaTime;
            this.currentTurnSpeed = Math.sign(targetTurnSpeed - this.currentTurnSpeed) * 
                Math.min(Math.abs(targetTurnSpeed - this.currentTurnSpeed), accelerationThisFrame) + 
                this.currentTurnSpeed;
        } else {
            const decelerationThisFrame = this.turnDeceleration * deltaTime;
            if (Math.abs(this.currentTurnSpeed) <= decelerationThisFrame) {
                this.currentTurnSpeed = 0;
            } else {
                this.currentTurnSpeed -= Math.sign(this.currentTurnSpeed) * decelerationThisFrame;
            }
        }
    }

    accelerateShotVelocity() {
        if (this.isDestroyed) return;
        this.isAcceleratingShot = true;
    }

    stopAccelarateShotVelocity() {
        if (this.isDestroyed) return;
        this.isAcceleratingShot = false;
    }

    setTargetTurretAngle(inputPosition) {
        const tankWorldPosition = new THREE.Vector3();
        this.mesh.getWorldPosition(tankWorldPosition);
        
        // Отримуємо кватерніон обертання танка
        const tankQuaternion = this.mesh.quaternion;
    
        // Створюємо вектор від танка до позиції миші
        const toMouse = new THREE.Vector3().subVectors(inputPosition, tankWorldPosition);
        toMouse.y = 0;
    
        // Створюємо вектор "вперед" для танка
        const tankForward = new THREE.Vector3(0, 0, -1).applyQuaternion(tankQuaternion);
        tankForward.y = 0;
        tankForward.normalize();
    
        // Обчислюємо кут між вектором "вперед" танка та вектором до миші
        const angle = Math.atan2(
            tankForward.x * toMouse.z - tankForward.z * toMouse.x,
            tankForward.x * toMouse.x + tankForward.z * toMouse.z
        );
        
    
        this.targetTurretAngle = -angle; // Змінюємо знак кута   
    }

    setTargetAngles(inputPosition) {
        this.setTargetTurretAngle(inputPosition);
        if (this.isChangingMode) return; // обмежуємо руши дулом в момент переключення режимів стрільби
        //const distance = toMouse.length();
        this.targetBarrelAngle = this.barrelMinAngle;
        if (this.isIndirectFireMode) {
            // Обчислюємо відстань до цілі
            // Встановлюємо кут нахилу дула залежно від відстані
            this.targetBarrelAngle = this.barrelMinAngle;
        } else {
            this.targetBarrelAngle = this.barrelMaxAngle;
        }
    }

    setBarrelTargetAngle(angle) {
        if (this.isChangingMode) return;
        this.targetBarrelAngle = angle;
    }

    getBarrelEndPosition(out) {
        // Отримуємо світову матрицю дула
        const barrelMatrix = new THREE.Matrix4();
        this.barrelPivot.updateMatrixWorld();
        barrelMatrix.copy(this.barrelPivot.matrixWorld);
    
        // Встановлюємо кінцеву точку дула
        out.set(0, 0, -1.5 * this.scale);
        out.applyMatrix4(barrelMatrix);
    }
    
    getShootDirection(out) {
        // Отримуємо напрямок пострілу
        out.set(0, 0, -1);
        out.applyQuaternion(this.mesh.quaternion);
        out.applyQuaternion(this.turret.quaternion);
        out.applyAxisAngle(new THREE.Vector3(1, 0, 0), this.barrelAngle);
        out.normalize();
    }

    isPointInsideTank(point) {
        const halfExtents = this.body.shapes[0].halfExtents;
        const localPoint = this.body.pointToLocalFrame(point);
        return (
            Math.abs(localPoint.x) <= halfExtents.x &&
            Math.abs(localPoint.y) <= halfExtents.y &&
            Math.abs(localPoint.z) <= halfExtents.z
        );
    }

    remove() {
        this.isDestroyed = true;
        this.isAcceleratingShot = false;
        this.mesh.visible = false;
        this.body.collisionResponse = false;
        this.world.removeBody(this.body);
    }

    getBarrelTipPosition() {
        // Створюємо матрицю трансформації для всього танка
        const tankMatrix = new THREE.Matrix4().makeRotationFromQuaternion(this.mesh.quaternion);
        tankMatrix.setPosition(this.mesh.position);
    
        // Створюємо матрицю трансформації для башти
        const turretMatrix = new THREE.Matrix4().makeRotationY(this.turretRotation);
        turretMatrix.setPosition(new THREE.Vector3(0, 0.4 * this.scale, 0)); // Додаємо висоту башти
    
        // Створюємо матрицю трансформації для дула
        const barrelMatrix = new THREE.Matrix4().makeRotationX(this.barrelAngle);
        barrelMatrix.setPosition(new THREE.Vector3(0, 0.15 * this.scale, 0));
    
        // Комбінуємо всі трансформації
        const finalMatrix = new THREE.Matrix4().multiplyMatrices(tankMatrix, turretMatrix);
        finalMatrix.multiply(barrelMatrix);
    
        // Отримуємо кінцеву позицію дула
        const barrelEnd = new THREE.Vector3(0, 0, -1.5 * this.scale);
        barrelEnd.applyMatrix4(finalMatrix);
        
        return barrelEnd;
    }

    hackShoot(velocity) {
        this.shotVelocity = velocity;
        this.shoot();
    }

    calculateVelocity(targetPosition) {
        const gravity = 9.82;
        const elevationAngle = this.barrelAngle;
        const startPosition = this.getBarrelTipPosition();
        
        const dx = targetPosition.x - startPosition.x;
        const dz = targetPosition.z - startPosition.z;
        const distance = Math.sqrt(dx * dx + dz * dz);
        
        const height = targetPosition.y - startPosition.y;
        
        let v;
        
        if (height >= 0) {
            // Ціль вище або на тій же висоті
            v = Math.sqrt(
                (gravity * distance * distance) /
                (2 * (height + distance * Math.tan(elevationAngle)) * Math.cos(elevationAngle) * Math.cos(elevationAngle))
            );
        } else {
            // Ціль нижче
            v = Math.sqrt(
                (gravity * distance * distance) /
                (2 * Math.cos(elevationAngle) * Math.cos(elevationAngle) * (distance * Math.tan(elevationAngle) - height))
            );
        }
        
        // Перевіряємо, чи не отримали ми NaN або Infinity
        if (isNaN(v) || !isFinite(v)) {
            // Якщо так, використовуємо просту формулу для прямого пострілу
            v = Math.sqrt(2 * gravity * Math.abs(height) + distance * distance / (2 * Math.cos(elevationAngle) * Math.cos(elevationAngle)));
        }
        
        // Обмежуємо швидкість
        return Math.max(Math.min(v, this.maxShotVelocity));
    }

    calculateTrajectory(targetPos, velocity, hitOnly = true) {
        const gravity = 9.82;
        const startPos = this.getBarrelTipPosition();
        const radianAngle = this.barrelAngle;
        const g = Math.abs(gravity);

        const dx = targetPos.x - startPos.x;
        const dz = targetPos.z - startPos.z;
        const groundDistance = Math.sqrt(dx * dx + dz * dz);
        // Розрахунок часу польоту
        const t = groundDistance / (velocity * Math.cos(radianAngle));
    
        // Розрахунок висоти в кінцевій точці
        const y = startPos.y + velocity * t * Math.sin(radianAngle) - 0.5 * g * t * t;
        
        // Перевірка, чи досягає снаряд цілі
        if (hitOnly && Math.abs(y - targetPos.y) > 0.5) {
            return null; // Траєкторія не досягає цілі
        }

        const points = [];
        const steps = 100;
        const timeStep = t / steps;

        for (let i = 0; i <= steps; i++) {
            const currentTime = i * timeStep;
            const x = startPos.x + (dx / groundDistance) * velocity * Math.cos(radianAngle) * currentTime;
            const z = startPos.z + (dz / groundDistance) * velocity * Math.cos(radianAngle) * currentTime;
            const y = startPos.y + velocity * Math.sin(radianAngle) * currentTime - 0.5 * g * currentTime * currentTime;
            if (y < targetPos.y) break;
            points.push(new THREE.Vector3(x, y, z));
        }
        return points;
    }

    shoot() {
        if (this.isDestroyed) return;
        
        // Створюємо матрицю трансформації для всього танка
        const tankMatrix = new THREE.Matrix4().makeRotationFromQuaternion(this.mesh.quaternion);
        tankMatrix.setPosition(this.mesh.position);
    
        // Створюємо матрицю трансформації для башти
        const turretMatrix = new THREE.Matrix4().makeRotationY(this.turretRotation);
        turretMatrix.setPosition(new THREE.Vector3(0, 0.4 * this.scale, 0)); // Додаємо висоту башти
    
        // Створюємо матрицю трансформації для дула
        const barrelMatrix = new THREE.Matrix4().makeRotationX(this.barrelAngle);
        barrelMatrix.setPosition(new THREE.Vector3(0, 0.15 * this.scale, 0));
    
        // Комбінуємо всі трансформації
        const finalMatrix = new THREE.Matrix4().multiplyMatrices(tankMatrix, turretMatrix);
        finalMatrix.multiply(barrelMatrix);
    
        // Отримуємо кінцеву позицію дула
        const barrelEnd = new THREE.Vector3(0, 0, -1.5 * this.scale);
        barrelEnd.applyMatrix4(finalMatrix);
    
        // Отримуємо напрямок пострілу
        const shootDirection = new THREE.Vector3(0, 0, -1);
        shootDirection.applyMatrix4(finalMatrix);
        const v = new THREE.Vector3(0, 0, 0);
        shootDirection.sub(v.setFromMatrixPosition(finalMatrix)).normalize();
    
        const initialVelocity = this.shotVelocity;
        this.shotVelocity = this.minShotVelocity;
        this.addProjectile(barrelEnd, shootDirection, initialVelocity);
        this.shootSignal(barrelEnd, shootDirection, initialVelocity);
    }

    addProjectile(barrelEnd, shootDirection, initialVelocity) {
        const projectile = new Projectile(
            this.scene,
            this.world,
            barrelEnd,
            shootDirection,
            initialVelocity,
            initialVelocity / this.maxShotVelocity,
            this.game,
            this
        );
        this.game.addProjectile(projectile);
        this.isAcceleratingShot = false;
    }

    shootSignal(barrelEnd, shootDirection, initialVelocity) {
        if (this.game.onAction) {
            this.game.onAction({gameId: this.game.id}, {type: "tank_shoot", data: {barrelEnd, shootDirection, initialVelocity, id: this.id}});
        }
    }

    reset(position, rotation) {
        this.mesh.position.copy(position);
        this.body.position.copy(position);
        this.mesh.rotation.y = rotation;
        this.rotation = rotation;
        this.body.quaternion.setFromEuler(0, rotation, 0);
        this.body.velocity.set(0, 0, 0);
        this.body.angularVelocity.set(0, 0, 0);
        this.mesh.quaternion.set(0, 0, 0, 1);
        this.resetAttributes();
    }

    resetAttributes() {
        this.health = this.maxHealth;
        this.isDestroyed = false;
        this.isAcceleratingShot = false;
        this.mesh.visible = true;
        this.body.collisionResponse = true;
        this.shotVelocity = this.minShotVelocity;
        this.isIndirectFireMode = false;
        this.setOriginalBodyState();
        this.world.addBody(this.body);
    }
}