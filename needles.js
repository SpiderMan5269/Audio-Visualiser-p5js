/**
 * Needles Visualiser
 * Displays four audio frequency bands (bass, lowMid, highMid, treble) as animated needle dials.
 * Each dial shows real-time energy with a trailing effect and smooth needle movement.
 */
class Needles {
  constructor() {
    this.name = "Needles"; // Visualiser name for menu selection
    this.bins = ["bass", "lowMid", "highMid", "treble"]; // Frequency bands
    this.cols = 2;    // Number of columns in grid
    this.rows = 2;    // Number of rows in grid
    this.smooth = 0.12; // Smoothing factor for needle movement
    this.fade = 30;     // Background fade for trailing effect
    this.blur = 10;     // Shadow blur for needle
    this.ticks = 9;     // Number of tick marks per dial
    this.prev = this.bins.map(_ => 0); // Previous energy values for smoothing
    this.minA = PI + PI/10;            // Minimum angle for needle
    this.maxA = TWO_PI - PI/10;        // Maximum angle for needle
    this.onResize();                   // Initialize layout
    this.is3D = false;                 // 2D visualiser
  }

  /**
   * Calculates dial layout based on current canvas size.
   */
  onResize() {
    this.pad = width/25; // Padding between dials
    this.w = (width - this.pad*(this.cols+1))/this.cols;  // Dial width
    this.h = (height - this.pad*(this.rows+1))/this.rows; // Dial height
    this.dialR = min(this.w, this.h)*0.4; // Dial radius
  }

  /**
   * Main draw method for the Needles visualiser.
   * Renders dials, tick marks, labels, and animated needles.
   */
  draw() {
    // Fade background for trailing effect
    noStroke();
    fill(0, 0, 0, this.fade);
    rect(0, 0, width, height);

    push();
    colorMode(HSB,360,100,100,100);
    textAlign(CENTER,CENTER);
    strokeCap(ROUND);

    let idx=0;
    // Loop through each dial position in grid
    for (let r=0; r<this.rows; r++) for (let c=0; c<this.cols; c++,idx++) {
      const x0 = this.pad + c*(this.w+this.pad); // Top-left x of dial box
      const y0 = this.pad + r*(this.h+this.pad); // Top-left y of dial box
      const cx = x0+this.w/2, cy=y0+this.h-this.pad; // Center of dial

      // Draw dial background
      fill(220,20,20,15);
      rect(x0,y0,this.w,this.h,8);

      // Draw tick marks and label
      push(); translate(cx,cy);
      stroke(220,80,90,60); strokeWeight(1);
      for (let t=0; t<this.ticks; t++) {
        const a = lerp(this.minA,this.maxA,t/(this.ticks-1)); // Angle for tick
        const x1=this.dialR*cos(a), y1=this.dialR*sin(a);
        const x2=(this.dialR-7)*cos(a), y2=(this.dialR-7)*sin(a);
        line(x1,y1,x2,y2);
      }
      noStroke(); fill(0,0,100); text(this.bins[idx],0,-(this.dialR+15)); pop();

      // Get and smooth energy for this band
      const e = fourier.getEnergy(this.bins[idx]);
      this.prev[idx] = lerp(this.prev[idx],e,this.smooth);

      // Draw the needle
      push(); translate(cx,cy);
      drawingContext.shadowBlur=this.blur;
      drawingContext.shadowColor=color(0,0,100,50);
      stroke(0,0,100); strokeWeight(3);
      const ang = map(this.prev[idx],0,255,this.minA,this.maxA); // Needle angle
      line(0,0,this.dialR*cos(ang),this.dialR*sin(ang)); pop();
    }
    pop();
  }
}

// Register Needles class for lazy loading
window.Needles = Needles;