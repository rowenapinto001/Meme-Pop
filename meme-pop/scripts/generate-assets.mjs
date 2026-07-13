import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { deflateSync } from "node:zlib";

const projectRoot = fileURLToPath(new URL("..", import.meta.url));

const crcTable = new Uint32Array(256);
for (let n = 0; n < 256; n += 1) {
  let c = n;
  for (let k = 0; k < 8; k += 1) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  crcTable[n] = c >>> 0;
}

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const typeBuffer = Buffer.from(type, "ascii");
  const length = Buffer.alloc(4);
  const crc = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])), 0);
  return Buffer.concat([length, typeBuffer, data, crc]);
}

function encodePng(width, height, rgba) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y += 1) {
    const sourceStart = y * width * 4;
    const rowStart = y * (width * 4 + 1);
    raw[rowStart] = 0;
    rgba.copy(raw, rowStart + 1, sourceStart, sourceStart + width * 4);
  }

  return Buffer.concat([
    signature,
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0))
  ]);
}

class TinyCanvas {
  constructor(width, height) {
    this.width = width;
    this.height = height;
    this.pixels = Buffer.alloc(width * height * 4);
  }

  blendPixel(x, y, color) {
    const px = Math.round(x);
    const py = Math.round(y);

    if (px < 0 || px >= this.width || py < 0 || py >= this.height) {
      return;
    }

    const index = (py * this.width + px) * 4;
    const sourceA = color[3] / 255;
    const targetA = this.pixels[index + 3] / 255;
    const outA = sourceA + targetA * (1 - sourceA);

    if (outA <= 0) {
      return;
    }

    this.pixels[index] = Math.round((color[0] * sourceA + this.pixels[index] * targetA * (1 - sourceA)) / outA);
    this.pixels[index + 1] = Math.round((color[1] * sourceA + this.pixels[index + 1] * targetA * (1 - sourceA)) / outA);
    this.pixels[index + 2] = Math.round((color[2] * sourceA + this.pixels[index + 2] * targetA * (1 - sourceA)) / outA);
    this.pixels[index + 3] = Math.round(outA * 255);
  }

  fillRect(x, y, width, height, color) {
    const startX = Math.max(0, Math.floor(x));
    const endX = Math.min(this.width, Math.ceil(x + width));
    const startY = Math.max(0, Math.floor(y));
    const endY = Math.min(this.height, Math.ceil(y + height));

    for (let py = startY; py < endY; py += 1) {
      for (let px = startX; px < endX; px += 1) {
        this.blendPixel(px, py, color);
      }
    }
  }

  fillCircle(cx, cy, radius, color) {
    const radiusSquared = radius * radius;
    for (let y = Math.floor(cy - radius); y <= Math.ceil(cy + radius); y += 1) {
      for (let x = Math.floor(cx - radius); x <= Math.ceil(cx + radius); x += 1) {
        const dx = x - cx;
        const dy = y - cy;
        if (dx * dx + dy * dy <= radiusSquared) {
          this.blendPixel(x, y, color);
        }
      }
    }
  }

  fillEllipse(cx, cy, rx, ry, color) {
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y += 1) {
      for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x += 1) {
        const dx = (x - cx) / rx;
        const dy = (y - cy) / ry;
        if (dx * dx + dy * dy <= 1) {
          this.blendPixel(x, y, color);
        }
      }
    }
  }

  fillRoundRect(x, y, width, height, radius, color) {
    this.fillRect(x + radius, y, width - radius * 2, height, color);
    this.fillRect(x, y + radius, width, height - radius * 2, color);
    this.fillCircle(x + radius, y + radius, radius, color);
    this.fillCircle(x + width - radius, y + radius, radius, color);
    this.fillCircle(x + radius, y + height - radius, radius, color);
    this.fillCircle(x + width - radius, y + height - radius, radius, color);
  }

  fillPolygon(points, color) {
    const xs = points.map((point) => point[0]);
    const ys = points.map((point) => point[1]);
    const minX = Math.floor(Math.min(...xs));
    const maxX = Math.ceil(Math.max(...xs));
    const minY = Math.floor(Math.min(...ys));
    const maxY = Math.ceil(Math.max(...ys));

    for (let y = minY; y <= maxY; y += 1) {
      for (let x = minX; x <= maxX; x += 1) {
        let inside = false;
        for (let i = 0, j = points.length - 1; i < points.length; j = i, i += 1) {
          const xi = points[i][0];
          const yi = points[i][1];
          const xj = points[j][0];
          const yj = points[j][1];
          const intersects = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
          if (intersects) {
            inside = !inside;
          }
        }

        if (inside) {
          this.blendPixel(x, y, color);
        }
      }
    }
  }

  strokeLine(x1, y1, x2, y2, width, color) {
    const steps = Math.max(Math.abs(x2 - x1), Math.abs(y2 - y1));
    for (let step = 0; step <= steps; step += 1) {
      const t = steps === 0 ? 0 : step / steps;
      this.fillCircle(x1 + (x2 - x1) * t, y1 + (y2 - y1) * t, width / 2, color);
    }
  }

  strokeArc(cx, cy, radius, start, end, width, color) {
    const steps = 64;
    for (let i = 0; i <= steps; i += 1) {
      const t = start + ((end - start) * i) / steps;
      this.fillCircle(cx + Math.cos(t) * radius, cy + Math.sin(t) * radius, width / 2, color);
    }
  }

  save(path) {
    writeFileSync(path, encodePng(this.width, this.height, this.pixels));
  }
}

