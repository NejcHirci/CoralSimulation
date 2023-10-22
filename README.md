# Coral Competition Simulation
Source code for Coral Simulation project for the course Collective Behavior @ FRI 2023

Authors:
- Nejc Hirci [Github](https://github.com/NejcHirci)

## Project Idea

In my project I will be focusing on simulating coral community on the following research paper, a starting point: [Combining agent-based, trait-based and demographic approaches to model coral-community dynamics](https://doi.org/10.7554/eLife.55993) by Carturan et. al. Their paper presents a coral-reef dynamics model that encapsulates ecological processes at different spatial scales, also carefully including species’ functional diversity. Importantly: they calibrate and validate their model on observed empirical data from the Caribbean reefs.

While it may be one of the more advanced coral-community models, it uses a simple grid-cell agents model representing $1cm^2$ of the coral-reef, which is roughly adequate to be able to simulate polyp-level scale. Polyps are the building blocks of all coral organisms, but can be difficult to simulate accurately in a three dimensional space. I would like to extend their work by introducing a more complex coral-growth model that accounts for space competition in a 3D space both between polyps of the same and different coral communities. In order to speed up the simulation of the model, I will be implementing my solution in a web-based application that relies on [WebGPU](https://www.w3.org/TR/webgpu/) compute shaders to perform model simulation in real-time and offers users an intuitive interface to model the simulation parameters.

## Plan of Work

I plan to track my progress through the [Open Issues](https://github.com/NejcHirci/CoralSimulation/issues), which also include a detailed list of tasks that I plan to accomplish for each milestone. Each of the issues is assigned to Milestones (deadline) and accessible below:

[**1. Submission**](https://github.com/NejcHirci/CoralSimulation/milestone/1) | [**2. Submission**](https://github.com/NejcHirci/CoralSimulation/milestone/2) [**3. Submission**](https://github.com/NejcHirci/CoralSimulation/milestone/1)

## Installation

**TO BE ADDED.**
