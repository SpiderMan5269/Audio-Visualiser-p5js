// Utility: Safely get the current color preset from the API or global
function _getCurrentPresetSafe() {
  if (typeof getCurrentColorPreset === "function") return getCurrentColorPreset();
  if (typeof window !== "undefined" && window.currentColorPreset) return window.currentColorPreset;
  return null;
}

// Set and persist the color preset by name
function setColorPresetAndPersist(name) {
  if (!name) return;
  if (typeof setColorPresetByName === "function") setColorPresetByName(name);
  else if (window.COLOR_PRESETS) window.currentColorPreset = window.COLOR_PRESETS.find(p => p.name === name) || null;

  // Save preset name to localStorage
  try { localStorage.setItem("colorPresetName", name); } catch (e) {}

  // Apply preset to all visuals for consistency
  try {
    const preset = (typeof getCurrentColorPreset === "function") ? getCurrentColorPreset() : (window.currentColorPreset || null);
    if (preset && typeof vis !== "undefined" && Array.isArray(vis.visuals)) {
      for (let v of vis.visuals) {
        if (v && typeof v.setColorsFromPreset === "function") {
          v.setColorsFromPreset(preset);
        }
      }
    }
  } catch (e) {}
}

// Apply the current preset to a visualizer instance
function applyPresetToVisualizerSafe(visInstance) {
  if (!visInstance) return;
  const preset = _getCurrentPresetSafe();
  if (!preset) return;

  if (typeof visInstance.setColorsFromPreset === "function") {
    try {
      visInstance.setColorsFromPreset(preset);
    } catch (e) {}
    return;
  }

  // Fallback for visuals without setColorsFromPreset
  try {
    if (preset.type === "single-hsb" && Array.isArray(preset.color) && typeof visInstance.baseColorHSB !== "undefined") {
      visInstance.baseColorHSB = preset.color.slice();
    } else if (preset.type === "triple" && preset.colors && preset.colors.outer && preset.colors.outer[0]) {
      if (typeof visInstance.baseColorRGB !== "undefined") {
        visInstance.baseColorRGB = preset.colors.outer[0].slice();
      }
    }
  } catch (e) {}
}

// Patch the selectVisual method to always apply the color preset after switching
function patchVisSelectVisual(vis) {
  if (!vis) return;

  if (typeof vis.selectVisual !== "function") {
    vis.selectVisual = function(nameOrObj) {
      if (!Array.isArray(this.visuals)) return;
      const found = this.visuals.find(v => v && (v.name === nameOrObj || v === nameOrObj));
      if (found) {
        this.selectedVisual = found;
        if (typeof this.selectedVisual.onInit === "function") {
          try { this.selectedVisual.onInit(); } catch (e) {}
        }
        applyPresetToVisualizerSafe(this.selectedVisual);
      }
    };
    return;
  }

  // Wrap the original selectVisual to apply the preset after switching
  const originalSelect = vis.selectVisual.bind(vis);
  vis.selectVisual = function(nameOrObj) {
    try {
      originalSelect(nameOrObj);
    } catch (e) {}
    try {
      if (this.selectedVisual) {
        applyPresetToVisualizerSafe(this.selectedVisual);
      } else if (Array.isArray(this.visuals)) {
        const found = this.visuals.find(v => v && (v.name === nameOrObj || v === nameOrObj));
        if (found) applyPresetToVisualizerSafe(found);
      }
    } catch (e) {}
  };
}

