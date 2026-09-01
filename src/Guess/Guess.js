import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import './Guess.css';
import { Button, Spinner } from '../MyLib';

function Guess(props) {
  const [image, setImage] = useState("");
  const [guess, setGuess] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    api.getTurnInfo().then(result => {
      const data = result.data;
      if (data.finished) {
        props.navigate('/summary', navigate);
        return;
      }
      if (data.action !== 'guess') {
        props.navigate('/draw', navigate);
        return;
      }
      setImage(data.prompt);
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
    if (submitted || submitting || !guess.trim()) return;
    setSubmitting(true);
    api.submitTurn(guess.trim())
      .then(() => setSubmitted(true))
      .catch(error => console.error("Failed to submit guess:", error))
      .finally(() => setSubmitting(false));
  };

  if (loading) {
    return <div className='loading'><Spinner waiting dark={true} /></div>;
  }

  return (
    <div className="guess-container" style={props.style}>
      <div className="guess-image-wrapper">
        <img src={image} alt="Drawing to guess" className="guess-image" />
      </div>
      {submitted
        ? <div className="waiting-text">Waiting for other players…</div>
        : (
          <>
            <input className="guess-input" type="text" placeholder="What is it?"
              value={guess}
              onChange={e => setGuess(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSubmit()}
              autoFocus
            />
            <Button text="Submit" disabled={submitting || !guess.trim()} onClick={handleSubmit} />
          </>
        )}
    </div>
  );
}

export default Guess;
