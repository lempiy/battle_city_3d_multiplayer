import Game from "../game/game";
import * as THREE from 'three';
import * as CANNON from 'cannon';

export class ConsumerController {
    constructor(loader, canvas, playerID, consumer) {
        this.consumer = consumer;
        this.loader = loader;
        this.canvas = canvas;
        this.playerID = playerID;
        this.frequency = 1 / 30; // 30 Hz
        this.timeSinceStateLastProvide = 0;

        this.setupEventListeners();
        
    }

    setupEventListeners() {
        this.consumer.onGameCreated((map) => {
            this.onGameCreated(map);
        });
        this.consumer.onGameStarted((data) => {
            this.onGameStarted(data);
        });
        this.consumer.onTanksUpdate((update) => {
            this.onTanksUpdate(update);
        })
        this.consumer.onTankShoot((data) => {
            this.onTankShoot(data);
        })
        this.consumer.onDamageTank((data) => {
            this.onDamageTank(data);
        })
        this.consumer.onDamageCrate((data) => {
            this.onDamageCrate(data);
        })
        this.consumer.onRespawnTank((data) => {
            this.onRespawnTank(data)
        })
    }

    onGameTick(_, deltaTime) {
        this.timeSinceStateLastProvide += deltaTime;
        if (this.timeSinceStateLastProvide >= this.frequency) {
            this.emitTankUpdate();
            this.timeSinceStateLastProvide = 0;
        }
    }

    onGameAction(_, {type, data}) {
        switch (type) {
            case "tank_shoot":
                this.emitTankShoot(data);
                break;
            case "respawn_tank":
                this.emitTankRespawn(data);
                break;
        }
    }

    emitTankShoot(data) {
        this.consumer.postUserTankShoot({data: data, timestamp: Date.now()});
    }

    emitTankRespawn(data) {
        console.log(`emitTankRespawn`, data);
        this.consumer.postUserTankRespawn({data: data, timestamp: Date.now()});
    }

    emitTankUpdate() {
        this.consumer.postUserTanksUpdate({data: this.game.tankSharedData[this.game.playerTankId], timestamp: Date.now()});
    }

    onDamageCrate({data, timestamp}) {
        if (!this.game) return;
        const {id, radius, innerPoint, deepPoint} = data;
        const crate = this.game.battleMap.crates.find((c) => c.id === +id);
        if (!crate) console.warn(crate.id + ' crate damage target not found');
        this.game.damageCrate(new THREE.Vector3().copy(innerPoint), new CANNON.Vec3().copy(deepPoint), radius, crate);
    }

    onDamageTank({data, timestamp}) {
        if (!this.game) return;
        const {id, radius, damage, dealer, position} = data;
        const tank = this.game.tanks.find((tank) => tank.id === +id);
        const d = this.game.tanks.find((tank) => tank.id === +dealer);
        if (!tank) console.warn(tank.id + ' tank damage target not found');
        if (!d) console.warn(d.id + ' dealer damage not found');
        this.game.damageTank(damage, tank, radius, new THREE.Vector3().copy(position), d);
    }

    onRespawnTank({data, timestamp}) {
        if (!this.game) return;
        const {id, point, rotation} = data;
        const tank = this.game.tanks.find((tank) => tank.id === +id);
        console.log(`onRespawnTank`, data);
        if (id === this.game.playerTankId) {
            this.game.respawnAndSwitchCamera(tank, point, rotation);
        } else {
            this.game.respawnTankInPosition(tank, point, rotation);
        }
    }

    onTankShoot({data, timestamp}) {
        if (!this.game) return;
        const {barrelEnd, shootDirection, initialVelocity, id} = data;
        if (id === this.game.playerTankId) return;
        const tank = this.game.tanks.find((tank) => tank.id === +id);
        if (!tank) console.warn(tank.id + ' tank shoot not found');
        tank.addProjectile(new THREE.Vector3().copy(barrelEnd), new THREE.Vector3().copy(shootDirection), initialVelocity);
    }


    onTanksUpdate({data, timestamp}) {
        if (!this.game) return;
        Object.entries(data).forEach(([id, state]) => {
            if (id === `${this.game.playerTankId}`) return;
            const tank = this.game.tanks.find((tank) => tank.id === +id);
            tank.updateServerState(state, Date.now());
        })
    }

    onGameCreated(options) {
        this.loader.preload().then(() => {
            console.log(options);
            const game = new Game(this.loader, {
                ...options,
                onUpdate: this.onGameTick.bind(this),
                onAction: this.onGameAction.bind(this)
            });
            window.game = game;
            this.consumer.postReadyToStartGame({id: this.playerID});
            this.game = game;
        });
    }

    onGameStarted(data) {
        this.game.start(this.canvas);
    }

    create(options) {
        this.consumer.postGameCreate({id: this.playerID, ...options})
    }
}