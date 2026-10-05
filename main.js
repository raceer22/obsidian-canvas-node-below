const { ItemView, Plugin } = require("obsidian");

module.exports = class CanvasAddNodeBelowPlugin extends Plugin {
  async onload() {
    this.addCommand({
      id: "add-node-below",
      name: "Canvas: Add node below",
      hotkeys: [{ modifiers: ["Mod"], key: "Enter" }],
      checkCallback: (checking) => {
        const activeView = this.app.workspace.getActiveViewOfType(ItemView);
        if (activeView?.getViewType() !== "canvas" || !activeView.canvas) return false;
        if (checking) return true;

        this.spawnNodeBelow(activeView.canvas);
        return true;
      }
    });
  }

  spawnNodeBelow(canvas) {
    const DEFAULT_WIDTH = 400;
    const DEFAULT_HEIGHT = 200;
    const GAP = 40;

    // Detect active or focused node
    let activeNode = null;
    if (canvas.selection?.size > 0) {
      activeNode = Array.from(canvas.selection)[0];
    }

    let x, y, width = DEFAULT_WIDTH, height = DEFAULT_HEIGHT;

    if (activeNode) {
      x = activeNode.x;
      y = activeNode.y + (activeNode.height || DEFAULT_HEIGHT) + GAP;
      width = activeNode.width || DEFAULT_WIDTH;
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
