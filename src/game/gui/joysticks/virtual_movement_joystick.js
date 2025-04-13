// virtual_joystick.js
import { createHTMLSvg } from '../../utils/svg';
import { driveRotateSvg } from './joystick_parts/drive_rotate';
import { driveMoveSvg } from './joystick_parts/drive_move';
import { driveBaseSvg } from './joystick_parts/drive_base';
import { driveNippleSvg } from './joystick_parts/drive_nipple';
import { SimpleJoystick } from './simple_joystick';

const toKeep = new Set();
const clockValues = [
    2*Math.PI,  // 12 годин
    Math.PI*11/6,  // 1 година
    Math.PI*5/3,   // 2 години
    Math.PI*3/2,   // 3 години
    Math.PI*4/3,   // 4 години
    Math.PI*7/6,   // 5 годин
    Math.PI,       // 6 годин
    Math.PI*5/6,   // 7 годин
    Math.PI*2/3,   // 8 годин
    Math.PI/2,     // 9 годин
    Math.PI/3,     // 10 годин
    Math.PI/6,     // 11 годин
];

const addClassIfNotExist = (node, className) => {
    if(!node.classList.contains(className)) node.classList.add(className);
    return node;
}
export default class VirtualMovementJoystick {
    constructor(game) {
        this.game = game;
        this.joystick = null;
        this.moveVector = { x: 0, y: 0 };
        this.angle = 0;
        this.visible = false;
    }

    setVisible(visible) {
        this.visible = visible;
        this.controlZone.style.display = visible ? 'block' : 'none';
    }

    init() { 
        const controlZone = document.getElementById('movement-control-zone');
        const options = {
            zone: controlZone,
            size: controlZone.clientWidth,
            position: { left: '50%', bottom: '50%' },
            mode: 'static',
            restJoystick: true,
            dataOnly: true,
        };
        this.controlZone = controlZone;
        this.base = createHTMLSvg(driveBaseSvg, controlZone.clientWidth-5);
        this.left = createHTMLSvg(driveRotateSvg, controlZone.clientWidth-5);
        this.right = createHTMLSvg(driveRotateSvg, controlZone.clientWidth-5);
        this.right.style.transform = 'translate(-50%,-50%) scale(-1, 1)';
        this.top = createHTMLSvg(driveMoveSvg, controlZone.clientWidth-5);
        this.bottom = createHTMLSvg(driveMoveSvg, controlZone.clientWidth-5);
        this.bottom.style.transform = 'translate(-50%,-50%) scale(1, -1)';
        this.sides = [this.top,this.bottom,this.left,this.right];
        this.nipple = createHTMLSvg(driveNippleSvg, controlZone.clientWidth/3);

        controlZone.appendChild(this.base);
        controlZone.appendChild(this.left);
        controlZone.appendChild(this.right);
        controlZone.appendChild(this.top);
        controlZone.appendChild(this.bottom);
        controlZone.appendChild(this.nipple);
        this.joystick = SimpleJoystick.create(options);
        controlZone.style.display = 'none';

        this.joystick.on('move', (evt, data) => {
            const angle = data.angle.radian;
            const force = Math.min(data.force, 1);
            this.angle = -angle;
            this.moveVector.x = Math.cos(angle) * force;
            this.moveVector.y = Math.sin(angle) * force;
            this.base.style.opacity = '1';
            this.sides.forEach(s => {s.style.opacity = '1';});
            this.nipple.style.opacity = '1';
        });

        this.joystick.on('start', () => {
            this.moveVector.x = 0;
            this.moveVector.y = 0;
            this.nipple.style.transform = `translate(-50%,-50%)`;
            this.updateDirections(null);
            this.base.style.opacity = '1';
            this.sides.forEach(s => {s.style.opacity = '1';});
            this.nipple.style.opacity = '1';
        });

        this.joystick.on('end', () => {
            this.moveVector.x = 0;
            this.moveVector.y = 0;
            this.nipple.style.transform = `translate(-50%,-50%)`;
            this.updateDirections(null);
            this.base.style.opacity = '0.5';
            this.sides.forEach(s => {s.style.opacity = '0.5';});
            this.nipple.style.opacity = '0.5';
        });
    }

