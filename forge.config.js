module.exports = {
  packagerConfig: {
    asar: true,
  },
  rebuildConfig: {},
  makers: [
    {
      name: "@electron-forge/maker-squirrel",
      /** @type {import("@electron-forge/maker-squirrel").MakerSquirrelConfig} MakerSquirrelConfig */
      config: {
        setupIcon: "./logo_64.ico",
        icon: "./logo_64.ico",
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
