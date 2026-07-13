const messageSelect = document.querySelector<HTMLSelectElement>("#messageSelect");
const captionInput = document.querySelector<HTMLTextAreaElement>("#captionInput");
const backgroundSelect = document.querySelector<HTMLSelectElement>("#backgroundSelect");
const canvas = document.querySelector<HTMLCanvasElement>("#momentCanvas");
const generateButton = document.querySelector<HTMLButtonElement>("#generateButton");
const downloadLink = document.querySelector<HTMLAnchorElement>("#downloadLink");
const momentStatus = document.querySelector<HTMLElement>("#momentStatus");
const characterImage = new Image();

characterImage.src = "assets/character/memepop.png";

function setMomentStatus(message: string): void {
  if (momentStatus) {
    momentStatus.textContent = message;
  }
}

function wrapText(context: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let currentLine = "";

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;

    if (context.measureText(testLine).width <= maxWidth || !currentLine) {
      currentLine = testLine;
    } else {
      lines.push(currentLine);
      currentLine = word;
    }
  }

  if (currentLine) {
    lines.push(currentLine);
  }

  return lines.slice(0, 5);
}

function roundRect(context: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number): void {
  context.beginPath();
  context.moveTo(x + radius, y);
  context.lineTo(x + width - radius, y);
  context.quadraticCurveTo(x + width, y, x + width, y + radius);
  context.lineTo(x + width, y + height - radius);
  context.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  context.lineTo(x + radius, y + height);
  context.quadraticCurveTo(x, y + height, x, y + height - radius);
  context.lineTo(x, y + radius);
  context.quadraticCurveTo(x, y, x + radius, y);
  context.closePath();
}

function drawBackground(context: CanvasRenderingContext2D, style: string): void {
  const gradient = context.createLinearGradient(0, 0, 1080, 1080);

  if (style === "mint") {
    gradient.addColorStop(0, "#9cebd8");
    gradient.addColorStop(1, "#fff4c9");
  } else if (style === "night") {
    gradient.addColorStop(0, "#242b46");
    gradient.addColorStop(1, "#705d9f");
  } else {
    gradient.addColorStop(0, "#ffd67d");
    gradient.addColorStop(1, "#fff8e8");
  }

  context.fillStyle = gradient;
  context.fillRect(0, 0, 1080, 1080);

  context.fillStyle = "rgba(255,255,255,0.34)";
  for (const [x, y, radius] of [
    [132, 148, 28],
    [902, 168, 22],
    [170, 838, 20],
    [884, 770, 32]
  ]) {
    context.beginPath();
    context.arc(x, y, radius, 0, Math.PI * 2);
    context.fill();
  }
}

function drawFallbackCharacter(context: CanvasRenderingContext2D): void {
  context.save();
  context.translate(540, 432);
  context.fillStyle = "#fff4d6";
  context.strokeStyle = "#3a2b2a";
  context.lineWidth = 16;
  roundRect(context, -154, -146, 308, 292, 90);
  context.fill();
  context.stroke();
  context.fillStyle = "#3a2b2a";
  context.beginPath();
  context.arc(-58, -24, 24, 0, Math.PI * 2);
  context.arc(58, -24, 24, 0, Math.PI * 2);
  context.fill();
  context.fillStyle = "#ff9a8a";
  context.beginPath();
  context.arc(0, 38, 22, 0, Math.PI * 2);
  context.fill();
  context.restore();
}

function getCaption(): string {
  const custom = captionInput?.value.trim();
  return custom || messageSelect?.value || "MemePop has entered the moment.";
}

function renderMoment(): void {
  if (!canvas) {
    return;
  }

  const context = canvas.getContext("2d");

  if (!context) {
    setMomentStatus("Canvas is not available in this browser.");
    return;
  }

  drawBackground(context, backgroundSelect?.value ?? "sunny");

  context.fillStyle = "rgba(58,43,42,0.16)";
  context.beginPath();
  context.ellipse(540, 715, 180, 34, 0, 0, Math.PI * 2);
  context.fill();

  if (characterImage.complete && characterImage.naturalWidth > 0) {
    context.drawImage(characterImage, 310, 190, 460, 460);
  } else {
    drawFallbackCharacter(context);
  }

  context.strokeStyle = "#3a2b2a";
  context.lineWidth = 12;
  context.fillStyle = "#fffaf0";
  roundRect(context, 150, 650, 780, 250, 42);
  context.fill();
  context.stroke();

  context.fillStyle = "#3a2b2a";
  context.font = "900 52px Inter, Arial, sans-serif";
  context.textAlign = "center";
  context.textBaseline = "middle";

  const lines = wrapText(context, getCaption(), 660);
  const lineHeight = 62;
  const startY = 760 - ((lines.length - 1) * lineHeight) / 2;

  lines.forEach((line, index) => {
    context.fillText(line, 540, startY + index * lineHeight);
  });

  context.font = "800 30px Inter, Arial, sans-serif";
  context.fillStyle = "rgba(58,43,42,0.72)";
  context.fillText("Made with MemePop", 540, 1010);

  if (downloadLink) {
    downloadLink.href = canvas.toDataURL("image/png");
  }

  setMomentStatus("PNG preview ready.");
}

function populateMessages(): void {
  if (!messageSelect) {
    return;
  }

  for (const message of MemePop.MESSAGES) {
    const option = document.createElement("option");
    option.value = message.text;
    option.textContent = message.text;
    messageSelect.append(option);
  }

  const params = new URLSearchParams(window.location.search);
  const messageParam = params.get("message");

  if (messageParam) {
    const existing = Array.from(messageSelect.options).find((option) => option.value === messageParam);

    if (existing) {
      messageSelect.value = messageParam;
    } else if (captionInput) {
      captionInput.value = messageParam;
    }
  }
}

messageSelect?.addEventListener("change", renderMoment);
captionInput?.addEventListener("input", renderMoment);
backgroundSelect?.addEventListener("change", renderMoment);
generateButton?.addEventListener("click", renderMoment);
characterImage.addEventListener("load", renderMoment);
characterImage.addEventListener("error", () => {
  setMomentStatus("Character image missing. Fallback art was used.");
  renderMoment();
});

document.addEventListener("DOMContentLoaded", () => {
  populateMessages();
  renderMoment();
});
