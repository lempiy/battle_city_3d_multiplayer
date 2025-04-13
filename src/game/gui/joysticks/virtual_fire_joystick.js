// virtual_joystick.js
import * as THREE from 'three';
import { createHTMLSvg } from '../../utils/svg';
import { fireSegmentSvg } from './joystick_parts/fire_segment';
import { fireBaseSvg } from './joystick_parts/fire_base';
import { fireTurretSvg } from './joystick_parts/fire_turret';
import { SimpleJoystick } from './simple_joystick';

export default class VirtualFireJoystick {
    constructor(game) {
        this.game = game;
        this.joystick = null;
        this.output = { x: 0, y: 0 };
        this.angle = 0;
        this.minSensibilityX = 1;
        this.maxSensibilityX = 0.5;
        this.minAspectRatio = 1;
        this.maxAspectRatio = 2.5;
        this.touchedProgress = 0;
        this.touched = false;
        this.visible = false;
    }

    setVisible(visible) {
        this.visible = visible;
        this.controlZone.style.display = visible ? 'block' : 'none';
    }

    init() {
        const controlZone = document.getElementById('fire-control-zone');
        const options = {
            zone: controlZone,
            color: 'rbga(0,0,0,0)',
            size: controlZone.clientWidth,
            position: { right: '50%', bottom: '50%' },
            mode: 'static',
            restJoystick: false,
            dataOnly: true,
        };

        this.controlZone = controlZone;
        this.base = createHTMLSvg(fireBaseSvg, controlZone.clientWidth-15);
        this.segment = createHTMLSvg(fireSegmentSvg, controlZone.clientWidth-15);
        this.segment.classList.add('joystick-direct-segment');
        this.turret = createHTMLSvg(fireTurretSvg, controlZone.clientWidth-15);
        controlZone.appendChild(this.base);
        controlZone.appendChild(this.segment);
        controlZone.appendChild(this.turret);
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
        });
        this.joystick.on('start', () => {
            this.touched = true;
            this.base.style.opacity = '1';
            this.turret.style.opacity = '1';
        });
        this.joystick.on('end', () => {
            this.touched = false;
            if (this.touchedProgress != 0) {
                this.touchedProgress = 0;
                this.game.playerTank.shoot();
            }
            this.base.style.opacity = '0.5';
            this.turret.style.opacity = '0.5';
        });
    }

    updateDirectFireAssets(angle) {
        this.segment.style.transform = `translate(-50%,-50%) rotate(${-angle}rad)`;
        this.turret.style.transform = `translate(-50%,-50%) rotate(${-angle}rad)`;
    }

    update(deltaTime) {
        if (!this.visible) return;
        const tank = this.game.playerTank;
        const d = Math.abs(this.output.x) + Math.abs(this.output.y);
        if (d < 0.2) return;
        if (this.touched && d > 0.85) {
            this.touchedProgress = Math.min(1, this.touchedProgress + deltaTime * 0.7);
            this.game.playerTank.accelerateShotVelocity();
        }
        let angle = this.angle - Math.PI/2;
        // Нормалізуємо різницю кутів до діапазону [-PI, PI]
        while (angle > Math.PI) angle -= 2 * Math.PI;
        while (angle < -Math.PI) angle += 2 * Math.PI;
        this.updateDirectFireAssets(angle);
        const targetAngle = this.findTargetInSight(tank, angle);
        tank.targetTurretAngle = targetAngle || angle;
    }

    findTargetInSight(tank, currentAngle) {
        const maxAngleDiff = Math.PI / 16;
        const enemies = this.game.tanks.filter(t => t.id !== tank.id && !t.isDestroyed);
        
        for (const enemy of enemies) {
            const direction = new THREE.Vector3().subVectors(enemy.mesh.position, tank.mesh.position);
            direction.y = 0; // Ігноруємо різницю у висоті
            const targetAngle = Math.atan2(direction.x, direction.z);
            const tankBodyAngle = tank.mesh.rotation.y;
        
            // Обчислюємо необхідний кут повороту башти відносно корпусу танка

            let turretAngle = targetAngle - tankBodyAngle - Math.PI;
            // Нормалізуємо кут до діапазону [-PI, PI]
            while (turretAngle > Math.PI) turretAngle -= 2 * Math.PI;
            while (turretAngle < -Math.PI) turretAngle += 2 * Math.PI;

            let angleDiff = turretAngle - currentAngle;
            while (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
            while (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;
            
            if (Math.abs(angleDiff) < maxAngleDiff) {
                return turretAngle;
            }
        }
        return null;
    }
    
    findTargetNearPoint(point) {
        const maxDistance = 5; // Максимальна відстань для "прилипання"
        const enemies = this.game.tanks.filter(t => t.id !== this.game.playerTank.id && !t.isDestroyed);
        
        for (const enemy of enemies) {
            const distance = enemy.mesh.position.distanceTo(point);
            if (distance < maxDistance) {
                return enemy.mesh.position.clone();
            }
        }
        return null;
    }
}