const INK = [58, 43, 42, 255];
const SOFT_INK = [82, 61, 58, 255];
const CREAM = [255, 246, 224, 255];
const BLUSH = [255, 153, 139, 215];

function drawPanel(canvas, background, accent) {
  canvas.fillRoundRect(10, 14, 492, 484, 38, [58, 43, 42, 35]);
  canvas.fillRoundRect(16, 12, 480, 474, 34, [58, 43, 42, 255]);
  canvas.fillRoundRect(23, 20, 466, 460, 29, background);

  for (const [x, y, scale] of [
    [80, 96, 1],
    [420, 100, 0.7],
    [78, 268, 0.55],
    [438, 292, 0.85],
    [122, 408, 0.65]
  ]) {
    drawSparkle(canvas, x, y, scale, accent);
  }

  canvas.fillEllipse(258, 448, 176, 30, [58, 43, 42, 52]);
}

function drawSparkle(canvas, x, y, scale, color) {
  canvas.fillPolygon(
    [
      [x, y - 17 * scale],
      [x + 6 * scale, y - 5 * scale],
      [x + 18 * scale, y],
      [x + 6 * scale, y + 5 * scale],
      [x, y + 17 * scale],
      [x - 6 * scale, y + 5 * scale],
      [x - 18 * scale, y],
      [x - 6 * scale, y - 5 * scale]
    ],
    color
  );
}

function drawKawaiiEyes(canvas, leftX, rightX, y, scale = 1, pupil = [48, 39, 44, 255]) {
  canvas.fillCircle(leftX, y, 19 * scale, INK);
  canvas.fillCircle(rightX, y, 19 * scale, INK);
  canvas.fillCircle(leftX + 5 * scale, y - 6 * scale, 6 * scale, [255, 255, 255, 255]);
  canvas.fillCircle(rightX + 5 * scale, y - 6 * scale, 6 * scale, [255, 255, 255, 255]);
  canvas.fillCircle(leftX - 2 * scale, y + 3 * scale, 12 * scale, pupil);
  canvas.fillCircle(rightX - 2 * scale, y + 3 * scale, 12 * scale, pupil);
}

function drawSmile(canvas, cx, cy, radius, color = SOFT_INK) {
  canvas.strokeArc(cx, cy, radius, 0.22, Math.PI - 0.22, 7, color);
}

function drawDesk(canvas) {
  canvas.fillRoundRect(72, 346, 372, 92, 22, [58, 43, 42, 255]);
  canvas.fillRoundRect(79, 338, 358, 91, 19, [211, 148, 84, 255]);
  canvas.fillRect(89, 374, 338, 7, [245, 188, 117, 120]);
  canvas.fillRect(104, 409, 266, 7, [151, 96, 63, 95]);
}

function drawLaptop(canvas, x, y, width, height, body, glow) {
  canvas.fillRoundRect(x, y, width, height, 12, INK);
  canvas.fillRoundRect(x + 8, y + 8, width - 16, height - 18, 9, body);
  canvas.fillCircle(x + width / 2, y + height / 2 + 2, 16, [255, 255, 255, 125]);
  canvas.fillCircle(x + width / 2, y + height / 2 + 2, 8, glow);
  canvas.fillRoundRect(x - 12, y + height - 7, width + 24, 23, 10, INK);
  canvas.fillRoundRect(x, y + height - 2, width, 9, 4, [112, 91, 95, 255]);
}

