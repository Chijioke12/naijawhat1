// Stub file to prevent bundling the massive Phaser library.
// Delegates directly to the global Phaser loaded in index.html.
const Phaser = (window as any).Phaser;
export default Phaser;
