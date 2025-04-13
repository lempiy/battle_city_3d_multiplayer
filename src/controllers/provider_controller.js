import  HeadlessGame from "../game/headless_game";
import { FakeLoader } from "../game/fake_resource";
import * as THREE from 'three';

const generateGameId = () => `game-${Math.floor(Math.random() * 100000)}`;
const loader = new FakeLoader();
export class ProviderController {
    games = {};
    playersReady = {};
    constructor(provider) {
        this.provider = provider;
        this.frequency = 1 / 20; // 20 Hz
        this.timeSinceStateLastProvide = 0;
    }

    listen() {
        this.provider.onGameCreate((meta, options) => {
            this.onGameCreate(meta, options)
        })
        this.provider.onReadyToStartGame((meta, options) => {
            this.onReadyToStartGame(meta, options)
        })
        this.provider.onUserTanksUpdate((meta, update) => {
            this.onUserTanksUpdate(meta, update);
        })
        this.provider.onUserTankShoot((meta, data) => {
            this.onUserTankShoot(meta, data)
        })
        this.provider.onUserLeft((meta, data) => {
            this.onUserLeft(meta, data)
        })
        this.provider.onUserTankRespawn((meta, data) => {
            this.onUserTankRespawn(meta, data);
        })
        if (this.provider.listen) {
            this.provider.listen()
        }
    }

    onGameTick(meta, deltaTime) {
        // this.timeSinceStateLastProvide += deltaTime;
        // if (this.timeSinceStateLastProvide >= this.frequency) {
            
        //     this.timeSinceStateLastProvide = 0;
        // }
        this.emitTanksUpdate(meta);
    }

    onUserLeft(meta, data) {
        if (!this.games[meta.gameId]) return;
        console.log('user left', meta, data)
        this.games[meta.gameId].playersReady[meta.id] = false;
        if (Object.values(this.games[meta.gameId].playersReady).every((ready) => !ready)) {
            console.log('stopping game...');
            this.games[meta.gameId].stop();
            delete this.games[meta.gameId];
        }
    }

    onGameAction(meta, {type, data}) {
        switch (type) {
            case "tank_shoot":
                this.emitTankShoot(meta, data);
                break;
            case "damage_tank":
                this.emitDamageTank(meta, data);
                break;
            case "damage_crate":
                this.emitDamageCrate(meta, data);
                break;
            case "respawn_tank":
                this.emitRespawnTank(meta, data);
                break;
        }
    }

    emitTankShoot(meta, data) {
        this.provider.postTankShoot(meta, {data: data, timestamp: Date.now()});
    }

    emitDamageTank(meta, data) {
        this.provider.postDamageTank(meta, {data, timestamp: Date.now()});
    }

    emitDamageCrate(meta, data) {
        this.provider.postDamageCrate(meta, {data, timestamp: Date.now()});
    }

    emitRespawnTank(meta, data) {
        this.provider.postRespawnTank(meta, {data, timestamp: Date.now()});
    }

    emitTanksUpdate(meta) {
        if (!this.games[meta.gameId]) return;
        this.provider.postTanksUpdate(meta, {data: this.games[meta.gameId].tankSharedData, timestamp: Date.now()});
    }

    onUserTankShoot(userData, {data, timestamp}) {
        const {barrelEnd, shootDirection, initialVelocity, id} = data;
        const tank =  this.games[userData.gameId].tanks.find((tank) => tank.id === +id);
        if (!tank) console.warn(tank.id + ' tank shoot not found');
        const barrelEndVec = new THREE.Vector3().copy(barrelEnd);
        const shootDirectionVec = new THREE.Vector3().copy(shootDirection);

        tank.addProjectile(barrelEndVec, shootDirectionVec, initialVelocity);
        tank.shootSignal(barrelEndVec.clone(), shootDirectionVec.clone(), initialVelocity);
    }

    onUserTankRespawn(userData, {data, timestamp}) {
        const {id} = data;
        const tank =  this.games[userData.gameId].tanks.find((tank) => tank.id === +id);
        this.games[userData.gameId].respawnTank(tank);
    }

    onUserTanksUpdate(userData, {data, timestamp}) {
        const {id} = data;
        const tank = this.games[userData.gameId].tanks.find((tank) => tank.id === +id);
        tank.updateServerState(data, timestamp);
    }

    onGameCreate(userData, options) {
        const game = options.gameId && this.games[options.gameId] ? 
            this.games[options.gameId] : new HeadlessGame(loader, {...options,
                gameId: generateGameId(),
                onUpdate: this.onGameTick.bind(this), 
                onAction: this.onGameAction.bind(this),
            });
        this.ensureGame(game, userData, options)
    }

    ensureGame(game, userData, options) {
        this.provider.setUserMeta(userData.id, {gameId: game.id});
        this.provider.postGameCreated({id: userData.id, gameId: game.id}, {
            playerTankId: options.playerTankId, 
            gameId: game.id, 
            map: game.battleMap.getMap(),
            tanks: game.tanks.reduce((acc, tank) => {
                acc[tank.id] = {
                    position: tank.body.position,
                    quaternion: tank.body.quaternion,
                    angularVelocity: tank.body.angularVelocity,
                    velocity: tank.body.velocity,
                    turretRotation: tank.turretRotation,
                    barrelAngle: tank.barrelAngle,
                    isIndirectFireMode: tank.isIndirectFireMode,
                    isAcceleratingShot: tank.isAcceleratingShot,
                    shotVelocity: tank.shotVelocity,
                    isDestroyed: tank.isDestroyed,
                    hp: tank.health,
                    visible: tank.mesh.visible,
                }
                return acc;
            }, {}),
            frags: game.frags,
        });
        
        this.games[game.id] = game;
        this.games[game.id].playersReady = {[userData.id]: false}
        console.log(game.id, userData.id)
    }

    onReadyToStartGame(userData, options) {
        console.log('onReadyToStartGame', userData)
        this.games[userData.gameId].playersReady[userData.id] = true;
        if (Object.values(this.games[userData.gameId].playersReady).every(r => r)) {
            this.games[userData.gameId].start();
            this.provider.postGameStarted(userData, {time: this.games[userData.gameId].clock.getElapsedTime()});
        }
    }
}