function drawMug(canvas, x, y, color) {
  canvas.fillRoundRect(x, y, 54, 62, 12, INK);
  canvas.fillRoundRect(x + 7, y + 7, 40, 48, 9, color);
  canvas.fillCircle(x + 50, y + 30, 18, INK);
  canvas.fillCircle(x + 50, y + 30, 10, [255, 246, 224, 255]);
  canvas.fillCircle(x + 27, y + 32, 10, [255, 255, 255, 90]);
}

function drawBook(canvas, x, y, width, height, color) {
  canvas.fillRoundRect(x, y, width, height, 8, INK);
  canvas.fillRoundRect(x + 6, y + 5, width - 12, height - 10, 6, color);
  canvas.fillRect(x + 16, y + 14, width - 32, 5, [255, 255, 255, 120]);
  canvas.fillRect(x + 16, y + 28, width - 44, 5, [255, 255, 255, 100]);
}

function drawOfficeCharacter() {
  const canvas = new TinyCanvas(512, 512);
  drawPanel(canvas, [255, 214, 130, 255], [255, 246, 184, 220]);
  drawDesk(canvas);

  canvas.fillPolygon(
    [
      [147, 169],
      [188, 99],
      [218, 180]
    ],
    INK
  );
  canvas.fillPolygon(
    [
      [365, 169],
      [324, 99],
      [294, 180]
    ],
    INK
  );
  canvas.fillPolygon(
    [
      [159, 165],
      [188, 116],
      [210, 177]
    ],
    [250, 160, 94, 255]
  );
  canvas.fillPolygon(
    [
      [353, 165],
      [324, 116],
      [302, 177]
    ],
    [250, 160, 94, 255]
  );
  canvas.fillEllipse(256, 242, 118, 116, INK);
  canvas.fillEllipse(256, 238, 108, 106, [235, 138, 60, 255]);
  canvas.fillEllipse(256, 274, 82, 57, CREAM);
  canvas.fillCircle(203, 276, 18, BLUSH);
  canvas.fillCircle(309, 276, 18, BLUSH);
  drawKawaiiEyes(canvas, 222, 290, 238, 0.88);
  canvas.fillEllipse(256, 265, 12, 8, INK);
  drawSmile(canvas, 256, 276, 24);
  canvas.strokeLine(231, 314, 231, 362, 22, [255, 255, 255, 255]);
  canvas.strokeLine(281, 314, 281, 362, 22, [255, 255, 255, 255]);
  canvas.fillPolygon(
    [
      [239, 316],
      [273, 316],
      [264, 372],
      [256, 382],
      [248, 372]
    ],
    [69, 102, 161, 255]
  );
  drawLaptop(canvas, 104, 306, 148, 88, [76, 84, 106, 255], [245, 215, 185, 255]);
  drawMug(canvas, 358, 298, [255, 246, 224, 255]);
  return canvas;
}

function drawCodingCharacter() {
  const canvas = new TinyCanvas(512, 512);
  drawPanel(canvas, [37, 45, 70, 255], [135, 231, 204, 210]);
  drawDesk(canvas);
  canvas.fillRoundRect(74, 103, 365, 216, 18, [27, 34, 55, 165]);
  for (const y of [129, 156, 183, 210, 237, 264]) {
    canvas.fillRect(101, y, 86, 7, [113, 240, 209, 120]);
    canvas.fillRect(211, y, 53, 7, [255, 185, 92, 110]);
    canvas.fillRect(286, y, 102, 7, [148, 129, 255, 90]);
  }

  canvas.fillPolygon(
    [
      [154, 220],
      [190, 145],
      [214, 228]
    ],
    INK
  );
  canvas.fillPolygon(
    [
      [358, 220],
      [322, 145],
      [298, 228]
    ],
    INK
  );
  canvas.fillEllipse(256, 270, 114, 109, INK);
  canvas.fillEllipse(256, 270, 103, 100, [48, 52, 66, 255]);
  drawKawaiiEyes(canvas, 219, 293, 260, 0.9, [255, 189, 83, 255]);
  canvas.fillEllipse(256, 287, 10, 7, [255, 172, 121, 255]);
  drawSmile(canvas, 256, 296, 22, [255, 206, 156, 255]);
  canvas.strokeLine(188, 329, 154, 370, 24, INK);
  canvas.strokeLine(324, 329, 358, 370, 24, INK);
  drawLaptop(canvas, 157, 315, 197, 94, [68, 78, 103, 255], [167, 226, 213, 255]);
  drawMug(canvas, 377, 305, [45, 72, 96, 255]);
  canvas.fillRect(391, 325, 29, 6, [255, 185, 92, 180]);
  canvas.fillRect(391, 342, 20, 6, [255, 185, 92, 140]);
  return canvas;
}

