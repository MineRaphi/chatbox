import { execFile } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { promisify } from 'node:util';
import type { ForgeConfig } from '@electron-forge/shared-types';
import { MakerSquirrel } from '@electron-forge/maker-squirrel';
import { MakerZIP } from '@electron-forge/maker-zip';
import { MakerDeb } from '@electron-forge/maker-deb';
import { MakerRpm } from '@electron-forge/maker-rpm';
import { PublisherGitHub } from '@electron-forge/publisher-github';
import { MakerAppImage } from '@reforged/maker-appimage';
import { VitePlugin } from '@electron-forge/plugin-vite';
import { FusesPlugin } from '@electron-forge/plugin-fuses';
import { FuseV1Options, FuseVersion } from '@electron/fuses';

const run = promisify(execFile);

const { version } = JSON.parse(
  readFileSync(new URL('./package.json', import.meta.url), 'utf8'),
) as { version: string };
// `2.0.0-beta` is a pre-release. Windows file versions must be plain numbers,
// so the build number keeps only the `2.0.0` part.
const isPrerelease = version.includes('-');
const numericVersion = version.split('-')[0]!;

const config: ForgeConfig = {
  packagerConfig: {
    asar: true,
    name: 'Chatbox',
    buildVersion: numericVersion,
    appBundleId: 'com.mineraphi.chatbox',
    appCategoryType: 'public.app-category.social-networking',
    icon: './icons/chatbox',
    // Tray icons are loaded from disk at runtime, so they ship outside the asar.
    // chatbox.png: the icon for the AppImage's own app menu entry.
    extraResource: ['./assets', './icons/chatbox.png'],
    // Menu-bar app on macOS: no dock icon.
    extendInfo: { LSUIElement: true },
    win32metadata: {
      CompanyName: 'MineRaphi',
      ProductName: 'Chatbox',
      FileDescription: 'Chatbox',
    },
  },
  rebuildConfig: {},
  hooks: {
    // Builds are unsigned (no Apple Developer account). Packaging edits
    // Info.plist and the fuses after Electron's own ad-hoc signature, which
    // leaves the bundle's signature invalid: downloaded copies then fail
    // with "Chatbox is damaged". An ad-hoc signature over the finished
    // bundle turns that into the "unidentified developer" prompt, which
    // people can approve in System Settings.
    postPackage: async (_config, { platform, outputPaths }) => {
      if (platform !== 'darwin') return;
      for (const dir of outputPaths) {
        const app = path.join(dir, 'Chatbox.app');
        await run('codesign', ['--force', '--deep', '--sign', '-', app]);
        await run('codesign', ['--verify', '--deep', '--strict', app]);
      }
    },
  },
  makers: [
    // Windows: Chatbox-Setup.exe, installs per user without admin rights.
    new MakerSquirrel({
      name: 'chatbox',
      setupExe: 'Chatbox-Setup.exe',
      setupIcon: './icons/chatbox.ico',
      noMsi: true,
    }),
    // macOS download, and a portable Windows build for people who'd rather
    // not run an installer.
    new MakerZIP({}, ['darwin', 'win32']),
    // Linux: .deb for Ubuntu/Debian, .rpm for Fedora and similar.
    new MakerDeb({
      options: {
        name: 'chatbox',
        productName: 'Chatbox',
        genericName: 'Emote overlay',
        // The packaged executable is named after packagerConfig.name.
        bin: 'Chatbox',
        maintainer: 'MineRaphi',
        homepage: 'https://github.com/MineRaphi/chatbox',
        icon: './icons/chatbox.png',
        section: 'net',
        categories: ['Network'],
      },
    }),
    // Linux: one-file AppImage for everything else (Arch, NixOS via
    // appimage-run, ...). The runtime is pinned and checksum-verified by
    // scripts/fetch-appimage-runtime.sh; if it's missing the build fails
    // rather than downloading an unpinned one.
    new MakerAppImage({
      options: {
        name: 'chatbox',
        productName: 'Chatbox',
        genericName: 'Emote overlay',
        bin: 'Chatbox',
        icon: './icons/chatbox.png',
        categories: ['Network'],
        runtime: path.resolve('build/appimage-runtime-x86_64'),
      },
    }),
    new MakerRpm({
      options: {
        name: 'chatbox',
        productName: 'Chatbox',
        genericName: 'Emote overlay',
        // The packaged executable is named after packagerConfig.name.
        bin: 'Chatbox',
        homepage: 'https://github.com/MineRaphi/chatbox',
        license: 'ISC',
        icon: './icons/chatbox.png',
        categories: ['Network'],
      },
    }),
  ],
  publishers: [
    // `npm run release` uploads the build to a draft release for the
    // version in package.json; it's only published once you approve it.
    new PublisherGitHub({
      repository: { owner: 'MineRaphi', name: 'chatbox' },
      draft: true,
      prerelease: isPrerelease,
    }),
  ],
  plugins: [
    new VitePlugin({
      build: [
        {
          entry: 'src/main/index.ts',
          config: 'vite.main.config.mts',
          target: 'main',
        },
        {
          entry: 'src/preload/picker.ts',
          config: 'vite.preload.config.mts',
          target: 'preload',
        },
        {
          entry: 'src/preload/overlay.ts',
          config: 'vite.preload.config.mts',
          target: 'preload',
        },
      ],
      renderer: [
        {
          name: 'picker',
          config: 'vite.picker.config.mts',
        },
        {
          name: 'overlay',
          config: 'vite.overlay.config.mts',
        },
      ],
    }),
    // Fuses disable Electron features at package time, before code signing.
    new FusesPlugin({
      version: FuseVersion.V1,
      [FuseV1Options.RunAsNode]: false,
      [FuseV1Options.EnableCookieEncryption]: true,
      [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
      [FuseV1Options.EnableNodeCliInspectArguments]: false,
      [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: true,
      [FuseV1Options.OnlyLoadAppFromAsar]: true,
    }),
  ],
};

export default config;
