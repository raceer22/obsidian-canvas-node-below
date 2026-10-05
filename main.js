const { ItemView, Plugin, PluginSettingTab, Setting } = require("obsidian");

const DEFAULT_SETTINGS = {
  padding: 40,
  width: 0,
  height: 0
};

module.exports = class CanvasAddNodeBelowPlugin extends Plugin {
  async onload() {
    const savedSettings = await this.loadData() || {};
    this.settings = {
      padding: Number.isFinite(savedSettings.padding) && savedSettings.padding >= 0
        ? savedSettings.padding
        : DEFAULT_SETTINGS.padding,
      width: Number.isFinite(savedSettings.width) && savedSettings.width >= 0
        ? savedSettings.width
        : DEFAULT_SETTINGS.width,
      height: Number.isFinite(savedSettings.height) && savedSettings.height >= 0
        ? savedSettings.height
        : DEFAULT_SETTINGS.height
    };

    this.addSettingTab(new CanvasAddNodeBelowSettingTab(this.app, this));
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

  async saveSettings() {
    await this.saveData(this.settings);
  }

  spawnNodeBelow(canvas) {
    // Detect active or focused node
    let activeNode = null;
    if (canvas.selection?.size > 0) {
      activeNode = Array.from(canvas.selection)[0];
    }

    let x, y;
    const { padding, width, height } = this.settings;

    if (activeNode) {
      x = activeNode.x;
      y = activeNode.y + (activeNode.height || height || 200) + padding;
    } else {
      // Let Canvas center the node using its native default dimensions.
      ({ x, y } = canvas.posCenter());
    }

    const size = {
      ...(width > 0 ? { width } : {}),
      ...(height > 0 ? { height } : {})
    };
    const newNode = canvas.createTextNode({
      pos: { x, y },
      ...(!activeNode ? { position: "center" } : {}),
      ...(Object.keys(size).length > 0 ? { size } : {}),
      text: "",
      save: true
    });

    canvas.deselectAll();
    canvas.select(newNode);
    newNode.startEditing();
    canvas.panTo(newNode.x + newNode.width / 2, newNode.y + newNode.height / 2);
    canvas.requestSave();
  }
};

class CanvasAddNodeBelowSettingTab extends PluginSettingTab {
  constructor(app, plugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display() {
    const { containerEl } = this;
    containerEl.empty();
    containerEl.createEl("h2", { text: "Canvas Add Node Below" });

    [
      { key: "padding", name: "Vertical padding", description: "Gap below the current node, in pixels.", min: 0 },
      { key: "width", name: "Default node width", description: "Width in pixels. Set to 0 to use Canvas default sizing.", min: 0 },
      { key: "height", name: "Default node height", description: "Height in pixels. Set to 0 to use Canvas default sizing.", min: 0 }
    ].forEach(({ key, name, description, min }) => {
      new Setting(containerEl)
        .setName(name)
        .setDesc(description)
        .addText((text) => {
          text.inputEl.type = "number";
          text.inputEl.min = String(min);
          text.inputEl.step = "any";
          text.setValue(String(this.plugin.settings[key]));
          text.onChange(async (value) => {
            const number = value.trim() ? Number(value) : NaN;
            if (Number.isFinite(number) && number >= min) {
              this.plugin.settings[key] = number;
              await this.plugin.saveSettings();
            } else {
              text.setValue(String(this.plugin.settings[key]));
            }
          });
        });
    });
  }
}
