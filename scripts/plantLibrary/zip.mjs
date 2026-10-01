// Minimal ZIP writer (STORE method — PNGs are already compressed) so the
// library can be packaged without adding a dependency. Produces a standard
// archive readable by every unzip tool.
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

function dosDateTime(date) {
  const time = ((date.getHours() & 31) << 11) | ((date.getMinutes() & 63) << 5) | ((date.getSeconds() >> 1) & 31);
  const day = (((date.getFullYear() - 1980) & 127) << 9) | (((date.getMonth() + 1) & 15) << 5) | (date.getDate() & 31);
  return { time, day };
}

function u16(n) {
  const b = Buffer.alloc(2);
  b.writeUInt16LE(n);
  return b;
}

function u32(n) {
  const b = Buffer.alloc(4);
  b.writeUInt32LE(n >>> 0);
  return b;
}

/**
 * @param {string} outPath   archive to write
 * @param {{ name: string; data: Buffer }[]} entries  archive paths (forward slashes) and contents
 */
export function writeZip(outPath, entries) {
  const chunks = [];
  const central = [];
  let offset = 0;
  const { time, day } = dosDateTime(new Date());
  for (const entry of entries) {
    const name = Buffer.from(entry.name, 'utf8');
    const crc = zlib.crc32(entry.data) >>> 0;
    const local = Buffer.concat([
      u32(0x04034b50), u16(20), u16(0x0800), u16(0), u16(time), u16(day),
      u32(crc), u32(entry.data.length), u32(entry.data.length), u16(name.length), u16(0), name,
    ]);
    chunks.push(local, entry.data);
    central.push(
      Buffer.concat([
        u32(0x02014b50), u16(20), u16(20), u16(0x0800), u16(0), u16(time), u16(day),
        u32(crc), u32(entry.data.length), u32(entry.data.length), u16(name.length), u16(0), u16(0), u16(0), u16(0),
        u32(0), u32(offset), name,
      ]),
    );
    offset += local.length + entry.data.length;
  }
  const centralStart = offset;
  const centralBuf = Buffer.concat(central);
  const end = Buffer.concat([
    u32(0x06054b50), u16(0), u16(0), u16(entries.length), u16(entries.length), u32(centralBuf.length), u32(centralStart), u16(0),
  ]);
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, Buffer.concat([...chunks, centralBuf, end]));
}
