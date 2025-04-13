import * as THREE from 'three';

export default class CameraController {
    constructor(followMesh) {
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.followMesh = followMesh;
        this.cameraPosition = new THREE.Vector3();
        this.cameraLookAt = new THREE.Vector3();
        this.cameraOffset = new THREE.Vector3(0, 10, 15);
        this.closedLookAtOffset = new THREE.Vector3(0, -0.2, -1);
        this.farLookAtOffset = new THREE.Vector3(0, -2, -10);
        this.lookAtOffset = this.closedLookAtOffset;
        this.closedTargetCameraOffset = new THREE.Vector3(0, 10, 15);
        this.farTargetCameraOffset = new THREE.Vector3(0, 15, 20);
        this.targetCameraOffset = this.closedTargetCameraOffset;
    }

    getCamera() {
        return this.camera;
    }

    getCameraPosition() {
        return this.camera.position;
    }

    setOffsetMode(isFar) {
        if (isFar) {
            this.lookAtOffset = this.farLookAtOffset;
            this.targetCameraOffset = this.farTargetCameraOffset;
        } else {
            this.lookAtOffset = this.closedLookAtOffset;
            this.targetCameraOffset = this.closedTargetCameraOffset;
        }
    }

    adaptToRatio(ratio) {
        this.camera.aspect = ratio;
        this.camera.updateProjectionMatrix();
    }

    update(deltaTime) {
        const meshPosition = this.followMesh.position;
        const meshQuaternion = this.followMesh.quaternion;
    
        // Інтерполюємо cameraOffset до targetCameraOffset
        this.cameraOffset.lerp(this.targetCameraOffset, 0.1);
    
        // Обчислюємо бажану позицію камери
        const targetCameraPosition = new THREE.Vector3().copy(this.cameraOffset)
            .applyQuaternion(meshQuaternion)
            .add(meshPosition);
    
        // Інтерполюємо поточну позицію камери до цільової
        this.cameraPosition.lerp(targetCameraPosition, 0.1);
    
        // Встановлюємо позицію камери
        this.camera.position.copy(this.cameraPosition);
    
        // Обчислюємо точку, на яку повинна дивитися камера
        const lookAtOffset = this.lookAtOffset.clone();
        const forwardVector = lookAtOffset.normalize().applyQuaternion(meshQuaternion);
        const targetLookAt = new THREE.Vector3().copy(meshPosition).add(forwardVector.multiplyScalar(20));
    
        // Інтерполюємо поточну точку, на яку дивиться камера
        this.cameraLookAt.lerp(targetLookAt, 0.1);
    
        // Спрямовуємо камеру на інтерпольовану точку
        this.camera.lookAt(this.cameraLookAt);
    }
}
