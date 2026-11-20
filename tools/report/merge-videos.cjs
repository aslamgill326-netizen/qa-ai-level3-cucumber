'use strict';
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { spawnSync } = require('node:child_process');
const root = path.resolve(__dirname, '../..');
const dir = path.join(root, 'reports', 'cucumber', 'videos');
const output = path.join(dir, 'full-test-execution.mp4');
const deleteParts = process.argv.includes('--delete-parts');
function main() {
  if (!fs.existsSync(dir)) { console.log('No videos directory; skipping merge.'); return; }
  const files = fs.readdirSync(dir).filter(f => f.toLowerCase().endsWith('.webm'))
    .map(f => ({file: path.join(dir, f), mtime: fs.statSync(path.join(dir, f)).mtimeMs}))
    .sort((a,b) => a.mtime - b.mtime || a.file.localeCompare(b.file));
  if (!files.length) { console.log('No scenario videos to merge.'); return; }
  const check = spawnSync('ffmpeg', ['-version'], {encoding:'utf8', windowsHide:true});
  if (check.error || check.status !== 0) { console.warn('FFmpeg not available. Individual videos preserved.'); return; }
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'cucumber-video-'));
  const list = path.join(temp, 'videos.txt');
  // FFmpeg concat demuxer supports forward-slash absolute paths and single-quote escaping.
  const quote = file => "file '" + file.replace(/\\/g, '/').replace(/'/g, "'\\''") + "'";
  fs.writeFileSync(list, files.map(f => quote(f.file)).join('\n') + '\n');
  const partial = path.join(dir, 'full-test-execution.partial.mp4');
  try {
    if (fs.existsSync(partial)) fs.unlinkSync(partial);
    const result = spawnSync('ffmpeg', [
      '-hide_banner', '-loglevel', 'error', '-y',
      '-f', 'concat', '-safe', '0', '-i', list,
      '-an', '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '25',
      '-pix_fmt', 'yuv420p', '-movflags', '+faststart', partial
    ], {cwd:root, stdio:'inherit', windowsHide:true});
    if (result.error || result.status !== 0 || !fs.existsSync(partial) || fs.statSync(partial).size === 0) {
      console.warn('Video merge failed; individual videos preserved.');
      process.exitCode = 1;
      return;
    }
    if (fs.existsSync(output)) fs.unlinkSync(output);
    fs.renameSync(partial, output);
    console.log(`Merged ${files.length} videos: ${output}`);
    if (deleteParts) {
      for (const item of files) fs.unlinkSync(item.file);
      console.log('Removed individual scenario videos after successful merge.');
    }
  } finally {
    try { fs.rmSync(temp, {recursive:true,force:true}); } catch {}
    if (fs.existsSync(partial)) fs.unlinkSync(partial);
  }
}
main();
