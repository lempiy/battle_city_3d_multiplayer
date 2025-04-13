import { ConsumerController } from './controllers/consumer_controller';
import Game from './game/game';
import { ResourceLoader } from './game/resource';
import { LocalConsumer } from './providers/local/local_consumer';
import { WsConsumer } from './providers/ws/ws_consumer';

const urlParams = new URLSearchParams(window.location.search);
const tankId = +urlParams.get('tank') ? +urlParams.get('tank') : 1;
const gameId = urlParams.get('game');
const options = [1,3,4].reduce((acc, id) => {
    if (id !== tankId) {
        acc.ai.push({tankId: id})
    }
    return acc;
}, {playerTankId: tankId, gameId: gameId, ai: []})

const runLocal = () => {
    const canvas = document.getElementById('gameCanvas');
    const loader = new ResourceLoader();
    const consumer = new LocalConsumer();
    const controller = new ConsumerController(loader, canvas, "Anton", consumer);
    controller.create(options);
}

const runSinglePlayer = () => {
    const canvas = document.getElementById('gameCanvas');
    const loader = new ResourceLoader();
    loader.preload().then(() => {
        const game = new Game(loader, {...options, isSinglePlayer: true})
        game.start(canvas);
    })
}

const runWs = () => {
    const canvas = document.getElementById('gameCanvas');
    const loader = new ResourceLoader();
    const consumer = new WsConsumer();
    consumer.ready().then(() => {
        const controller = new ConsumerController(loader, canvas, "Anton", consumer);
        controller.create(options);
    });
}

window.onload = () => {
    runSinglePlayer();
}
