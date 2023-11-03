export class Simulator {
	/**
	 * Creates the simulator holding all the coral reef simulation logic.
	 */

		constructor() {
			// TODO: Implement
		}

		// Implements the initialization of coral cover
		init() {}


		step() {
			this.SubInit();
			
			this.Grazing();

			this.Reproduction();
			this.Bleaching();
			this.Dislodgement();
			
			this.Growth();

			this.Sedimentation();

			this.AlgaeInvasion();

			this.EndStep();
		}

		/** This method just handles init in each step. */ 
		SubInit() {
			// Update display
			
			// Check if the simulation is ended

			// checkDisturbance <- thermal, hydodynamics, grazing pressure, order of events

			// Set Default Agent Parameters

			// Update Agent Colony size
		}

		/** Patches of agents are randomly selected and grazed 
		 * until a target proportion of the reef is reached. */
		Grazing() {
			// Update display

			// Fish eating based on rugosity

			// Circular clusters of agents are randomly grazed
		}

		/**
		 * Locally and regionally produced larvae attempt to settle.
		 */
		Reproduction() {
			// Update display

			// coral larvae total production -> locally and coming from regional pool

			// coral larvae settlement -> random agents to be converted into new coral recruits from
			//														barren ground, dead corral and crustose coralline algae
		}

		/**
		 * Thermal disturbance, if triggered causes colonies to bleach and/or die.
		 */
		Bleaching() {
			// all coral colonies selected and bleached according to a probability

			// agents of dying colony die

			// agents of a surviving bleached colony are converted to bleached agents

			// update agent colony size
		}

		/**
		 * Effect of waves and cyclones causes colonies to be dislodged and fragmented.
		 */
		Dislodgement() {
			// according to shape factor and cyclone intensity, colonies are dislodged

			// updated agent colony size
		}

		/**
		 * Each living agent, attempt to convert its neighbors within a certain radius.
		 */
		Growth() {
			// update display

			// each living agent attempt to convert its neighbors within a certain radius

			// coral colonies are smoothed by converting into barren ground
			// based on Von Neumann neighbor agents not from same colony
		}

		/**
		 * Barren ground agents  are converted to sand and vice versa until
		 * the desired sand cover is reached.
		 */
		Sedimentation() {
			// sand is added or removed by converting random barren ground
			// ends when desired sand cover is reached
		}

		/**
		 * Remaining ungrazed, barren-ground agents are converted to algae.
		 */ 
		AlgaeInvasion() {}

		/**
		 * The substrate composition is updated.
		 */
		EndStep() {
			// increment year

			// update Agent colony size
		}

}