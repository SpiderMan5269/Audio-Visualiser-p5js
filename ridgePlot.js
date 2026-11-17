/**
 * RidgePlot Visualiser
 * Displays recent audio waveforms as layered ridges with color gradients.
 * Each ridge represents a past waveform, fading and scrolling upward for a dynamic effect.
 * Energy bars and labels for bass, mid, and treble are shown at the bottom.
 */
class RidgePlot {
  constructor() {
    this.name = "RidgePlot";         // Visualiser name for menu selection
    this.is3D = false;               // 2D visualiser
    this.waveforms = [];             // Stores recent waveforms for the ridges
    this.spacing = 20;               // Vertical spacing between ridges
    this.bottom = 120;               // Space at the bottom for labels/bars
    this.maxWaveforms = 30;          // Maximum number of ridges to display
  }

  /**
   * Main draw method for the RidgePlot visualiser.
   * Renders layered waveforms as ridges, with color and fading.
   * Draws energy bars and labels for bass, mid, and treble.
   */
  draw() {
    background(0); // Clear background

    // Get current waveform and energy values
    const wf = fourier.waveform();
    const b = fourier.getEnergy("bass"),
          m = fourier.getEnergy("mid"),
          t2 = fourier.getEnergy("treble");
    const avail = height - this.bottom; // Available vertical space

    // Add new waveform to the front of the array with color based on energy
    this.waveforms.unshift({
      p: [...wf],
      c: color(150 + b / 2, 180 + m / 2, 220 + t2 / 2),
      a: 255
    });

    // Remove oldest waveform if exceeding max
    if (this.waveforms.length > this.maxWaveforms) this.waveforms.pop();

    // Adjust bottom margin and max number of waveforms based on window size
    this.bottom = min(150, height * 0.2);
    this.maxWaveforms = floor((height - this.bottom) / this.spacing) - 5;
    this.waveforms = this.waveforms.slice(0, this.maxWaveforms);

    // Animate offset for smooth scrolling effect
    this.offset = (this.offset + 1 || 1) % this.spacing;

    push();
    translate(0, avail - this.offset); // Move to bottom of available area

    // Draw each waveform as a ridge
    for (let i = 0; i < this.waveforms.length; i++) {
      const wv = this.waveforms[i], yPos = -i * this.spacing;
      const wh = map(i, 0, this.waveforms.length, 30, 80), // Ridge height
            ww = width * 0.9;                              // Ridge width

      // Fade out older ridges
      wv.c.setAlpha(map(i, 0, this.waveforms.length, 255, 50));
      stroke(wv.c); noFill();
      strokeWeight(map(i, 0, this.waveforms.length, 1.5, 0.5));

      beginShape();
      // Draw waveform as a line
      for (let j = 0; j < wv.p.length; j += 2) {
        const x = map(j, 0, wv.p.length, 0, ww),
              y = wv.p[j] * wh + yPos;
        if (y >= -avail) vertex(width / 2 - ww / 2 + x, y);
      }
      endShape();

      // Draw connecting lines between ridges for a layered effect
      if (i < this.waveforms.length - 1) {
        const nw = this.waveforms[i + 1];
        stroke(100, 180, 255, wv.a * 0.5); strokeWeight(0.8);
        for (let j = 0; j < wv.p.length; j += 20) {
          const x1 = width / 2 - ww / 2 + map(j, 0, wv.p.length, 0, ww);
          const y1 = wv.p[j] * wh + yPos;
          if (y1 >= -avail) {
            const y2 = nw.p[min(j, nw.p.length - 1)] * wh + yPos - this.spacing;
            line(x1, y1, x1, y2);
          }
        }
      }
    }
    pop();

    // Draw band labels and energy bars at the bottom
    const indY = avail + 20;
    fill(150, 200, 255, 150); noStroke(); textSize(12); textAlign(CENTER);
    text("BASS", width * 0.2, indY);
    text("MID", width * 0.5, indY);
    text("TREBLE", width * 0.8, indY);

    const barY = indY + 5, barH = 8;
    fill(80, 200, 255, 200);   rect(width * 0.2 - 30, barY, b / 4, barH);    // Bass bar
    fill(180, 100, 255, 200);  rect(width * 0.5 - 30, barY, m / 4, barH);    // Mid bar
    fill(255, 100, 200, 200);  rect(width * 0.8 - 30, barY, t2 / 4, barH);   // Treble bar
  }
}

// Register RidgePlot class for lazy loading
window.RidgePlot = RidgePlot;