// free_camera_controller.js
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls';

export default class FreeCameraController {
    constructor(scene, camera, domElement) {
        this.scene = scene;
        this.camera = camera;
        
        this.controls = new OrbitControls(this.camera, domElement);
        this.controls.enabled = false;
    }

    setEnabled(value) {
        this.controls.enabled = value
    }

    setPosition(position, target) {
        this.camera.position.copy(position);
        this.controls.target.copy(target);
        this.controls.update();
    }

    getCameraPosition() {
        return this.camera.position;
    }

    adaptToRatio(ratio) {
        this.camera.aspect = ratio;
        this.camera.updateProjectionMatrix();
    }

    update(deltaTime) {
        this.controls.update();
    }

    getCamera() {
        return this.camera;
    }

    // Додаткові методи для налаштування OrbitControls
    enableDamping(value = true) {
        this.controls.enableDamping = value;
    }

    enableZoom(value = true) {
        this.controls.enableZoom = value;
    }

    enableRotate(value = true) {
        this.controls.enableRotate = value;
    }

    enablePan(value = true) {
        this.controls.enablePan = value;
    }

    setMinDistance(value) {
        this.controls.minDistance = value;
    }

    setMaxDistance(value) {
        this.controls.maxDistance = value;
    }
}