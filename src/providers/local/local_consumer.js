import { eventDeserialize, eventSerialize } from "./events/event";

export class LocalConsumer {
    callbacks = {};
    constructor () {
        const worker = new Worker(new URL('../../worker.js', import.meta.url));
        this.worker = worker;
        worker.onmessage = ({data}) => {
            const event = eventDeserialize(data);
            this._handleEvent(event);
        };
    }

    _onEvent(name, callback) {
        this.callbacks[name] = this.callbacks[name] ? [...this.callbacks[name], callback] : [callback]
    }

    _postEvent(name, data) {
        this.worker.postMessage(eventSerialize(name, data))
    }

    _handleEvent(data) {
        const {event, payload} = data;
        const handlers = this.callbacks[event];
        if (!handlers) return;
        
        handlers.forEach((cb) => cb(payload));
    }

    postGameCreate(options) {
        this._postEvent("game_create", options);
    }

    postReadyToStartGame(options) {
        this._postEvent("ready_to_start_game", options);
    }

    onGameCreated(callback) {
        this._onEvent("game_created", callback);
    }

    onGameStarted(callback) {
        this._onEvent("game_started", callback);
    }

    onTanksUpdate(callback) {
        this._onEvent("tanks_update", callback);
    }

    onTankShoot(callback) {
        this._onEvent("tank_shoot", callback);
    }

    onDamageTank(callback) {
        this._onEvent("damage_tank", callback);
    }

    onDamageCrate(callback) {
        this._onEvent("damage_crate", callback);
    }

    onRespawnTank(callback) {
        this._onEvent("respawn_tank", callback);
    }

    postUserTanksUpdate(update) {
        this._postEvent("user_tanks_update", update)
    }

    postUserTankShoot(shoot) {
        this._postEvent("user_tank_shoot", shoot)
    }

    postUserTankRespawn(data) {
        this._postEvent("user_tank_respawn", data)
    }
}
