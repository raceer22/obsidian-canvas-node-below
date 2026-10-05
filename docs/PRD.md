# Product Requirements Document (PRD): Canvas Add Node Below

## 1. Overview

A lightweight, zero-build Obsidian community plugin (`canvas-node-below`) enabling high-speed list brainstorming directly on an Obsidian Canvas. Pressing `Mod-Enter` (or a custom shortcut) appends a new text card directly underneath the current card, cleanly aligned on the left edge, and instantly shifts keyboard focus into the new node's editor.

---

## 2. Goals & Key Objectives

* **Sub-Hour Implementation**: Deliverable as a standalone `main.js` and `manifest.json` requiring zero compilation tooling or npm build steps.
* **Frictionless Brainstorming**: Enable uninterrupted typing across sequential cards without requiring mouse movement or edge-dragging.
* **Minimalist Architecture**: Keep the codebase lean (<60 lines) by interacting directly with the runtime Canvas API and Obsidian command system.

---

## 3. User Experience & Hotkey Flow

### Hotkey Interaction

* **Command ID**: `canvas-node-below:add-node-below`
* **Command Name**: `Canvas: Add node below`
* **Default Hotkey**: `Mod-Enter` (`Cmd-Enter` on macOS / `Ctrl-Enter` on Windows & Linux).
* **Scope Guard**: Registered via `checkCallback`. The command only executes when the active workspace leaf is a `canvas` view.

### Cursor & Selection Mechanics

1. **Trigger from Active Editor**: When editing markdown inside a canvas node, triggering the shortcut commits/exits the current editor session, creates a new note directly below, clears previous selections, and initiates edit mode in the newly created card.
2. **Trigger from Node Selection**: If a node is selected (but not actively in edit mode), the plugin appends the new node below it and immediately focuses the new card's editor.
3. **Trigger on Blank / Root Canvas**: If no node is focused or selected, the initial node spawns at the viewport center coordinates and opens for editing immediately.

---

## 4. Geometric & Layout Specifications

* **Default Node Dimensions**: Use Canvas's native default width and height unless overridden in plugin settings.
* **Horizontal Alignment**: Left edges align precisely ($X_{new} = X_{current}$).
* **Vertical Positioning**: Placed with a default $40\text{px}$ gap (configurable as vertical padding) directly beneath the current card's lower boundary:

$$Y_{new} = Y_{current} + \text{height}_{current} + \text{padding}$$


* **Collision Policy**: Pure append (no downstream reflow/push-down). Nodes are dropped directly at the calculated coordinate regardless of existing elements.
* **Initial Node Content**: Blank (`""`).
* **Camera Adjustment**: Auto-pan/focus to the newly created node using Canvas's native pan framing to prevent off-screen cursor drops during rapid creation runs.

---

## 5. Technical Implementation Details

### File Structure

```text
<Vault>/.obsidian/plugins/canvas-node-below/
├── manifest.json
└── main.js
```

### Plugin Settings

The plugin settings tab exposes numeric controls for vertical padding (default `40px`), default node width (default `0`), and default node height (default `0`). Changes are persisted across reloads. Padding may be zero; width and height may be zero, which leaves that dimension to Canvas's native default sizing.

### `manifest.json`

```json
{
  "id": "canvas-node-below",
  "name": "Canvas Add Node Below",
  "version": "1.0.0",
  "minAppVersion": "1.1.0",
  "description": "Rapidly append and focus cards downward in Obsidian Canvas using a hotkey.",
  "author": "Obsidian User",
  "isDesktopOnly": false
}

```

### Core Logic Outline (`main.js`)

```javascript
const { Plugin } = require("obsidian");

module.exports = class CanvasAddNodeBelowPlugin extends Plugin {
  async onload() {
    this.addCommand({
      id: "add-node-below",
      name: "Add node below",
      hotkeys: [{ modifiers: ["Mod"], key: "Enter" }],
      checkCallback: (checking) => {
        const activeView = this.app.workspace.getActiveViewOfType(this.app.viewRegistry.getViewCreatorByType("canvas")?.()?.constructor);
        const canvas = activeView?.canvas;
        if (!canvas) return false;
        if (checking) return true;

        this.spawnNodeBelow(canvas);
        return true;
      }
    });
  }

  spawnNodeBelow(canvas) {
    const { width, height, padding } = this.settings;

    // Detect active or focused node
    let activeNode = null;
    if (canvas.selection?.size > 0) {
      activeNode = Array.from(canvas.selection)[0];
    }

    let x, y;

    if (activeNode) {
      x = activeNode.x;
      y = activeNode.y + (activeNode.height || height) + padding;
    } else {
      // Spawn at viewport center if no node is active
      const viewPos = canvas.getViewportBounds();
      x = (viewPos.minX + viewPos.maxX) / 2 - width / 2;
      y = (viewPos.minY + viewPos.maxY) / 2 - height / 2;
    }

    const newNode = canvas.createTextNode({
      pos: { x, y },
      size: { width, height },
      text: "",
      save: true
    });

    canvas.deselectAll();
    canvas.select(newNode);
    newNode.startEditing();
    canvas.panTo(newNode.x + width / 2, newNode.y + height / 2);
    canvas.requestSave();
  }
};

```

---

## 6. Verification & Test Checklist

1. **Empty Canvas Test**: Open a brand-new canvas, press `Mod-Enter`. Verify a node using Canvas defaults for dimensions set to `0` appears at the viewport center and the blinking cursor is immediately active.
2. **Sequential Chaining Test**: Type text, press `Mod-Enter` consecutively 5 times. Verify a uniform vertical column forms with the configured padding, left edges aligned, without losing typing focus.
3. **Viewport Auto-Scroll Test**: Continue typing cards past the bottom screen edge; verify the canvas automatically frames the active node.
4. **Safety Check**: Navigate to a standard `.md` note and press `Mod-Enter`; verify the shortcut does not interfere with standard markdown editing behavior.
5. **Settings Test**: Change padding, width, and height in the plugin settings. Verify new nodes use those values and the values remain after reloading Obsidian.