import { useRef, useState } from "react";

function getCanvasPoint(canvas, event) {
  const rect = canvas.getBoundingClientRect();
  const touch = event.touches?.[0];
  const clientX = touch ? touch.clientX : event.clientX;
  const clientY = touch ? touch.clientY : event.clientY;

  return {
    x: clientX - rect.left,
    y: clientY - rect.top
  };
}

export default function SignaturePad({ onSave }) {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);

  const startDrawing = (event) => {
    event.preventDefault();
    const canvas = canvasRef.current;
    const context = canvas.getContext("2d");
    const point = getCanvasPoint(canvas, event);

    context.beginPath();
    context.moveTo(point.x, point.y);
    setIsDrawing(true);
  };

  const draw = (event) => {
    if (!isDrawing) {
      return;
    }

    event.preventDefault();
    const canvas = canvasRef.current;
    const context = canvas.getContext("2d");
    const point = getCanvasPoint(canvas, event);

    context.lineTo(point.x, point.y);
    context.lineWidth = 3;
    context.lineCap = "round";
    context.strokeStyle = "#111111";
    context.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    const context = canvas.getContext("2d");
    context.clearRect(0, 0, canvas.width, canvas.height);
  };

  const saveSignature = () => {
    const canvas = canvasRef.current;
    const dataUrl = canvas.toDataURL("image/png");
    onSave(dataUrl);
  };

  return (
    <div className="signature-box">
      <canvas
        ref={canvasRef}
        width="640"
        height="240"
        className="signature-canvas"
        onMouseDown={startDrawing}
        onMouseMove={draw}
        onMouseUp={stopDrawing}
        onMouseLeave={stopDrawing}
        onTouchStart={startDrawing}
        onTouchMove={draw}
        onTouchEnd={stopDrawing}
      />
      <div className="action-row">
        <button className="secondary-action" type="button" onClick={clearSignature}>Clear</button>
        <button className="primary-action" type="button" onClick={saveSignature}>Save signature</button>
      </div>
    </div>
  );
}
