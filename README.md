# Coral Competition Simulation
Source code for Coral Simulation project for the course Collective Behavior @ FRI 2023

Authors:
- Nejc Hirci [Github](https://github.com/NejcHirci)

## Project Idea

In my project I will be focusing on simulating coral community on the following research paper, a starting point: [Combining agent-based, trait-based and demographic approaches to model coral-community dynamics](https://doi.org/10.7554/eLife.55993) by Carturan et. al. Their paper presents a coral-reef dynamics model that encapsulates ecological processes at different spatial scales, also carefully including species’ functional diversity. They model a number of natural processes in coral-reefs like competition growth, bleaching, grazing, algae invasions, sedimentation and others. Importantly: they calibrate and validate their model on observed empirical data from the Caribbean reefs and show that it exhibits realistic dynamics between coral communities with ecologically plausible dynamics of individual populations.

While it may be one of the more advanced coral-community models, it uses a simple grid-cell agents model representing $1cm^2$ of the coral-reef, which is roughly adequate to be able to simulate polyp-level scale. Polyps are the building blocks of all coral organisms, but can be difficult to simulate accurately in a three dimensional space. I would like to extend their work by introducing a more complex coral-growth model that accounts for space competition in a 3D space both between polyps of the same and different coral communities. In order to speed up the simulation of the model, I will be implementing my solution in a web-based application that relies on [WebGPU](https://www.w3.org/TR/webgpu/) compute shaders to perform model simulation in real-time and offers users an intuitive interface to model the simulation parameters.

## Plan of Work

I plan to track my progress through the [Open Issues](https://github.com/NejcHirci/CoralSimulation/issues), which also include a detailed list of tasks that I plan to accomplish for each milestone. Each of the issues is assigned to Milestones (deadline) and accessible below:

[**1. Submission**](https://github.com/NejcHirci/CoralSimulation/milestone/1) | [Report Progress](https://github.com/NejcHirci/CoralSimulation/issues/1) | [Software Progress](https://github.com/NejcHirci/CoralSimulation/issues/2) 

[**2. Submission**](https://github.com/NejcHirci/CoralSimulation/milestone/2) | [Report Progress](https://github.com/NejcHirci/CoralSimulation/issues/3) | [Software Progress](https://github.com/NejcHirci/CoralSimulation/issues/4) 

[**3. Submission**](https://github.com/NejcHirci/CoralSimulation/milestone/3) | [Report Progress](https://github.com/NejcHirci/CoralSimulation/issues/5) | [Software Progress](https://github.com/NejcHirci/CoralSimulation/issues/6) 

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
You can open the application on [localhost:3000](http://localhost:3000/) or by pressing the `Open in Browser` button in the Vite console.