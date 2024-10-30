module.exports = {
  packagerConfig: {
    asar: true,
    icon: "icons/icon",
  },
  rebuildConfig: {},
  makers: [
    {
      name: "@electron-forge/maker-squirrel",
      /** @type {import("@electron-forge/maker-squirrel").MakerSquirrelConfig} MakerSquirrelConfig */
      config: {
        // this is really stupid...
        iconUrl: "https://raw.githubusercontent.com/danthegoodman1/CitizenStats/refs/heads/electron/icon.ico", // need this stupid shit
        setupIcon: "./src/assets/logo_64.ico",
        name: "CitizenStats",
      },
    },
    {
      name: "@electron-forge/maker-zip",
      platforms: ["win32"],
    },
  ],
  plugins: [
    {
      name: "@electron-forge/plugin-auto-unpack-natives",
      config: {},
    },
  ],
};
