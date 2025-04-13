// game.js
import * as THREE from 'three';
import HeadlessGame from './headless_game'
import Reticle from './gui/reticle';
import TrajectoryLine from './gui/trajectory_line';
import TrajectoryCurve from './gui/trajectory_curve';
import TankGUI from './gui/tank_gui';
import PlayerInfoGUI from './gui/player_info_gui';
import FreeCameraController from './camera/free_camera_controller';
import CameraController from './camera/camera_controller';
import VirtualMovementJoystick from './gui/joysticks/virtual_movement_joystick';
import VirtualFireJoystick from './gui/joysticks/virtual_fire_joystick';
import FullscreenButton from './gui/full_screen_button';
import VirtualAimJoystick from './gui/joysticks/virtual_aim_joystick';
import VirtualAngleJoystick from './gui/joysticks/virtual_angle_joystick';
import { FireModeButton } from './gui/fire_mode_button';
import Stats from 'stats.js'
import { DestroyedTankEffect } from './effects/destroyed_tank_effect';
import { DestroyedCrateEffect } from './effects/destroyed_crate_effect';
import DamageIndicator from './gui/damage_indicator';
import PlayerRespawnButton from './gui/respawn_button';


export default class Game extends HeadlessGame {
    constructor(loader, options) {
        super(loader, options);

        this.isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        this.headless = false;
        this.playerTankId = options.playerTankId || 1;
        console.log('this.playerTankId',  this.playerTankId)
        this.firingMode = 'direct';
        this.isSinglePlayer = options.isSinglePlayer || false;
        this.mouse = new THREE.Vector2();
        this.aspectRatio = document.body.clientWidth / document.body.clientHeight;
        this.raycaster = new THREE.Raycaster();
        this.tankGUIs = this.tanks.map(tank => new TankGUI(tank));
        window.scene = this.scene;
        window.stats = new Stats()
        stats.showPanel(0)
        document.body.appendChild(stats.dom)
        if (this.isMobile) {
            this.virtualMovementJoystick = null;
            this.virtualFireJoystick = null;
            this.virtualAimJoystick = null;
            this.virtualAngleJoystick = null;
            this.virtualMovementJoystick = new VirtualMovementJoystick(this);
            this.virtualFireJoystick = new VirtualFireJoystick(this);
            this.virtualAimJoystick = new VirtualAimJoystick(this);
            this.virtualAngleJoystick = new VirtualAngleJoystick(this);
        }

        this.thresholdScreenArea = 1280*720;

        this.setupLights();

        //this.createGlobalAxisHelper();
        this.fireModeButton = new FireModeButton();
        this.respawnButton = new PlayerRespawnButton(this);
        this.respawnButton.setVisible(false);
        this.setupEventListeners();

        this.keysPressed = {};

        this.playerInfoGUI = new PlayerInfoGUI(this);

    
        this.trajectoryLine = new TrajectoryLine(this.scene, this.isMobile);
        this.trajectoryCurve = new TrajectoryCurve(this.scene, {color: 0xffffff, dashSize: 1});
        this.aimTrajectoryCurve = new TrajectoryCurve(this.scene, {color: 0xff0000});
        this.trajectoryCurve.setVisible(false);
        this.aimTrajectoryCurve.setVisible(false);
        this.aimTrajectoryCurveMissingColor = new THREE.Color(1, 0, 0);
        this.aimTrajectoryCurveHitColor = new THREE.Color(0, 1, 0);
        this.trajectoryLine.setVisible(this.isMobile);
        this.reticle = new Reticle(this.scene);
        this.fullScreenButton = new FullscreenButton();
        this.lastPlayerTank = null;
        
        this.fadingParticleSystems = [];
        this.destroyedEffects = [];
        this.damageIndicators = [];
        this.animate = this.animate.bind(this);
    }

    get playerTank() { 
        if (this.lastPlayerTank) return this.lastPlayerTank;
        this.lastPlayerTank = this.tanks.find((tank) => tank.id === this.playerTankId);
        return this.lastPlayerTank;
    }

