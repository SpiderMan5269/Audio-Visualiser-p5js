/**
 * ControlsAndInput
 * Handles all UI menus, icons, and input for the audio visualiser.
 * Manages visualization, track, and color preset selection.
 */
class ControlsAndInput {
  constructor() {
    // Menu state
    this.menuOpen = false;
    this.trackMenuOpen = false;
    this.colorMenuOpen = false;
    // Menu layout
    this.menuWidth = 280;
    this.colorMenuWidth = 300;
    this.menuItemHeight = 50;
    this.is3D = false;
    // Color preset preview state
    this.previewingPresetName = null;
    this._originalAppliedPresetName = null;
  }

  // Toggle main visualisation menu
  toggleMenu() {
    this.menuOpen = !this.menuOpen;
    this.trackMenuOpen = false;
    this.colorMenuOpen = false;
  }

  // Toggle track selection menu
  toggleTrackMenu() {
    this.trackMenuOpen = !this.trackMenuOpen;
    this.menuOpen = false;
    this.colorMenuOpen = false;
  }

  // Toggle color preset menu and handle preview/restore logic
  toggleColorMenu() {
    this.colorMenuOpen = !this.colorMenuOpen;
    this.menuOpen = false;
    this.trackMenuOpen = false;
    if (this.colorMenuOpen) {
      this.previewingPresetName = null;
      const cur =
        typeof getCurrentColorPreset === "function"
          ? getCurrentColorPreset()
          : window.currentColorPreset || null;
      this._originalAppliedPresetName = cur ? cur.name : null;
    } else {
      // Restore the saved preset when closing the menu
      const cur =
        typeof getCurrentColorPreset === "function"
          ? getCurrentColorPreset()
          : window.currentColorPreset || null;
      if (cur) {
        if (
          vis &&
          vis.selectedVisual &&
          typeof vis.selectedVisual.setColorsFromPreset === "function"
        ) {
          vis.selectedVisual.setColorsFromPreset(cur);
        }
      }
      this.previewingPresetName = null;
    }
  }

  // Returns true if the color preset icon should be visible
  colorIconVisible() {
    return (
      typeof vis !== "undefined" &&
      vis &&
      vis.selectedVisual &&
      typeof vis.selectedVisual.setColorsFromPreset === "function"
    );
  }

  /**
   * Handles mouse clicks for all menus and color preset selection.
   * Returns true if the click was handled by the UI.
   */
  mousePressed() {
    // Delegate to music player if visible
    if (
      musicPlayer &&
      musicPlayer.visible &&
      typeof musicPlayer.mousePressed === "function" &&
      musicPlayer.mousePressed()
    )
      return true;
    // Hamburger menu icon
    if (this.hamburgerHitCheck()) {
      this.toggleMenu();
      return true;
    }
    // Track menu icon
    if (this.trackMenuIconHitCheck()) {
      this.toggleTrackMenu();
      return true;
    }
    // Color preset icon
    if (this.colorIconVisible() && this.colorMenuIconHitCheck()) {
      this.toggleColorMenu();
      return true;
    }

    // Main visualisation menu
    if (
      this.menuOpen &&
      this.handleMenuClick(
        getAvailableVisualNames(),
        async (name) => {
          await selectVisualByName(name);
        },
        false,
        false
      )
    )
      return true;
    // Track selection menu
    if (
      this.trackMenuOpen &&
      this.handleMenuClick(
        musicPlayer.trackNames,
        (name) => {},
        true
      )
    )
      return true;

    // Color preset menu
    if (this.colorMenuOpen) {
      const startY = 100;
      const menuX = width - this.colorMenuWidth;
      const menuW = this.colorMenuWidth;
      const presets = typeof COLOR_PRESETS !== "undefined" ? COLOR_PRESETS : [];
      // Check for color preset selection
      for (let i = 0; i < presets.length; i++) {
        const yPos = startY + i * this.menuItemHeight;
        if (
          mouseX > menuX + 10 &&
          mouseX < menuX + menuW - 10 &&
          mouseY > yPos &&
          mouseY < yPos + this.menuItemHeight
        ) {
          const presetObj = presets[i];
          if (!presetObj) return true;
          // Apply and persist color preset
          if (typeof setColorPresetByName === "function")
            setColorPresetByName(presetObj.name);
          try {
            localStorage.setItem("colorPresetName", presetObj.name);
          } catch (e) {}
          // Apply to visuals
          if (this.applyToAllVisualizers && vis && Array.isArray(vis.visuals)) {
            for (let vv of vis.visuals) {
              if (vv && typeof vv.setColorsFromPreset === "function")
                vv.setColorsFromPreset(getCurrentColorPreset());
            }
          } else if (
            vis &&
            vis.selectedVisual &&
            typeof vis.selectedVisual.setColorsFromPreset === "function"
          ) {
            vis.selectedVisual.setColorsFromPreset(getCurrentColorPreset());
          }
          // Apply to music player if enabled
          if (
            this.applyToMusicPlayer &&
            typeof musicPlayer !== "undefined" &&
            musicPlayer &&
            typeof musicPlayer.setColorsFromPreset === "function"
          ) {
            musicPlayer.setColorsFromPreset(getCurrentColorPreset());
          }
          this.colorMenuOpen = false;
          return true;
        }
      }

      // Close menu if clicked outside
      if (
        !(
          mouseX > menuX &&
          mouseX < menuX + menuW &&
          mouseY > 0 &&
          mouseY < height
        )
      ) {
        this.colorMenuOpen = false;
        return true;
      }

      return false;
    }

    return false;
  }

