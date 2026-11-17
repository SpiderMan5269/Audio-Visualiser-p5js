/**
 * Spectrum Visualiser
 * Displays a frequency spectrum as horizontal bars that pulse with bass energy.
 * Uses HSB color mode and creates a gradient effect with shadow and transparency.
 */
class Spectrum {
  constructor() {
    this.name = "Spectrum";           // Visualiser name for menu selection
    this.maxBars = 120;               // Maximum number of bars to display
    this.blur = 6;                    // Shadow blur amount for bar glow effect
    this.bassRange = 20;              // Frequency range considered for bass calculation
    this.smooth = 0.1;                // Smoothing factor for pulse animation
    this.prevPulse = 1;               // Previous pulse value for smooth interpolation
    this.is3D = false;                // 2D visualiser

    // Base color in HSB format (default values)
    this.baseColor = [230, 48, 85];

    /**
     * Sets colors from a color preset object.
     * Supports triple gradients and single HSB color presets.
     */
    this.setColorsFromPreset = function(preset) {
      if (preset.type === "single-hsb") {
        // Use HSB color directly for single-hsb presets
        this.baseColor = preset.color;
      } else if (preset.type === "triple") {
        // Convert RGB from outer gradient to HSB for triple presets
        let c = color(...preset.colors.outer[0]);
        colorMode(HSB);
        this.baseColor = [hue(c), saturation(c), brightness(c)];
      }
    };
  }

  /**
   * Main draw method for the Spectrum visualiser.
   * Renders horizontal bars representing frequency amplitudes with bass pulse effect.
   */
  draw() {
    push();
    // Use HSB color mode with alpha for gradient effects
    colorMode(HSB, 360, 100, 100, 100);
    // Semi-transparent background using preset color for trailing effect
    background(this.baseColor[0], this.baseColor[1], this.baseColor[2], 8);

    // Get frequency spectrum data from audio analysis
    const spectrum = fourier.analyze();

    // Calculate bass pulse effect based on low frequencies
    const bassValues = spectrum.slice(0, this.bassRange);
    const bassAvg = bassValues.reduce((s, v) => s + v, 0) / bassValues.length;
    const target = map(bassAvg, 0, 255, 1, 1.12);
    this.prevPulse = lerp(this.prevPulse, target, this.smooth);

    // Calculate step size for sampling the spectrum
    const step = max(1, floor(spectrum.length / this.maxBars));

    // Set shadow and stroke properties for bar glow effect
    drawingContext.shadowBlur = this.blur;
    drawingContext.shadowColor = color(this.baseColor[0], this.baseColor[1], this.baseColor[2], 50);
    strokeCap(ROUND);
    strokeWeight(6);

    // Draw spectrum bars
    let count = 0;
    for (let i = 0; i < spectrum.length && count < this.maxBars; i += step, count++) {
      const amp = spectrum[i];
      const y = map(count, 0, this.maxBars - 1, 0, height);
      const length = map(amp, 0, 255, 0, width) * this.prevPulse;
      const alphaVal = map(amp, 0, 255, 20, 90);
      stroke(this.baseColor[0], this.baseColor[1], this.baseColor[2], alphaVal);
      line(0, y, length, y);
    }
    pop();
  }
}

window.Spectrum = Spectrum;