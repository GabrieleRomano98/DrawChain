import { useRef, useEffect, useState, forwardRef, useImperativeHandle } from 'react';
import { useNavigate } from 'react-router-dom';
import { MdUndo, MdDeleteOutline } from 'react-icons/md';
import api from '../api';
import './Draw.css';
import { Button, Spinner } from '../MyLib';

const Canvas = forwardRef(function Canvas(props, ref) {
  const canvasRef = useRef(null);
  const [drawing, setDrawing] = useState(false);
  const [color, setColor] = useState('#17182E');
  const historyRef = useRef([]);

  useImperativeHandle(ref, () => ({
    // Lightest possible export: small, heavily-compressed JPEG data URL.
    getImage: () => canvasRef.current.toDataURL('image/jpeg', 0.5)
  }));

  useEffect(() => {
    const canvas = canvasRef.current;
    const resize = () => {
      const rect = canvas.parentElement.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.width;
      historyRef.current = [];
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    };
    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);

  const getPos = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const point = e.touches ? e.touches[0] : e;
    return { x: point.clientX - rect.left, y: point.clientY - rect.top };
  };

  const startDraw = (e) => {
    if (props.disabled) return;
    setDrawing(true);
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    historyRef.current.push(ctx.getImageData(0, 0, canvas.width, canvas.height));
    const { x, y } = getPos(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e) => {
    if (!drawing || props.disabled) return;
    const ctx = canvasRef.current.getContext('2d');
    const { x, y } = getPos(e);
    ctx.lineTo(x, y);
    ctx.strokeStyle = color;
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.stroke();
  };

  const endDraw = () => setDrawing(false);

  const clear = () => {
    if (props.disabled) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    historyRef.current.push(ctx.getImageData(0, 0, canvas.width, canvas.height));
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  };

  const undo = () => {
    if (props.disabled) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const lastState = historyRef.current.pop();
    if (lastState) {
      ctx.putImageData(lastState, 0, 0);
    } else {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
  };

  return (
    <>
      <div className="canvas-wrapper" style={props.disabled ? { pointerEvents: 'none' } : undefined}>
        <canvas
          ref={canvasRef}
          onMouseDown={startDraw}
          onMouseMove={draw}
          onMouseUp={endDraw}
          onMouseLeave={endDraw}
          onTouchStart={startDraw}
          onTouchMove={draw}
          onTouchEnd={endDraw}
        />
      </div>
      <div className='draw-toolbar'>
        <div className="draw-toolbar">
            {['#17182E', '#E4572E', '#29335C', '#FFCF56', '#ffffff'].map(c =>
            <div key={c} className={"color-swatch" + (color === c ? " selected" : "")}
            style={{ backgroundColor: c }} onClick={() => !props.disabled && setColor(c)} />
            )}
        </div>
        <div className='draw-toolbar'>
            <div className="icon-button" onClick={undo}><MdUndo /></div>
            <div className="icon-button" onClick={clear}><MdDeleteOutline /></div>
        </div>
      </div>
    </>
  );
});

function Draw(props) {
  const [word, setWord] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const canvasRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    api.getTurnInfo().then(result => {
      const data = result.data;
      if (data.finished) {
        props.navigate('/summary', navigate);
        return;
      }
      if (data.action !== 'draw') {
        props.navigate('/guess', navigate);
        return;
      }
      setWord(data.prompt);
      setSubmitted(data.waiting);
      setLoading(false);
    }).catch(error => {
      console.error("Failed to fetch turn info:", error);
    });

    const eventSource = api.setEventSource((data) => {
      if (data.type === 'round_started') {
        props.navigate(data.data.action === 'draw' ? '/draw' : '/guess', navigate);
      } else if (data.type === 'game_finished') {
        props.navigate('/summary', navigate);
      }
    });
    return () => eventSource.close();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = () => {
    if (submitted || submitting) return;
    setSubmitting(true);
    const image = canvasRef.current.getImage();
    api.submitTurn(image)
      .then(() => setSubmitted(true))
      .catch(error => console.error("Failed to submit drawing:", error))
      .finally(() => setSubmitting(false));
  };

  if (loading) {
    return <div className='loading'><Spinner waiting dark={true} /></div>;
  }

  return (
    <div className="draw-container" style={props.style}>
      <div className="draw-word">{word}</div>
      <Canvas ref={canvasRef} disabled={submitted} />
      {submitted
        ? <div className="waiting-text">Waiting for other players…</div>
        : <Button text="Submit" disabled={submitting} onClick={handleSubmit} />}
    </div>
  );
}

export default Draw;