  // Handles mouse release events (not used)
  mouseReleased() {}

  // Handles mouse drag events (not used)
  mouseDragged() {
    return false;
  }

  // Handles mouse wheel events (not used)
  mouseWheel(event) {
    return false;
  }

  /**
   * Handles menu item selection for visualisation, track, and color menus.
   * Returns true if a menu item was selected or menu was closed.
   */
  handleMenuClick(list, callback, isTrack = false, isColor = false) {
    const startY = 100;
    for (let i = 0; i < list.length; i++) {
      const yPos = startY + i * this.menuItemHeight;
      const inX = isTrack
        ? mouseX > width - this.menuWidth
        : mouseX < this.menuWidth;
      if (mouseY > yPos && mouseY < yPos + this.menuItemHeight && inX) {
        if (isTrack) {
          currentTrackIndex = i;
          sound.stop();
          sound = sounds[currentTrackIndex];
          sound.loop();
          this.trackMenuOpen = false;
        } else {
          callback(list[i]);
          this.menuOpen = false;
        }
        return true;
      }
    }
    if (this.clickedOutsideMenu(list.length, isTrack, isColor)) {
      isTrack ? (this.trackMenuOpen = false) : (this.menuOpen = false);
      return true;
    }
    return false;
  }

  /**
   * Returns true if the mouse click was outside the menu area.
   */
  clickedOutsideMenu(count, isTrack, isColor = false) {
    const startY = 100;
    let outX;
    if (isTrack) {
      outX = mouseX < width - this.menuWidth;
    } else if (isColor) {
      outX = mouseX < width - this.colorMenuWidth || mouseX > width;
      if (mouseY < startY || mouseY > startY + count * this.menuItemHeight)
        outX = true;
    } else {
      outX = mouseX > this.menuWidth;
    }
    return (
      outX || mouseY < 100 || mouseY > startY + count * this.menuItemHeight
    );
  }

  /**
   * Draws all menu icons and open menus.
   */
  draw() {
    push();
    // Draw UI in RGB mode to avoid color mode conflicts
    colorMode(RGB, 255);
    this.drawMenuIcons();
    if (this.menuOpen)
      this.drawSideMenu(
        "VISUALIZATIONS",
        getAvailableVisualNames(),
        vis.selectedVisual ? vis.selectedVisual.name : null
      );
    if (this.trackMenuOpen)
      this.drawSideMenu(
        "TRACK SELECTION",
        musicPlayer.trackNames,
        musicPlayer.trackNames[currentTrackIndex],
        true
      );
    if (this.colorMenuOpen)
      this.drawSideMenu(
        "COLOR PRESETS",
        COLOR_PRESETS.map((p) => p.name),
        getCurrentColorPreset()
          ? getCurrentColorPreset().name
          : COLOR_PRESETS[0] && COLOR_PRESETS[0].name,
        false,
        true
      );
    pop();
  }

