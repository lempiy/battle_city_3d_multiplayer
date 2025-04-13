import { eventDeserialize, eventSerialize } from "./events/event";

export class WsConsumer {
    callbacks = {};
    constructor () {
        this.ws = new WebSocket(`${window.location.protocol === 'https:' ? 
            'wss' : 'ws'}://pocket-tanks-52713c5023cc.herokuapp.com/ws`);
        this.ws.onmessage = ({data}) => {
            const event = eventDeserialize(JSON.parse(data));
            this._handleEvent(event);
        };
    }

    ready() {
        return new Promise((resolve, reject) => {
            this.ws.onerror = reject
            this.ws.onopen = resolve
        })
    }

    _onEvent(name, callback) {
        this.callbacks[name] = this.callbacks[name] ? [...this.callbacks[name], callback] : [callback]
    }

    _postEvent(name, data) {
        this.ws.send(JSON.stringify(eventSerialize(name, data)))
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
        console.log("ready_to_start_game", options)
        this._postEvent("ready_to_start_game", options);
    }

    onUserLeft(callback) {
        this._onEvent("user_left", callback);
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
