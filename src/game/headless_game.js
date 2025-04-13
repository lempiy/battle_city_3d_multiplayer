// headless_game.js
import * as THREE from 'three';
import * as CANNON from 'cannon';
import BattleMap from './battlemap';
import Tank from './objects/tank';
import SkyBox from './skybox';
import AIPlayer from './ai_player';
import HealPowerUp from './objects/heal_power_up';
import { loop } from './utils/loop';

export default class HeadlessGame {
    constructor(loader, options) {
        const {map, ai, onUpdate, onAction} = options;
        this.loader = loader;
        this.headless = true;
        this.id = options.gameId;
        this._tankCounter = 0;
        this._crateCounter = 0;
        this.scene = new THREE.Scene();
        this.world = new CANNON.World();
        this.world.gravity.set(0, -9.82, 0);
        this.clock = new THREE.Clock();
        this.projectiles = [];
        this.maxProjectiles = 100;
        this.plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
        this.skyBox = new SkyBox(this.scene);
        const mapSize = 60;
        this.battleMap = map ? BattleMap.fromMap(this.scene, this, map) : new BattleMap(this.scene, this, mapSize, 7);
        this.tanks = [
            new Tank(this.scene, this.world, this, 0xff0000, this.battleMap.spawnPoints[0].position, this.battleMap.spawnPoints[0].rotation),
            new Tank(this.scene, this.world, this, 0x0000ff, this.battleMap.spawnPoints[1].position, this.battleMap.spawnPoints[1].rotation),
            new Tank(this.scene, this.world, this, 0x00ff00, this.battleMap.spawnPoints[2].position, this.battleMap.spawnPoints[2].rotation),
            new Tank(this.scene, this.world, this, 0xffff00, this.battleMap.spawnPoints[3].position, this.battleMap.spawnPoints[3].rotation),
        ];
        this.tankSharedData = this.tanks.reduce((acc, tank) => {
            acc[tank.id] = {
                id: tank.id,
                position: null,
                quaternion: null,
                angularVelocity: null,
                velocity: null,
                targetTurretAngle: null,
                targetBarrelAngle: null,
            };
            return acc;
        }, {});
        this.aiPlayers = null;
        this.initiateAI(ai);
        this.respawnTimer = 5000; // 5 секунд для CPU танків
        this.powerUps = [];
        this.powerUpSpawnInterval = 10000; // 10 секунд
        this.lastPowerUpSpawnTime = 0;
        this.setupCollisionEvents();
        this.explosions = [];
        this.frags = options.frags || this.tanks.reduce((acc, t) => ({...acc, [t.id]: 0}), {});
        this.onUpdate = onUpdate;
        this.onAction = onAction;
        this.tick = this.tick.bind(this);


        if (options.tanks) {
            Object.entries(options.tanks).forEach(([id, state]) => {
                const tank = this.tanks.find(tank => tank.id == id);
                console.log('apply state',id, state, tank.id);
                tank.applyState(state);
            })
        }
    }

    generateTankId() {
        return ++this._tankCounter;
    }

    generateCrateId() {
        return ++this._crateCounter;
    }

    initiateAI(ai) {
        console.log(this.tanks.map(t => t.id), (ai ? ai.map(a => a.tankId) : []));
        this.aiPlayers = ai ? ai.map((ai) => new AIPlayer(this, this.tanks.find((t) => t.id === ai.tankId)))
            : [];
    }

    updateSharedData() {
        for (let i = this.tanks.length - 1; i >= 0; i--) {
            const tank = this.tanks[i];
            const state = tank.getStateData();
            this.tankSharedData[tank.id].position = state.position
            this.tankSharedData[tank.id].quaternion = state.quaternion
            this.tankSharedData[tank.id].angularVelocity = state.angularVelocity
            this.tankSharedData[tank.id].velocity = state.velocity
            this.tankSharedData[tank.id].targetTurretAngle = state.targetTurretAngle
            this.tankSharedData[tank.id].targetBarrelAngle = state.targetBarrelAngle
            this.tankSharedData[tank.id].isIndirectFireMode = state.isIndirectFireMode
            this.tankSharedData[tank.id].isAcceleratingShot = state.isAcceleratingShot
            this.tankSharedData[tank.id].shotVelocity = state.shotVelocity
            this.tankSharedData[tank.id].isDestroyed = state.isDestroyed;
        }
    }


    setupCollisionEvents() {
        this.world.addEventListener('beginContact', (event) => {
            const bodyA = event.bodyA;
            const bodyB = event.bodyB;

            // Перевіряємо, чи є одне з тіл паверапом, а інше - танком
            const powerUp = this.powerUps.find(pu => pu.body === bodyA || pu.body === bodyB);
            const tank = this.tanks.find(t => t.body === bodyA || t.body === bodyB);

            if (powerUp && tank) {
                powerUp.onCollect(tank);
                this.removePowerUp(powerUp);
            }
        });
    }

    removePowerUp(powerUp) {
        const index = this.powerUps.indexOf(powerUp);
        if (index > -1) {
            this.powerUps.splice(index, 1);
            powerUp.remove();
        }
    }

    update() {
        const deltaTime = this.clock.getDelta();

        this.battleMap.update();
        this.tanks.forEach(tank => tank.update(deltaTime));

        this.updateProjectiles(deltaTime);
        this.updateExplosions(deltaTime);


        this.updatePowerUps(deltaTime);
        //this.spawnPowerUps();

        this.aiPlayers.forEach(ai => ai.update(deltaTime));
        this.updateSharedData();
        if (this.onUpdate) this.onUpdate({gameId: this.id}, deltaTime);
        this.world.step(1/60, deltaTime, 3);
        return deltaTime;
    }