  // Draws the three main menu icons (hamburger, track, color)
  drawMenuIcons() {
    this.drawCircleIcon(30, 30, "hamburger");
    this.drawCircleIcon(width - 30, 30, "track");
    if (this.colorIconVisible()) {
      this.drawCircleIcon(width - 30, 70, "color");
    }
  }

  /**
   * Draws a circular icon for menu, track, or color selection.
   */
  drawCircleIcon(x, y, type) {
    const size = 30;
    const highlight = dist(mouseX, mouseY, x, y) < size / 2;
    push();
    translate(x, y);
    scale(highlight ? 1.1 : 1);
    fill(highlight ? "rgba(100, 200, 255, 0.7)" : "rgba(80, 150, 200, 0.4)");
    noStroke();
    ellipse(0, 0, size, size);

    if (type === "hamburger") {
      fill(240);
      rect(-8, -6, 16, 2, 1);
      rect(-8, 0, 16, 2, 1);
      rect(-8, 6, 16, 2, 1);
    } else if (type === "track") {
      fill(255);
      stroke(255);
      strokeWeight(2);
      push();
      translate(-4, 6);
      rotate(radians(-20));
      ellipse(0, 0, 7, 5);
      pop();
      line(-1, 6, -1, -6);
      noFill();
      beginShape();
      vertex(-1, -6);
      quadraticVertex(5, -10, 3, -2);
      endShape();
    } else if (type === "color") {
      fill(255);
      noStroke();
      ellipse(0, 0, 16, 16);
      fill(200, 80, 200);
      ellipse(0, 0, 12, 12);
    }
    pop();
  }

