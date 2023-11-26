
import * as THREE from 'three';

import WebGPU from 'three/examples/jsm/capabilities/WebGPU.js';
import WebGPURenderer from 'three/examples/jsm/renderers/webgpu/WebGPURenderer';

import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

import { CellularAutomata } from '../components/CellularAutomata';

export class ThreeJSApp {

    // Canvas
    renderer! : WebGPURenderer;

    // Three.js objects
    scene! : THREE.Scene;
    camera! : THREE.PerspectiveCamera;
    clock! : THREE.Clock;
    models! : THREE.Group;

    // Controls
    rotate = true;
    rotateSpeed = 0.1;

    // Cellular Automata
    automata!: CellularAutomata;

    constructor() {
        this.automata = new CellularAutomata(8);
    }

    async init() {
        console.log('Initializing Three JS App');
        if (WebGPU.isAvailable() === false) {
            throw new Error('WebGPU not supported');
        }
        // Init Renderer
        this.renderer = new WebGPURenderer({antialias: true});
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setAnimationLoop(this.render.bind(this));
        this.renderer.toneMapping = THREE.LinearToneMapping;
        this.renderer.toneMappingExposure = 1.0;
        document.body.appendChild(this.renderer.domElement);

        // Init clock
        this.clock = new THREE.Clock();

        // Init Scene
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x000000);

        // Init camera
        const aspect = window.innerWidth / window.innerHeight;
        this.camera = new THREE.PerspectiveCamera(75, aspect, 0.01, 100);
        this.camera.position.set(0, 5, 10);
        this.camera.lookAt(0, 0, 0);

        // Init lights
        const light = new THREE.SpotLight(0xffffff, 1);
        light.power = 2000;
        this.camera.add(light);
        this.scene.add(this.camera);

        // Init controls
        const controls = new OrbitControls(this.camera, this.renderer.domElement);
        controls.target.set(0, 1, 0);
        controls.addEventListener('start', () => this.rotate = false);
        controls.addEventListener('end', () => this.rotate = true);
        controls.update();

        // Resize
        window.addEventListener('resize', this.onResize.bind(this), false);

        // Init scene models
        this.models = new THREE.Group();
        this.scene.add(this.models);
        this.models.add(this.automata.getGrid());
        console.log('Three JS App initialized');
    }

    render() {
        const delta = this.clock.getDelta();
        if (this.rotate) {
            this.models.rotateY(delta * this.rotateSpeed);
        }
        this.automata.update();
        this.renderer.render(this.scene, this.camera);
    }

    onResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

}