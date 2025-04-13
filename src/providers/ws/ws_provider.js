import { eventDeserialize, eventSerialize } from "./events/event";
import uWS from 'uWebSockets.js';
const port = +process.env.PORT || 9001;


export class WsProvider {
    _count = 0;
    callbacks = {};
    users = {};
    constructor() {
        console.log('Listen on post '+ port);
        this.app = uWS.App().get('/', (res, req) => {
            res.end(`Pocket tanks server time: ${new Date().toISOString()}`);
        }).ws('/ws', {
            /* Options */
            compression: uWS.SHARED_COMPRESSOR,
            maxPayloadLength: 16 * 1024 * 1024,
            idleTimeout: 10,
            maxBackpressure: 1024,
          
            /* Todo, Setting 1: merge messages in one, or keep them as separate WebSocket frames - mergePublishedMessages */
            /* Todo, Setting 4: send to all including us, or not? That's not a setting really just use ws.publish or global uWS.publish */
          
            /* Handlers */
            open: (ws) => {
              ws.id = `${++this._count}`;
              this.users[ws.id] = ws;
              /* Let this client listen to all sensor topics */
            },
            message: (ws, buf, isBinary) => {
              const decoder = new TextDecoder();
              const data = decoder.decode(buf);
              const event = eventDeserialize(JSON.parse(data));
              const userData = ws.getUserData();
              this._handleEvent(userData.meta ? userData.meta : userData, event);
            },
            drain: (ws) => {
          
            },
            close: (ws, code, message) => {
                const userData = ws.getUserData();
                this._handleEvent(userData.meta, {"event": "user_left", data: {}});
                delete this.users[ws.id]
              /* The library guarantees proper unsubscription at close */
            }
          }).any('/*', (res, req) => {
            res.end('Nothing to see here!');
          });
    }

    listen() {
        this.app.listen(port, (token) => {
            if (token) {
              console.log('Listening to port ' + port);
            } else {
              console.log('Failed to listen to port ' + port);
            }
        });
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

    _postSingleEvent(name, meta, data) {
        // setTimeout(() => {
        //      this.users[meta.id].send(JSON.stringify(eventSerialize(name, data)), false, true);
        // }, 100)
        this.users[meta.id].send(JSON.stringify(eventSerialize(name, data)), false, true);
    }

    _postEvent(name, meta, data) {
        // setTimeout(() => {
        //    this.app.publish(`/game/${meta.gameId}/events`, JSON.stringify(eventSerialize(name, data)), false, true);
        // }, 100)
        this.app.publish(`/game/${meta.gameId}/events`, JSON.stringify(eventSerialize(name, data)), false, true);
    }

    setUserMeta(userId, meta) {
        this.users[userId].meta = {...meta, id: userId};
    }

    onUserLeft(callback) {
        this._onEvent("user_left", callback);
    }

    onGameCreate(callback) {
        this._onEvent("game_create", callback);
    }

    onReadyToStartGame(callback) {
        this._onEvent("ready_to_start_game", callback);
    }

    postGameStarted(meta, payload) {
        console.log("game_started", meta, payload);
        this._postSingleEvent("game_started", meta, payload);
    }
    
    postGameCreated(meta, game) {
        console.log(this.users[meta.id], `/game/${meta.gameId}/events`);
        this.users[meta.id].subscribe(`/game/${meta.gameId}/events`);
        this._postSingleEvent("game_created", meta, game);
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
}