    loop() {
        this.update();
        const cycle = loop();
        // const looper = globalThis.hasOwnProperty('requestAnimationFrame') ? requestAnimationFrame : loop
        this.cancelLoop = cycle(this.update.bind(this));
    }

    tick() {
        this.update();
        const id = requestAnimationFrame(this.tick);
        this.cancelLoop = () => cancelAnimationFrame(id);
    }

    stop() {
        if (this.cancelLoop !== undefined) {
            console.log('Stopping game '+ this.id);
            this.cancelLoop();
        }
    }

    addProjectile(projectile) {
        this.projectiles.push(projectile);
        if (this.projectiles.length > this.maxProjectiles) {
            const oldestProjectile = this.projectiles.shift();
            oldestProjectile.remove();
        }
        projectile.game = this;
    }


    addExplosion(explosion) {
        this.explosions.push(explosion);
    }

    updateExplosions(deltaTime) {
        this.explosions = this.explosions.filter(explosion => explosion.update(deltaTime));
    }

    checkProjectileCollision(projectile) {
        if ( projectile.hasContact()) {
            // Колізія виявлена
            
            return true;
        }
        
        return false;
    }

    updateProjectiles(deltaTime) {
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            const projectile = this.projectiles[i];
            projectile.update(deltaTime);
    
            if (projectile.isDestroyed) {
                this.projectiles.splice(i, 1);
                continue
            }
            if (this.isOutOfBounds(projectile)) {
                projectile.remove();
                this.projectiles.splice(i, 1);
            }
        }
    }


    isOutOfBounds(projectile) {
        const position = projectile.mesh.position;
        const boundaryLimit = this.battleMap.size * 1;
        return Math.abs(position.x) > boundaryLimit || 
               Math.abs(position.y) > boundaryLimit || 
               Math.abs(position.z) > boundaryLimit;
    }

    isPlayerControlledTank(tank) {
        return !this.aiPlayers.some((ai) => ai.tank.id == tank.id)
    }

    handleTankDeath(tank) {
        tank.remove();
        if (this.isPlayerControlledTank(tank)) { // Якщо це танк гравця
            this.onTankDeath(tank);
        } else { // Якщо це CPU танк
            setTimeout(() => this.respawnTank(tank), this.respawnTimer);
        }
    }

    onTankDeath(tank) {}

    respawnTank(tank) {
        const {optimalPoint, rotation} = this.getOptimalSpawnPoint();
        if (this.headless && this.onAction) {
            this.onAction({gameId: this.id}, {type: "respawn_tank", data: {id: tank.id, point: optimalPoint, rotation}});
        }
        this.respawnTankInPosition(tank, optimalPoint, rotation);
    }

    respawnTankInPosition(tank, point, rotation) {
        if (!this.headless) console.log('respawn_tank', tank, point, rotation)
        tank.reset(point, rotation);
    }

    getOptimalSpawnPoint() {
        let optimalPoint = null;
        let rotation = null;
        let minEnemies = Infinity;

        for (const spawnPoint of this.battleMap.spawnPoints) {
            const enemiesNearby = this.countEnemiesNearPoint(spawnPoint.position);
            if (enemiesNearby < minEnemies) {
                minEnemies = enemiesNearby;
                optimalPoint = spawnPoint.position;
                rotation = spawnPoint.rotation;
            }
        }

        return {optimalPoint, rotation};
    }

    countEnemiesNearPoint(point) {
        const radius = 20; // Радіус перевірки
        return this.tanks.filter(tank => 
            !tank.isDestroyed && 
            tank.mesh.position.distanceTo(point) < radius
        ).length;
    }

    updatePowerUps(deltaTime) {
        for (let i = this.powerUps.length - 1; i >= 0; i--) {
            const powerUp = this.powerUps[i];
            powerUp.update(deltaTime)
    
            if (this.isDestroyed) {
                this.powerUps.splice(i, 1);
            }
        }
    }

    spawnPowerUps() {
        const currentTime = Date.now();
        if (currentTime - this.lastPowerUpSpawnTime > this.powerUpSpawnInterval) {
            const position = this.getRandomPosition();
            const healPowerUp = new HealPowerUp(this.scene, this.world, position, this);
            this.powerUps.push(healPowerUp);
            this.lastPowerUpSpawnTime = currentTime;
        }
    }

    getRandomPosition() {
        const halfSize = this.battleMap.size / 2;
        const x = Math.random() * this.battleMap.size - halfSize;
        const z = Math.random() * this.battleMap.size - halfSize;
        return new THREE.Vector3(x, 1, z);
    }

    damageTank(damage, tank, radius, position, dealer) {
        tank.takeDamage(damage, dealer);
        const tankKillerId =  this.checkTankDestruction(tank, dealer);
        if (this.headless && this.onAction) {
            this.onAction({gameId: this.id}, {type: "damage_tank", data: {id: tank.id, radius, damage, dealer: dealer.id, position}});
        }
        return tankKillerId;
    }

    checkTankDestruction(tank, dealer) {
        if (tank.health <= 0 && !tank.isDestroyed) {
            tank.isDestroyed = true;
            console.log(`${dealer.id} killed ${tank.id}`)
            this.handleTankDeath(tank);
            return dealer.id;
        }
        return null;
    }

    damageCrate(innerPoint, deepPoint, radius, crate) {
        const vec = crate.destroyCubesInRadius(deepPoint, radius);
        if (this.headless && this.onAction) {
            this.onAction({gameId: this.id}, {type: "damage_crate", data: {id: crate.id, innerPoint, deepPoint, radius}});
        }
        return vec;
    }

    addFrag(owner) {
        this.frags[owner.id] = this.frags[owner.id] ? this.frags[owner.id] + 1 : 1;
    }

    start() {
        this.loop();
    }
}
