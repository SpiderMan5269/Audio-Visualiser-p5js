/**
 * Visualisations Manager
 * Handles registration, selection, and management of all visualiser modes.
 * Allows adding new visualisers and switching between them by name.
 */
class Visualisations {
  constructor() {
    this.visuals = [];          // Array to hold all visualisation objects
    this.selectedVisual = null; // Currently selected visualisation
    this.is3D = false;          // True if current visual is 3D (WEBGL)
  }

  /**
   * Add a new visualisation to the list.
   * If no visualisation is selected yet, select the first one added.
   * @param {object} visual - Visualiser instance to add
   */
  add(visual) {
    this.visuals.push(visual);
    if (!this.selectedVisual) {
      this.selectVisual(visual.name);
    }
  }

  /**
   * Select a visualisation by its name.
   * Sets selectedVisual to the matching visualiser.
   * @param {string} name - Name of the visualiser to select
   */
  selectVisual(name) {
    const match = this.visuals.find(v => v.name === name);
    if (match) this.selectedVisual = match;
  }
}