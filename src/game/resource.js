import crossSrc from '../../assets/models/cross.obj';
import redCrateBoxSrc from '../../assets/models/red_crate.obj';
import grassSrc from '../../assets/textures/grass.jpg';

import brickSrc from '../../assets/textures/brick.png';
import redCrateSrc from '../../assets/textures/red_crate.png';
import redCrateNormalSrc from '../../assets/textures/red_crate_normal.png';
import metalSrc from '../../assets/textures/metal.jpg';
import metalNormalSrc from '../../assets/textures/metal_normal.png';
import metalMetallicSrc from '../../assets/textures/metal_metallic.jpg';
import metalRoughnessSrc from '../../assets/textures/metal_roughness.jpg';
import metalAoSrc from '../../assets/textures/metal_ao.jpg';

import crateSrc from '../../assets/textures/crate/metal.jpg';
import crateNormalSrc from '../../assets/textures/crate/metal_normal.png';
import crateMetallicSrc from '../../assets/textures/crate/metal_metallic.jpg';
import crateRoughnessSrc from '../../assets/textures/crate/metal_roughness.jpg';
import crateAoSrc from '../../assets/textures/crate/metal_ao.jpg';

import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';
import * as THREE from 'three';
export class ResourceLoader {
    _models = {
        "cross": crossSrc,
        "red_crate": redCrateBoxSrc,
    };
    _textures = {
        "grass": grassSrc,
        "brick": brickSrc,
        "red_crate": redCrateSrc,
        "red_crate_normal": redCrateNormalSrc,
        "crate": crateSrc,
        "crate_normal": crateNormalSrc,
        "crate_metallic": crateMetallicSrc,
        "crate_roughness": crateRoughnessSrc,
        "crate_ao": crateAoSrc,
        "metal": metalSrc,
        "metal_normal": metalNormalSrc,
        "metal_metallic": metalMetallicSrc,
        "metal_roughness": metalRoughnessSrc,
        "metal_ao": metalAoSrc,
    };
    models = {};
    textures = {};
    preload() {
        return new Promise((resolve) => {
            const textureLoader = new THREE.TextureLoader();
            const loader = new OBJLoader();
            Object.entries(this._models).map(([id, src]) => {
                loader.load(src, (model) => {
                    this.models[id] = model; 
                })
            })
            Object.entries(this._textures).map(([id, src]) => {
                textureLoader.load(src, (model) => {
                    this.textures[id] = model; 
                })
            })
            THREE.DefaultLoadingManager.onLoad = resolve;
        })
    }

    getModel(id) {
        return this.models[id]
    }

    getTexture(id) {
        return this.textures[id]
    }
}
