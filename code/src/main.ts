import "./styles/style.css";
import { WebGPUEngine } from "./engine/WebGPUEngine";
import { ThreeJSApp } from "./engine/ThreeJSApp";


const app = new ThreeJSApp();
await app.init();