    setupCameras() {
        this.playerCameraController = new CameraController(this.playerTank.mesh);
        this.freeCameraController = new FreeCameraController(this.scene, this.playerCameraController.getCamera(), this.renderer.domElement);
        this.cameraController = this.playerCameraController;
    }
    
    createGlobalAxisHelper() {
        const axisLength = 100; // Довжина осей
        const axisHelper = new THREE.Group();
    
        // X axis (red)
        const xGeometry = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(0, 0, 0),
            new THREE.Vector3(axisLength, 0, 0)
        ]);
        const xMaterial = new THREE.LineBasicMaterial({ color: 0xff0000 });
        const xAxis = new THREE.Line(xGeometry, xMaterial);
        axisHelper.add(xAxis);
    
        // Y axis (green)
        const yGeometry = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(0, 0, 0),
            new THREE.Vector3(0, axisLength, 0)
        ]);
        const yMaterial = new THREE.LineBasicMaterial({ color: 0x00ff00 });
        const yAxis = new THREE.Line(yGeometry, yMaterial);
        axisHelper.add(yAxis);
    
        // Z axis (blue)
        const zGeometry = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(0, 0, 0),
            new THREE.Vector3(0, 0, axisLength)
        ]);
        const zMaterial = new THREE.LineBasicMaterial({ color: 0x0000ff });
        const zAxis = new THREE.Line(zGeometry, zMaterial);
        axisHelper.add(zAxis);
    
        this.scene.add(axisHelper);
    }

    addDamageIndicator(indicator) {
        this.damageIndicators.push(indicator);
    }

    addDestroyedEffect(effect) {
        this.destroyedEffects.push(effect);
    }

    setupRenderer() {
        const area = document.body.clientWidth * document.body.clientHeight;
        const w = area <= this.thresholdScreenArea ? document.body.clientWidth * 2 : document.body.clientWidth;
        const h = area <= this.thresholdScreenArea ? document.body.clientHeight * 2 : document.body.clientHeight;
        this.canvas.style.transform = area <= this.thresholdScreenArea ? "translate(-25%,-25%) scale(0.5)" : "";
        this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true });
        this.renderer.setSize(w, h);
        this.renderer.shadowMap.enabled = true;
        // this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        // this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        // this.renderer.toneMappingExposure = 1.2;
        this.renderer.debug.checkShaderErrors = false;
    }

    setupLights() {
        // const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
        // this.scene.add(ambientLight);

        const hemiLight = new THREE.HemisphereLight( 0xffffff, 0x444444, 1 );
        this.scene.background = new THREE.Color( 0xa0a0a0 );
        this.scene.fog = new THREE.Fog( 0xa0a0a0, 200, 1000 );
        hemiLight.position.set( 0, 200, 0 );
        this.scene.add( hemiLight );

        const dirLight = new THREE.DirectionalLight( 0xffffff, 1 );
        dirLight.position.set( 0, 200, 100 );
        dirLight.castShadow = true;
        dirLight.shadow.camera.top = 180;
        dirLight.shadow.camera.bottom = - 100;
        dirLight.shadow.camera.left = - 120;
        dirLight.shadow.camera.right = 120;
        this.scene.add( dirLight );
    }

    onMouseMove(event) {
        if (this.isMobile) return;
        if (!this.renderer) return;
        // Оновлюємо позицію миші
        this.mouse.x = (event.clientX / document.body.clientWidth) * 2 - 1;
        this.mouse.y = -(event.clientY / document.body.clientHeight) * 2 + 1;

        // Створюємо промінь від камери через позицію миші
        this.raycaster.setFromCamera(this.mouse, this.cameraController.getCamera());

        // Знаходимо точку перетину з площиною
        const intersectionPoint = new THREE.Vector3();
        this.raycaster.ray.intersectPlane(this.plane, intersectionPoint);

        // Оновлюємо цільові кути для танка
        if (this.playerTank) {
            this.playerTank.setTargetAngles(intersectionPoint);
        }
        if (this.firingMode === 'indirect') {
            this.reticle.setPosition(intersectionPoint);
        }
    }

    updateTrajectoryLine() {
        const tank = this.playerTank;
        const tankPosition = tank.mesh.position.clone();
        tankPosition.y = 0.1;

        let targetPosition;
        if (this.firingMode === 'indirect') {
            targetPosition = this.reticle.mesh.position.clone();
        } else {
            // Для прямого режиму вогню, використовуємо напрямок дула танка
            const direction = new THREE.Vector3();
            tank.getShootDirection(direction);
            targetPosition = tankPosition.clone().add(direction.multiplyScalar(20)); // 20 - це приблизна відстань
        }
        if (tank.isIndirectFireMode) {
            if (this.aimTrajectoryCurve.visible !== tank.isAcceleratingShot) {
                this.aimTrajectoryCurve.setVisible(tank.isAcceleratingShot);
            }
            const targetPos = targetPosition.clone();
            const velocity = tank.calculateVelocity(targetPos);
            const trajectoryPoints = tank.calculateTrajectory(targetPos, velocity);
            this.trajectoryCurve.update(trajectoryPoints);
            if (tank.isAcceleratingShot) {
                    this.aimTrajectoryCurve.setColor(
                        Math.abs(tank.shotVelocity - velocity) <= .5 ? 
                        this.aimTrajectoryCurveHitColor :
                        this.aimTrajectoryCurveMissingColor
                    );
                const aimTrajectoryPoints = tank.calculateTrajectory(targetPos, tank.shotVelocity, false);
                this.aimTrajectoryCurve.update(aimTrajectoryPoints);
            }
        }
        
        // Перевіряємо перетин з ворожими танками
        const intersectsEnemy = this.isMobile ? 
            this.checkTrajectoryIntersection(tankPosition, targetPosition) : false;

        this.trajectoryLine.update(tankPosition, targetPosition, intersectsEnemy);
    }

    checkTrajectoryIntersection(start, end) {
        const direction = new THREE.Vector3().subVectors(end, start).normalize();
        const ray = new THREE.Ray(start, direction);

        for (let i = 1; i < this.tanks.length; i++) {  // Пропускаємо перший танк (гравця)
            if (!this.tanks[i].isDestroyed) {
                const tankBoundingBox = new THREE.Box3().setFromObject(this.tanks[i].mesh);
                if (ray.intersectsBox(tankBoundingBox)) {
                    return true;
                }
            }
        }

        return false;
    }

    setupEventListeners() {
        window.addEventListener('resize', this.onWindowResize.bind(this), false);
        window.addEventListener('keydown', this.onKeyDown.bind(this), false);
        window.addEventListener('keyup', this.onKeyUp.bind(this), false);

        if (this.isMobile) {
            this.virtualMovementJoystick.init();
            this.virtualMovementJoystick.setVisible(true);
            this.virtualAimJoystick.init();
            this.virtualAimJoystick.setVisible(false);
            this.virtualFireJoystick.init();
            this.virtualFireJoystick.setVisible(true);
            this.virtualAngleJoystick.init();
            this.virtualAngleJoystick.setVisible(false);
            this.fireModeButton.setVisible(true);
            this.fireModeButton.button.addEventListener('click', this.onModeChange.bind(this));
            this.respawnButton.data.element.addEventListener('click', () => this.respawnOwnTank(this.playerTank));
        } else {
            window.addEventListener('click', this.onMouseClick.bind(this));
            window.addEventListener('mousemove', this.onMouseMove.bind(this));
        }
    }

    toggleImmediateFireMode() {
        this.firingMode = this.firingMode === 'direct' ? 'indirect' : 'direct';
        
        const isIndirect = this.firingMode !== 'direct';
        this.playerTank.setIndirectFireMode(isIndirect);
        if (this.isMobile) {
            this.virtualMovementJoystick.setVisible(!isIndirect);
            this.virtualAimJoystick.setVisible(isIndirect);
            this.virtualFireJoystick.setVisible(!isIndirect);
            this.virtualAngleJoystick.setVisible(isIndirect);
            this.fireModeButton.toggleMode(isIndirect);
        }

        this.reticle.setVisible(isIndirect);
        this.trajectoryLine.setVisible(isIndirect);
        this.trajectoryCurve.setVisible(isIndirect);
        this.cameraController.setOffsetMode(isIndirect);
    }

    toggleFiringMode() {
        if (this.playerTank.isDestroyed || this.playerTank.isTransitioning) return;
        this.firingMode = this.firingMode === 'direct' ? 'indirect' : 'direct';
        
        const isIndirect = this.firingMode !== 'direct';
        this.playerTank.startTransition(isIndirect);
        if (this.isMobile) {
            this.virtualMovementJoystick.setVisible(!isIndirect);
            this.virtualAimJoystick.setVisible(isIndirect);
            this.virtualFireJoystick.setVisible(!isIndirect);
            this.virtualAngleJoystick.setVisible(isIndirect);
            this.fireModeButton.toggleMode(isIndirect);
        }

        this.reticle.setVisible(isIndirect);
        this.trajectoryLine.setVisible(isIndirect);
        this.trajectoryCurve.setVisible(isIndirect);
        this.cameraController.setOffsetMode(isIndirect);
    }

    onModeChange() {
        this.toggleFiringMode();
    }

    onMouseClick(event) {
        if (event.button === 0) { // Лівий клік
            this.toggleFiringMode();
        }
    }

    onWindowResize() {
        Promise.resolve().then(() => {
            const area = document.body.clientWidth * document.body.clientHeight;
            const w = area <= this.thresholdScreenArea ? document.body.clientWidth * 2 : document.body.clientWidth;
            const h = area <= this.thresholdScreenArea ? document.body.clientHeight * 2 : document.body.clientHeight;
            this.canvas.style.transform = area <= this.thresholdScreenArea ? "translate(-25%,-25%) scale(0.5)" : "";
            this.aspectRatio = document.body.clientWidth / document.body.clientHeight;
            this.cameraController.adaptToRatio(this.aspectRatio);
            this.renderer.setSize(w, h);
        })
    }

    onKeyDown(event) {
        this.keysPressed[event.code] = true;
    }

    onKeyUp(event) {
        if (this.keysPressed[event.code]) this.handleButtonRelease(event.code);
        this.keysPressed[event.code] = false;
    }

    handleButtonRelease(keyCode) {
        if (keyCode == 'Space') this.playerTank.shoot();
        if (keyCode == 'KeyW') this.playerTank.move(0);
        if (keyCode == 'KeyS') this.playerTank.move(0);
        if (keyCode == 'KeyA') this.playerTank.rotate(0);
        if (keyCode == 'KeyD') this.playerTank.rotate(0);
    }

    handleInput(deltaTime) {
        // Tank 1 controls
        if (this.keysPressed['KeyW']) this.playerTank.move(1);
        if (this.keysPressed['KeyS']) this.playerTank.move(-1);
        if (this.keysPressed['KeyA']) this.playerTank.rotate(-1);
        if (this.keysPressed['KeyD']) this.playerTank.rotate(1);
        if (this.keysPressed['KeyJ']) this.playerTank.rotateTurretLeft();
        if (this.keysPressed['KeyL']) this.playerTank.rotateTurretRight();
        if (this.keysPressed['Space']) this.playerTank.accelerateShotVelocity();
        if (this.playerTank.isDestroyed && this.keysPressed['Space']) {
            this.respawnOwnTank(this.playerTank);
        }
    }

    update() {
        const deltaTime = super.update();
        this.handleInput(deltaTime);

        this.tankGUIs.forEach(gui => gui.update(deltaTime));
        this.updateParticles(deltaTime);
        this.cameraController.update(deltaTime);
        this.updateTrajectoryLine(deltaTime);

        this.destroyedEffects = this.destroyedEffects.filter(effect => effect.update(deltaTime));
        this.damageIndicators = this.damageIndicators.filter(indicator => indicator.update(deltaTime));
        this.playerInfoGUI.update();
        if (this.isMobile) {
            this.virtualMovementJoystick.update(deltaTime);
            this.virtualFireJoystick.update(deltaTime);
            this.virtualAimJoystick.update(deltaTime);
            this.virtualAngleJoystick.update(deltaTime);
        }
        return deltaTime;
    }

    render() {
        this.renderer.render(this.scene, this.cameraController.getCamera());
    }

    animate() {
        stats.begin();
        this.update();
        this.render();
        stats.end();
        requestAnimationFrame(this.animate);
    }

    addProjectile(projectile) {
        this.projectiles.push(projectile);
        if (this.projectiles.length > this.maxProjectiles) {
            const oldestProjectile = this.projectiles.shift();
            oldestProjectile.remove();
            this.fadingParticleSystems.push(oldestProjectile.particleSystem);
        }
        projectile.game = this;
    }

    addFadingParticleSystem(particleSystem) {
        this.fadingParticleSystems.push(particleSystem);
    }

    updateParticles(deltaTime) {
        // Оновлення затухаючих систем частинок
        for (let i = this.fadingParticleSystems.length - 1; i >= 0; i--) {
            const particleSystem = this.fadingParticleSystems[i];
            if (particleSystem.isFadingOut) {
                particleSystem.update(deltaTime);
                if (particleSystem.fadeOutTimer >= particleSystem.fadeOutDuration) {
                    this.fadingParticleSystems.splice(i, 1);
                    particleSystem.remove();
                }
            }
        }
    }

    addFrag(owner) {
        super.addFrag(owner);
        this.playerInfoGUI.updateKills(owner);
    }

    onTankDeath(tank) {
        if (this.playerTank.id !== tank.id) return;
        if (this.firingMode === 'indirect') this.toggleImmediateFireMode();
        this.switchToFreeCamera();
        this.respawnButton.setVisible(true);
    }

    damageTank(damage, tank, radius, position, dealer) {
        const result = super.damageTank(damage, tank, radius, position, dealer);
        const damageIndicator = new DamageIndicator(this.scene, tank.mesh.position, damage);
        this.addDamageIndicator(damageIndicator);
        if (result) {
            if (dealer.id !== tank.id && !this.headless) this.addFrag(dealer);
            if (!this.headless) this.createDestroyedTankEffect(tank, position, radius);
        }
        return result;
    }

    damageCrate(innerPoint, deepPoint, radius, crate) {
        const vec = super.damageCrate(innerPoint, deepPoint, radius, crate);
        if (!this.headless && vec.w) this.createDestroyedCrateEffect(crate, vec.w, innerPoint, vec);
    }

    createDestroyedTankEffect(tank, position, radius) {
        const destroyedTankEffect = new DestroyedTankEffect(this.scene, tank, this.world, position, radius);
        this.addDestroyedEffect(destroyedTankEffect);
    }

    createDestroyedCrateEffect(crate, count, position, deepPosition) {
        const destroyedCrateEffect = new DestroyedCrateEffect(this.scene, crate, this.world, count, position, deepPosition);
        this.addDestroyedEffect(destroyedCrateEffect);
    }

    switchToFreeCamera() {
        this.freeCameraController.setEnabled(true);
        this.freeCameraController.setPosition(this.playerCameraController.camera.position, this.playerTank.mesh.position);
        this.cameraController = this.freeCameraController;
    }

    switchToPlayerCamera() {
        this.freeCameraController.setEnabled(false);
        this.cameraController = this.playerCameraController;
    }

    respawnOwnTank(tank) {
        if (this.isSinglePlayer) {
            this.respawnAndSwitchCamera(tank);
        } else {
            this.onAction({gameId: this.id}, {type: "respawn_tank", data: {id: tank.id}});
        }
    }

    respawnAndSwitchCamera(tank, position, rotation) {
        if (position) this.respawnTankInPosition(tank, position, rotation);
        else this.respawnTank(tank);
        if (tank === this.playerTank) { // Якщо це танк гравця
            this.switchToPlayerCamera();
            this.respawnButton.setVisible(false);
        }
    }

    start(canvas) {
        this.canvas = canvas;
        this.setupRenderer();
        this.setupCameras();
        this.animate();
    }
}