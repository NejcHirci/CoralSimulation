# Coral Competition Simulation
Source code for Coral Simulation project for the course Collective Behavior @ FRI 2023

Deployed implementation available at [Coral Simulation](https://nejchirci.github.io/CoralSimulation)

Authors:
- Nejc Hirci [Github](https://github.com/NejcHirci)

## Useful links

- [Report](./report/out/report.pdf)

## Project Idea

In my project I focused on implementing and optimizing a model of coral community dynamics described in the following research paper: [Frequent hydrodynamic disturbances decrease the morphological diversity and structural complexity of 3D simulated coral communities
](https://link.springer.com/article/10.1007/s00338-020-01947-1#Sec12) by Cresswell et. al.

They presented a coral-reef dynamics model focused on observing the influence of hydrodynamic disturbances on the coral communities. They simulate five different coral morphologies: encrusting, hemispherical, tabular, corymbose, and branching, with a three-dimensional cell grid. Light, shading, nutrient distribution, and hydrodynamic disturbances all influence the growth of each polyp. They simulated major ecological processes, like nutrient distribution according to light, growth, recruitment, and mortality of polyps, and hydrodynamic disturbances.

## Project Goals

Our goal was to reimplement and optimize their model in a web-based application with a user interface of important parameters, and the visualisation of important output indicators. We also wanted to improve their growth model, and use WebGPU compute shaders to speed up the simulation of the model. Additionally we integrated a sedimentation submodel, which was not included in the original paper.


## Plan of Work

I tracked my progress through the [Open Issues](https://github.com/NejcHirci/CoralSimulation/issues), which also include a detailed list of tasks that I planed to accomplish for each milestone. Each of the issues was assigned to Milestones (deadline) and accessible below:

[**1. Submission**](https://github.com/NejcHirci/CoralSimulation/milestone/1) | [Report Progress](https://github.com/NejcHirci/CoralSimulation/issues/1) | [Software Progress](https://github.com/NejcHirci/CoralSimulation/issues/2)

[**2. Submission**](https://github.com/NejcHirci/CoralSimulation/milestone/2) | [Report Progress](https://github.com/NejcHirci/CoralSimulation/issues/3) | [Software Progress](https://github.com/NejcHirci/CoralSimulation/issues/4)

[**3. Submission**](https://github.com/NejcHirci/CoralSimulation/milestone/3) | [Report Progress](https://github.com/NejcHirci/CoralSimulation/issues/5) | [Software Progress](https://github.com/NejcHirci/CoralSimulation/issues/6)


## Project Results

We managed to reimplement and significantly optimize the model, but decided against using WebGPU compute shaders, as they incur a lot of overhead, which worsens the performance of the simulation. We also successfully added the sedimentation submodel, where dead corals are transformed to barren rock gradually over time. We also added a user interface for the model parameters, and a visualisation of the model output. We also managed to improve the growth models of branching and corymbose corals, but did not manage to include a more complex accretive growth model, which we initially planned to do. Nevertheless, the space colonization algorithm of growth, considerably improved the visuals and variability of branching and corymbose corals.

## Installation

Web application is written in vanilla Typescript using [Vite](https://vitejs.dev/) as a bundler.

### Prerequisites

- [Node.js](https://nodejs.org/en/) (v20)

### Setup

```bash
cd code
npm install
```
### Run
```bash
npm run dev
```
You can open the application on [localhost:3000](http://localhost:4000/) or by pressing the `Open in Browser` button in the Vite console.