function drawStudyCharacter() {
  const canvas = new TinyCanvas(512, 512);
  drawPanel(canvas, [194, 164, 232, 255], [255, 248, 181, 220]);
  drawDesk(canvas);
  drawBook(canvas, 84, 306, 88, 51, [88, 154, 121, 255]);
  drawBook(canvas, 104, 261, 106, 49, [238, 149, 118, 255]);
  drawBook(canvas, 384, 302, 63, 91, [98, 150, 199, 255]);

  canvas.strokeLine(179, 303, 141, 364, 22, [255, 239, 229, 255]);
  canvas.strokeLine(335, 303, 372, 365, 22, [255, 239, 229, 255]);
  canvas.fillRoundRect(183, 95, 43, 150, 22, INK);
  canvas.fillRoundRect(286, 95, 43, 150, 22, INK);
  canvas.fillRoundRect(191, 103, 27, 133, 15, [255, 239, 229, 255]);
  canvas.fillRoundRect(294, 103, 27, 133, 15, [255, 239, 229, 255]);
  canvas.fillEllipse(256, 258, 113, 102, INK);
  canvas.fillEllipse(256, 254, 103, 94, [255, 239, 229, 255]);
  canvas.fillCircle(208, 271, 18, BLUSH);
  canvas.fillCircle(304, 271, 18, BLUSH);
  drawKawaiiEyes(canvas, 222, 290, 246, 0.74);
  canvas.strokeLine(197, 246, 247, 246, 6, SOFT_INK);
  canvas.strokeLine(265, 246, 315, 246, 6, SOFT_INK);
  canvas.strokeLine(247, 246, 265, 246, 5, SOFT_INK);
  canvas.fillEllipse(256, 273, 9, 6, [235, 137, 127, 255]);
  drawSmile(canvas, 256, 281, 20);
  drawBook(canvas, 178, 340, 155, 70, [119, 167, 114, 255]);
  return canvas;
}

function drawGamingCharacter() {
  const canvas = new TinyCanvas(512, 512);
  drawPanel(canvas, [101, 184, 137, 255], [235, 255, 170, 220]);
  drawDesk(canvas);
  canvas.fillCircle(159, 227, 42, INK);
  canvas.fillCircle(353, 227, 42, INK);
  canvas.fillCircle(159, 227, 31, [247, 175, 94, 255]);
  canvas.fillCircle(353, 227, 31, [247, 175, 94, 255]);
  canvas.fillEllipse(256, 263, 123, 112, INK);
  canvas.fillEllipse(256, 261, 112, 102, [247, 175, 94, 255]);
  canvas.fillEllipse(256, 289, 86, 56, CREAM);
  canvas.fillCircle(207, 285, 17, BLUSH);
  canvas.fillCircle(305, 285, 17, BLUSH);
  drawKawaiiEyes(canvas, 222, 290, 255, 0.82);
  canvas.fillEllipse(256, 276, 11, 8, INK);
  drawSmile(canvas, 256, 287, 22);
  canvas.fillPolygon(
    [
      [147, 154],
      [224, 104],
      [246, 189],
      [197, 212]
    ],
    [63, 161, 90, 255]
  );
  canvas.fillPolygon(
    [
      [365, 154],
      [288, 104],
      [266, 189],
      [315, 212]
    ],
    [63, 161, 90, 255]
  );
  canvas.fillPolygon(
    [
      [159, 162],
      [220, 122],
      [235, 187],
      [199, 201]
    ],
    [92, 199, 110, 255]
  );
  canvas.fillPolygon(
    [
      [353, 162],
      [292, 122],
      [277, 187],
      [313, 201]
    ],
    [92, 199, 110, 255]
  );
  canvas.strokeLine(176, 335, 136, 376, 23, [247, 175, 94, 255]);
  canvas.strokeLine(337, 335, 377, 376, 23, [247, 175, 94, 255]);
  canvas.fillRoundRect(155, 338, 204, 82, 36, INK);
  canvas.fillRoundRect(168, 352, 178, 54, 25, [50, 59, 76, 255]);
  canvas.fillCircle(213, 378, 18, [92, 199, 110, 255]);
  canvas.fillRect(201, 373, 25, 8, INK);
  canvas.fillRect(209, 365, 8, 25, INK);
  canvas.fillCircle(294, 371, 10, [255, 207, 78, 255]);
  canvas.fillCircle(318, 389, 10, [255, 125, 117, 255]);
  return canvas;
}