  /**
   * Draws a side menu for visualisation, track, or color preset selection.
   */
  drawSideMenu(title, list, selected, isTrack = false, isColor = false) {
    push();
    const menuX = isTrack
      ? width - this.menuWidth
      : isColor
      ? width - this.colorMenuWidth
      : 0;

    const menuW = isColor ? this.colorMenuWidth : this.menuWidth;

    fill(20, 25, 35, 230);
    stroke(80, 150, 200, 150);
    strokeWeight(1);
    rect(menuX, 0, menuW, height);

    fill(100, 220, 255);
    textAlign(CENTER, CENTER);
    textSize(24);
    text(title, menuX + menuW / 2, 60);

    const startY = 100;

    // Draw menu items for visualisation or track selection
    if (!isColor) {
      for (let i = 0; i < list.length; i++) {
        const yPos = startY + i * this.menuItemHeight;
        const isSelected =
          list[i] === selected || (list[i].name && list[i].name === selected);
        if (isSelected) {
          fill(80, 150, 200, 120);
        } else if (mouseY > yPos && mouseY < yPos + this.menuItemHeight) {
          fill(60, 100, 150, 80);
        } else {
          fill(40, 60, 80, 60);
        }
        noStroke();
        const rectX = menuX + 10;
        rect(rectX, yPos, menuW - 20, this.menuItemHeight - 10, 8);

        fill(isSelected ? 255 : 200);
        textSize(18);
        textAlign(CENTER, CENTER);
        const label = isTrack
          ? list[i]
          : typeof list[i] === "string"
          ? list[i]
          : list[i] && list[i].name
          ? list[i].name
          : "";

        text(label, menuX + menuW / 2, yPos + this.menuItemHeight / 2 - 5);
      }
    } else {
      // Draw color preset menu items with swatches
      for (let i = 0; i < list.length; i++) {
        const yPos = startY + i * this.menuItemHeight;
        const isSelected = list[i] === selected;
        if (isSelected) {
          fill(80, 150, 200, 120);
        } else if (mouseY > yPos && mouseY < yPos + this.menuItemHeight) {
          fill(60, 100, 150, 80);
        } else {
          fill(40, 60, 80, 60);
        }
        noStroke();
        const rectX = menuX + 10;
        rect(rectX, yPos, menuW - 20, this.menuItemHeight - 10, 8);

        // Draw color swatch box
        const swX = rectX + 8;
        const swY = yPos + 7;
        const swSize = this.menuItemHeight - 24;
        const presetObj = typeof COLOR_PRESETS !== "undefined" ? COLOR_PRESETS[i] : null;
        if (presetObj) {
          if (
            presetObj.type === "single-hsb" &&
            Array.isArray(presetObj.color) &&
            presetObj.color.length === 3
          ) {
            colorMode(HSB, 360, 100, 100);
            fill(presetObj.color[0], presetObj.color[1], presetObj.color[2]);
            rect(swX, swY, swSize, swSize, 4);
            colorMode(RGB, 255);
          } else if (
            presetObj.type === "triple" &&
            presetObj.colors &&
            presetObj.colors.outer &&
            presetObj.colors.inner &&
            presetObj.colors.outer[0] &&
            presetObj.colors.inner[0]
          ) {
            const c1 = color(
              presetObj.colors.outer[0][0],
              presetObj.colors.outer[0][1],
              presetObj.colors.outer[0][2]
            );
            const c2 = color(
              presetObj.colors.inner[0][0],
              presetObj.colors.inner[0][1],
              presetObj.colors.inner[0][2]
            );
            const g = createGraphics(swSize, swSize);
            g.noStroke();
            for (let x = 0; x < swSize; x++) {
              const t = x / (swSize - 1);
              g.stroke(g.lerpColor(c1, c2, t));
              g.line(x, 0, x, swSize);
            }
            image(g, swX, swY);
          }
        }

        fill(isSelected ? 255 : 200);
        textSize(16);
        textAlign(LEFT, CENTER);
        const labelX = swX + swSize + 12;
        text(list[i], labelX, yPos + this.menuItemHeight / 2 - 5);

        // Preview color preset on hover
        if (
          mouseX > rectX &&
          mouseX < rectX + menuW - 20 &&
          mouseY > yPos &&
          mouseY < yPos + this.menuItemHeight
        ) {
          const hoverPreset = typeof COLOR_PRESETS !== "undefined" ? COLOR_PRESETS[i] : null;
          if (
            hoverPreset &&
            this.previewingPresetName !== hoverPreset.name &&
            vis &&
            vis.selectedVisual &&
            typeof vis.selectedVisual.setColorsFromPreset === "function"
          ) {
            this.previewingPresetName = hoverPreset.name;
            vis.selectedVisual.setColorsFromPreset(hoverPreset);
          }
        }
      }
    }

    fill(150, 200, 230);
    textSize(14);
    textAlign(CENTER);
    text("Click outside to close", menuX + menuW / 2, height - 30);
    pop();
  }

  // Checks if mouse is over the hamburger menu icon
  hamburgerHitCheck() {
    return dist(mouseX, mouseY, 30, 30) < 15;
  }

  // Checks if mouse is over the track menu icon
  trackMenuIconHitCheck() {
    return dist(mouseX, mouseY, width - 30, 30) < 15;
  }

  // Checks if mouse is over the color menu icon
  colorMenuIconHitCheck() {
    return dist(mouseX, mouseY, width - 30, 70) < 15;
  }

  /**
   * Handles keyboard shortcuts for menu and player controls.
   * M: menu, T: track, C: color, Space: play/pause
   */
  keyPressed(keycode) {
    if (keycode === 77) return this.toggleMenu(), true; // M
    if (keycode === 84) return this.toggleTrackMenu(), true; // T
    if (keycode === 67 && this.colorIconVisible())
      return this.toggleColorMenu(), true; // C
    if (
      keycode === 32 &&
      typeof musicPlayer !== "undefined" &&
      musicPlayer &&
      typeof musicPlayer.togglePlayPause === "function"
    ) {
      musicPlayer.togglePlayPause();
      return true;
    }
    return false;
  }
}
