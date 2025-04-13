// virtual_joystick.js
import * as THREE from 'three';
import { createHTMLSvg } from '../../utils/svg';
import { aimBaseSvg } from './joystick_parts/aim_base';
import { aimCenterSvg } from './joystick_parts/aim_center';
import { SimpleJoystick } from './simple_joystick';

export default class VirtualAimJoystick {
    constructor(game) {
        this.game = game;
        this.joystick = null;
        this.output = { x: 0, y: 0 };
        this.moveVector = { x: 0, y: 0 };
        this.angle = 0;
        this.minSensibilityX = 1;
        this.maxSensibilityX = 0.5;
        this.minAspectRatio = 1;
        this.maxAspectRatio = 2.5;
        this.touched = false;
        this.visible = false;
    }

    setVisible(visible) {
        this.visible = visible;
        this.controlZone.style.display = visible ? 'block' : 'none';
    }

    init() {
        
        const controlZone = document.getElementById('aim-control-zone');
        const options = {
            zone: controlZone,
            color: 'rbga(0,0,0,0)',
            size: controlZone.clientWidth,
            position: { left: '50%', bottom: '50%' },
            mode: 'static',
            //shape: 'square',
            restJoystick: false,
            dataOnly: true,
        };
        this.controlZone = controlZone;
        this.base = createHTMLSvg(aimBaseSvg, controlZone.clientWidth-15);
        this.nipple = createHTMLSvg(aimCenterSvg, (controlZone.clientWidth-15)/3);
        controlZone.appendChild(this.base);
        controlZone.appendChild(this.nipple);
        this.joystick = this.joystick = SimpleJoystick.create(options);
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
            this.nipple.style.opacity = '1';
        });
        this.joystick.on('end', () => {
            this.touched = false;
            this.base.style.opacity = '0.5';
            this.nipple.style.opacity = '0.5';
        });
    }

    updateAssets() {
        const nippleTranslateX = -50 + this.moveVector.x*100;
        const nippleTranslateY = -50 + this.moveVector.y*100;
        this.nipple.style.transform = `translate(${nippleTranslateX}%,${nippleTranslateY}%)`;
    }

    update(deltaTime) {
        if (!this.visible) return;
        const tank = this.game.playerTank;
        this.updateAssets();
        const reticle = this.game.reticle;
        const camera = this.game.cameraController.getCamera();
        const planeNormal = new THREE.Vector3(0, 1, 0);
        const planeConstant = 0;
        const plane = new THREE.Plane(planeNormal, planeConstant);
        const raycaster = new THREE.Raycaster();
        const ar = Math.min(this.maxAspectRatio, Math.max(this.minAspectRatio, this.game.aspectRatio));
        // Додаємо "мертву зону" та коефіцієнт чутливості
        const deadzone = 0.0;
        const sensitivityX = (this.minSensibilityX + (this.maxSensibilityX - this.minSensibilityX) / (this.maxAspectRatio - this.minAspectRatio) * (ar - this.minAspectRatio));
        const sensitivityY = 0.5;
        // Застосовуємо "мертву зону" та чутливість до вхідних даних джойстика
        let adjustedX = Math.abs(this.output.x) > deadzone ? (this.output.x - Math.sign(this.output.x) * deadzone) * sensitivityX : 0;
        let adjustedY = Math.abs(this.output.y) > deadzone ? (this.output.y - Math.sign(this.output.y) * deadzone) * sensitivityY : 0;

        const mouse = new THREE.Vector2(adjustedX, adjustedY);

        raycaster.setFromCamera(mouse, camera);
        const intersection = new THREE.Vector3();
        
        raycaster.ray.intersectPlane(plane, intersection);

        // Обмежуємо intersection розміром карти
        const halfMapSize = (this.game.battleMap.size - 2) / 2;
        intersection.x = Math.max(-halfMapSize, Math.min(halfMapSize, intersection.x));
        intersection.z = Math.max(-halfMapSize, Math.min(halfMapSize, intersection.z));
        const adjustedPoint = this.findTargetNearPoint(intersection);
        if (tank) {
            tank.setTargetTurretAngle(adjustedPoint || intersection);
        }
        reticle.setPosition(adjustedPoint || intersection);
        reticle.setScale(adjustedPoint ? 3.5 : 1);
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