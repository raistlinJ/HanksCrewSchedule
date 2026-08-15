export function createLabeledQrCodePng(
  qrCanvas: HTMLCanvasElement,
  label: string,
) {
  return new Promise<Blob>((resolve, reject) => {
    const labelHeight = Math.max(144, Math.round(qrCanvas.width * 0.14));
    const output = document.createElement("canvas");
    output.width = qrCanvas.width;
    output.height = qrCanvas.height + labelHeight;

    const context = output.getContext("2d");
    if (!context) {
      reject(new Error("Unable to create labeled QR code"));
      return;
    }

    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, output.width, output.height);
    context.drawImage(qrCanvas, 0, 0);
    context.fillStyle = "#000000";
    context.textAlign = "center";
    context.textBaseline = "middle";

    const availableWidth = output.width - Math.max(80, output.width * 0.08);
    let fontSize = Math.max(28, Math.round(output.width * 0.055));
    const setFont = () => {
      context.font = `600 ${fontSize}px system-ui, -apple-system, sans-serif`;
    };
    setFont();

    while (fontSize > 28 && context.measureText(label).width > availableWidth) {
      fontSize -= 2;
      setFont();
    }

    let fittedLabel = label;
    while (
      fittedLabel.length > 1 &&
      context.measureText(fittedLabel).width > availableWidth
    ) {
      fittedLabel = `${fittedLabel.slice(0, -2).trimEnd()}…`;
    }

    context.fillText(
      fittedLabel,
      output.width / 2,
      qrCanvas.height + labelHeight / 2,
    );
    output.toBlob((blob) => {
      if (blob) {
        resolve(blob);
      } else {
        reject(new Error("Unable to create QR code image"));
      }
    }, "image/png");
  });
}