// Restore saved preset, patch selectVisual, and apply preset on startup
function initColorPersistence(vis) {
  // Restore preset from localStorage
  try {
    const saved = localStorage.getItem("colorPresetName");
    if (saved) {
      if (typeof setColorPresetByName === "function") {
        setColorPresetByName(saved);
      } else if (typeof window !== "undefined" && Array.isArray(window.COLOR_PRESETS)) {
        const found = window.COLOR_PRESETS.find(p => p && p.name === saved);
        if (found) window.currentColorPreset = found;
      }
    }
  } catch (e) {}

  // Patch selectVisual to re-apply preset after switching
  if (vis) patchVisSelectVisual(vis);

  // Apply preset to current visual on load
  try {
    if (vis && vis.selectedVisual) {
      applyPresetToVisualizerSafe(vis.selectedVisual);
    } else if (vis && Array.isArray(vis.visuals) && vis.visuals.length > 0) {
      applyPresetToVisualizerSafe(vis.visuals[0]);
    }
  } catch (e) {}

  // Patch handleMenuClick for color menu to persist preset selection
  if (typeof window !== "undefined" && window.controls && typeof window.controls.handleMenuClick === "function") {
    const controls = window.controls;
    if (!controls._colorPersistencePatched) {
      const origHandleMenuClick = controls.handleMenuClick.bind(controls);
      controls.handleMenuClick = function(list, callback, isTrack = false, isColor = false) {
        if (isColor && Array.isArray(list)) {
          const wrappedCallback = function(presetItem) {
            let presetName = null;
            if (typeof presetItem === "string") presetName = presetItem;
            else if (presetItem && presetItem.name) presetName = presetItem.name;
            if (presetName) {
              setColorPresetAndPersist(presetName);
            }
            try { if (typeof callback === "function") callback(presetItem); } catch (e) {}
            try { if (vis && vis.selectedVisual) applyPresetToVisualizerSafe(vis.selectedVisual); } catch (e) {}
          };
          return origHandleMenuClick(list, wrappedCallback, isTrack, isColor);
        }
        return origHandleMenuClick(list, callback, isTrack, isColor);
      };
      controls._colorPersistencePatched = true;
    }
  }

  // Patch setColorsFromPreset for all visuals to keep presets in sync
  function patchVisualSetColors(vis) {
    if (!vis || !Array.isArray(vis.visuals)) return;

    for (let i = 0; i < vis.visuals.length; i++) {
      const v = vis.visuals[i];
      if (!v || typeof v.setColorsFromPreset !== "function") continue;
      if (v._setColorsPatched) continue;

      const orig = v.setColorsFromPreset.bind(v);

      v.setColorsFromPreset = function(preset) {
        try {
          orig(preset);
        } catch (e) {}

        let presetName = null;
        if (preset && typeof preset === "object") {
          if (typeof preset.name === "string") {
            presetName = preset.name;
          } else {
            try {
              for (const known of (window.COLOR_PRESETS || [])) {
                if (JSON.stringify(known) === JSON.stringify(preset)) {
                  presetName = known.name;
                  break;
                }
              }
            } catch (e) {}
          }
        }

        try {
          if (presetName && typeof setColorPresetByName === "function") {
            setColorPresetByName(presetName);
            try { localStorage.setItem("colorPresetName", presetName); } catch (e) {}
          } else if (!presetName && typeof setColorPresetByName === "function" && preset && preset.name) {
            setColorPresetByName(preset.name);
          }
        } catch (e) {}

        try {
          const toApply = (presetName && typeof getCurrentColorPreset === "function")
            ? getCurrentColorPreset()
            : preset;
          if (typeof musicPlayer !== "undefined" && musicPlayer && typeof musicPlayer.setColorsFromPreset === "function") {
            musicPlayer.setColorsFromPreset(toApply);
          }
        } catch (e) {}
      };

      v._setColorsPatched = true;
    }
  }

  // Patch selectVisual to ensure setColorsFromPreset is patched and preset is applied
  function patchVisSelectVisualAndSetColors(vis) {
    if (!vis) return;
    if (typeof vis.selectVisual !== "function") return;

    if (!vis._selectVisualPatched) {
      const origSelect = vis.selectVisual.bind(vis);
      vis.selectVisual = function(nameOrObj) {
        try { origSelect(nameOrObj); }
        catch (e) {}

        try { patchVisualSetColors(this); } catch (e) {}

        try {
          const preset = (typeof getCurrentColorPreset === "function") ? getCurrentColorPreset() : (window.currentColorPreset || null);
          if (preset && this.selectedVisual && typeof this.selectedVisual.setColorsFromPreset === "function") {
            this.selectedVisual.setColorsFromPreset(preset);
          }
        } catch (e) {}
      };
      vis._selectVisualPatched = true;
    }

    patchVisualSetColors(vis);
  }

  // Call to enable color preset syncing across visuals and music player
  function initColorSync(vis) {
    try {
      patchVisSelectVisualAndSetColors(vis);
    } catch (e) {}
  }

  // Expose helpers globally
  if (typeof window !== "undefined") {
    window.applyPresetToVisualizerSafe = applyPresetToVisualizerSafe;
    window.initColorPersistence = initColorPersistence;
    window.setColorPresetAndPersist = setColorPresetAndPersist;
    window._getCurrentPresetSafe = _getCurrentPresetSafe;
    window.initColorSync = initColorSync;
    window.patchVisSelectVisual = patchVisSelectVisual;
    window.patchVisualSetColors = patchVisualSetColors;
  }
}