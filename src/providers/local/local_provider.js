import { eventDeserialize, eventSerialize } from "./events/event";

export class LocalProvider {
    callbacks = {};
    users = {};
    gameId = null;
    id = 'user1';
    constructor(self) {
        self.onmessage = ({data}) => {
            const event = eventDeserialize(data);
            this._handleEvent({...(this.users[this.id] ? this.users[this.id].meta : {}), id: this.id}, event);
        }
    }

    _handleEvent(meta, data) {
        const {event, payload} = data;
        const handlers = this.callbacks[event];
        if (!handlers) return;
        handlers.forEach((cb) => cb(meta, payload));
    }

    _onEvent(name, callback) {
        this.callbacks[name] = this.callbacks[name] ? [...this.callbacks[name], callback] : [callback]
    }

    setUserMeta(userId, meta) {
        if (!this.users[userId]) this.users[userId] = {};
        this.users[userId].meta = meta;
    }

    _postEvent(name, meta, data) {
        // setTimeout(() => {
        //     self.postMessage(eventSerialize(name, data))
        // }, 100)
        self.postMessage(eventSerialize(name, data));
    }

    onGameCreate(callback) {
        this._onEvent("game_create", callback);
    }

    onReadyToStartGame(callback) {
        this._onEvent("ready_to_start_game", callback);
    }

    postGameStarted(meta, payload) {
        this._postEvent("game_started", meta, payload);
    }
    
    postGameCreated(meta, game) {
        this._postEvent("game_created", meta, game);
    }

    postTanksUpdate(meta, update) {
        this._postEvent("tanks_update", meta, update);
    }

    postTankShoot(meta, shoot) {
        this._postEvent("tank_shoot", meta, shoot);
    }

    postDamageTank(meta, data) {
        this._postEvent("damage_tank", meta, data);
    }

    postDamageCrate(meta, data) {
        this._postEvent("damage_crate", meta, data);
    }

    postRespawnTank(meta, data) {
        this._postEvent("respawn_tank", meta, data);
    }

    onUserTanksUpdate(callback) {
        this._onEvent("user_tanks_update", callback);
    }

    onUserTankShoot(callback) {
        this._onEvent("user_tank_shoot", callback);
    }

    onUserTankRespawn(callback) {
        this._onEvent("user_tank_respawn", callback);
    }

    onUserLeft(callback) {

    }
}
