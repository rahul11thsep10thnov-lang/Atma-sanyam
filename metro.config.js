// Learn more: https://docs.expo.dev/guides/customizing-metro/
const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// The API (backend/) and admin console (admin/) live in this repo but are
// separate Node projects with their own node_modules. Keep Metro from
// crawling or bundling them.
const escape = (p) =>
  p
    .replace(/[.*+?^${}()|[\]]/g, '\\$&')
    .replace(/[/\\]/g, '[/\\\\]');
const ignored = ['backend', 'admin'].map((dir) => new RegExp(`^${escape(path.join(__dirname, dir))}[/\\\\].*`));
const existing = config.resolver.blockList;
config.resolver.blockList = [...(Array.isArray(existing) ? existing : existing ? [existing] : []), ...ignored];

// 3D models for the Balcony World ship as bundled assets.
config.resolver.assetExts = [...config.resolver.assetExts, 'glb', 'gltf'];

module.exports = config;
