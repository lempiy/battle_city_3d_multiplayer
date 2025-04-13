// virtual_joystick.js
import { createHTMLSvg } from '../../utils/svg';
import { angleBaseSvg } from './joystick_parts/angle_base';
import { angleRectSvg } from './joystick_parts/angle_rect';
import { SimpleJoystick } from './simple_joystick';

export default class VirtualAngleJoystick {
    constructor(game) {
        this.game = game;
        this.joystick = null;
        this.output = { x: 0, y: 0 };
        this.moveVector = { x: 0, y: 0 };
        this.angle = 0;
        this.touchedProgress = 0;
        this.touched = false;
        this.visible = false;
    }

    setVisible(visible) {
        this.visible = visible;
        this.controlZone.style.display = visible ? 'block' : 'none';
    }

    init() {
        const controlZone = document.getElementById('angle-control-zone');
        const options = {
            zone: controlZone,
            color: 'rbga(0,0,0,0)',
            size: controlZone.clientWidth,
            position: { right: '50%', bottom: '50%' },
            mode: 'static',
            shape: 'square',
            restJoystick: false,
            dataOnly: true,
        };
        this.controlZone = controlZone;
        this.base = createHTMLSvg(angleBaseSvg, controlZone.clientWidth-10);
        this.rect = createHTMLSvg(angleRectSvg, controlZone.clientWidth-10);
        controlZone.appendChild(this.base);
        controlZone.appendChild(this.rect);
        this.joystick = SimpleJoystick.create(options);
        this.addEventListeners();
        controlZone.style.display = 'none';
    }

    addEventListeners() {
        this.joystick.on('move', (evt, data) => {
            this.angle = -data.angle.radian;
            const force = Math.min(data.force, 1);
            this.output.x = Math.cos(this.angle) * force;
            this.output.y = Math.sin(this.angle) * force;
            this.moveVector.x = Math.cos(this.angle) * force;
            this.moveVector.y = -Math.sin(this.angle) * force;
        });
        this.joystick.on('start', () => {
            this.touched = true;
            this.base.style.opacity = '1';
            this.rect.style.opacity = '1';
        });
        this.joystick.on('end', () => {
            this.touched = false;
            if (this.touchedProgress != 0) {
                this.touchedProgress = 0;
                this.game.playerTank.shoot();
            }
            this.base.style.opacity = '0.5';
            this.rect.style.opacity = '0.5';
        });
    }

    updateAssets() {
        const nippleTranslateY = Math.min(-10,Math.max(-87,-50 + this.moveVector.y*50));
        this.rect.style.transform = `translate(-50%,${nippleTranslateY}%)`;
    }

    update(deltaTime) {
        if (!this.visible) return;
        const tank = this.game.playerTank;
        if (this.touched && this.output.x < 0) {
            this.touchedProgress = Math.min(1, this.touchedProgress + deltaTime * 0.7);
            this.game.playerTank.accelerateShotVelocity();
        }
        this.updateAssets();
        const m =  (tank.barrelMaxAngle - tank.barrelMinAngle) / (1 - (-1));
        const barrelAngle = tank.barrelMinAngle + m * (this.output.y - (-1));
        tank.setBarrelTargetAngle(barrelAngle);
    }
}