    updateDirections(dir) {
        toKeep.clear();
        switch (dir) {
            case 0: {
                if (this.moveVector.x > 0) {
                    toKeep.add(addClassIfNotExist(this.right, 'active'));
                } else {
                    toKeep.add(addClassIfNotExist(this.left, 'active'));
                }
                if (this.moveVector.y > 0) {
                    toKeep.add(addClassIfNotExist(this.bottom, 'active'));
                } else {
                    toKeep.add(addClassIfNotExist(this.top, 'active'));
                }
                break;
            }
            case 1: {
                if (this.moveVector.y > 0) {
                    toKeep.add(addClassIfNotExist(this.bottom, 'active'));
                } else {
                    toKeep.add(addClassIfNotExist(this.top, 'active'));
                }
                break;
            }
            case -1: {
                if (this.moveVector.x > 0) {
                    toKeep.add(addClassIfNotExist(this.right, 'active'));
                } else {
                    toKeep.add(addClassIfNotExist(this.left, 'active'));
                }
                break;
            }
        }
        this.sides.filter(s => !toKeep.has(s)).forEach(s => s.classList.remove('active'));
    }

    updateAssets(angle) {
        const nippleTranslateX = -50 + this.moveVector.x*100;
        const nippleTranslateY = -50 + this.moveVector.y*100;
        this.nipple.style.transform = `translate(${nippleTranslateX}%,${nippleTranslateY}%) rotate(${-angle}rad)`;
    }

    update(deltaTime) {
        if (!this.visible) return;
        let angle = this.angle - Math.PI/2;
        // Нормалізуємо різницю кутів до діапазону [-PI, PI]
        while (angle > Math.PI) angle -= 2 * Math.PI;
        while (angle < -Math.PI) angle += 2 * Math.PI;
        if (this.moveVector.x !== 0 || this.moveVector.y !== 0) {
            this.updateAssets(angle);
            const d = Math.abs(this.moveVector.x) + Math.abs(this.moveVector.y);
            if (d < 0.5) {
                this.updateDirections(null);
                return;
            } else {
                this.game.playerTank.move(0)
                this.game.playerTank.rotate(0)
            }
            // Рух вперед/назад
            const dir = checkAngle(clockValues, angle < 0 ? angle + 2 * Math.PI : angle);
            this.updateDirections(dir);
            if (dir === 1) {
                this.game.playerTank.move(-this.moveVector.y);
            } else if (dir === -1) {
                this.game.playerTank.rotate(this.moveVector.x);
            } else {
                this.game.playerTank.move(-this.moveVector.y);
                this.game.playerTank.rotate(this.moveVector.x);
            }
        } else {
            this.game.playerTank.move(0)
            this.game.playerTank.rotate(0)
        }
    }
}

function checkAngle(clockValues, angle) {
    // Функція для перевірки, чи знаходиться кут у секторі
    const isInSector = (start, end) => {
        if (start < end) {
            return angle >= start && angle < end;
        } else {
            return angle >= start || angle < end;
        }
    };
    
    // Перевірка для 1 (між 11 і 1 годиною або між 5 і 7 годиною)
    if (isInSector(clockValues[1], clockValues[11]) || isInSector(clockValues[7], clockValues[5])) {
        return 1;
    }
    // Перевірка для 0 (між 10 і 11, 1 і 2, 4 і 5, 7 і 8 годинами)
    if (isInSector(clockValues[11], clockValues[10]) || 
        isInSector(clockValues[2], clockValues[1]) ||
        isInSector(clockValues[5], clockValues[4]) ||
        isInSector(clockValues[8], clockValues[7])) {
        return 0;
    }
    
    // Всі інші випадки
    return -1;
}