function drawIcon(size) {
  const canvas = new TinyCanvas(size, size);
  const scale = size / 128;
  canvas.fillRoundRect(6 * scale, 8 * scale, 116 * scale, 112 * scale, 30 * scale, [255, 204, 77, 255]);
  canvas.fillCircle(35 * scale, 38 * scale, 22 * scale, [93, 214, 189, 255]);
  canvas.fillCircle(93 * scale, 40 * scale, 20 * scale, [255, 111, 97, 255]);
  canvas.fillRoundRect(25 * scale, 35 * scale, 78 * scale, 58 * scale, 18 * scale, [255, 255, 255, 255]);
  canvas.fillPolygon(
    [
      [58 * scale, 88 * scale],
      [72 * scale, 88 * scale],
      [62 * scale, 105 * scale]
    ],
    [255, 255, 255, 255]
  );
  canvas.fillCircle(52 * scale, 61 * scale, 8 * scale, [36, 48, 68, 255]);
  canvas.fillCircle(78 * scale, 61 * scale, 8 * scale, [36, 48, 68, 255]);
  canvas.strokeArc(65 * scale, 70 * scale, 15 * scale, 0.2, Math.PI - 0.2, 4 * scale, [36, 48, 68, 255]);
  return canvas;
}

function drawMemePopCharacter() {
  const canvas = new TinyCanvas(512, 512);
  canvas.fillEllipse(256, 465, 144, 30, [58, 43, 42, 42]);
  canvas.fillCircle(165, 214, 48, [58, 43, 42, 255]);
  canvas.fillCircle(347, 214, 48, [58, 43, 42, 255]);
  canvas.fillCircle(165, 214, 34, [255, 222, 95, 255]);
  canvas.fillCircle(347, 214, 34, [255, 128, 139, 255]);
  canvas.fillRoundRect(132, 132, 248, 286, 76, [58, 43, 42, 255]);
  canvas.fillRoundRect(145, 143, 222, 264, 66, [255, 244, 214, 255]);
  canvas.fillCircle(198, 286, 25, [255, 154, 139, 215]);
  canvas.fillCircle(314, 286, 25, [255, 154, 139, 215]);
  canvas.fillCircle(214, 242, 25, [58, 43, 42, 255]);
  canvas.fillCircle(298, 242, 25, [58, 43, 42, 255]);
  canvas.fillCircle(222, 234, 8, [255, 255, 255, 255]);
  canvas.fillCircle(306, 234, 8, [255, 255, 255, 255]);
  canvas.fillEllipse(256, 274, 17, 12, [58, 43, 42, 255]);
  canvas.strokeArc(256, 290, 37, 0.2, Math.PI - 0.2, 8, [58, 43, 42, 255]);
  canvas.strokeLine(150, 344, 102, 385, 26, [255, 244, 214, 255]);
  canvas.strokeLine(362, 344, 410, 385, 26, [255, 244, 214, 255]);
  canvas.fillCircle(101, 386, 18, [255, 244, 214, 255]);
  canvas.fillCircle(411, 386, 18, [255, 244, 214, 255]);
  canvas.fillCircle(135, 118, 12, [255, 210, 86, 255]);
  canvas.fillCircle(377, 122, 10, [77, 210, 184, 255]);
  drawSparkle(canvas, 105, 166, 0.55, [255, 225, 127, 220]);
  drawSparkle(canvas, 402, 172, 0.48, [108, 226, 198, 210]);
  return canvas;
}

const outputs = [
  ["assets/icons/icon16.png", drawIcon(16)],
  ["assets/icons/icon48.png", drawIcon(48)],
  ["assets/icons/icon128.png", drawIcon(128)],
  ["assets/character/memepop.png", drawMemePopCharacter()],
  ["assets/memes/office-1.png", drawOfficeCharacter()],
  ["assets/memes/coding-1.png", drawCodingCharacter()],
  ["assets/memes/study-1.png", drawStudyCharacter()],
  ["assets/memes/gaming-1.png", drawGamingCharacter()]
];

for (const [relativePath, canvas] of outputs) {
  const outputPath = join(projectRoot, relativePath);
  mkdirSync(join(outputPath, ".."), { recursive: true });
  canvas.save(outputPath);
}

console.log(`Generated ${outputs.length} original MemePop PNG assets.`);
