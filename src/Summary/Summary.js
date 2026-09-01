import { useState, useEffect } from 'react';
import api from '../api';
import './Summary.css';
import { Spinner } from '../MyLib';

function Summary(props) {
  const [players, setPlayers] = useState(null);

  useEffect(() => {
    api.getSummary().then(result => {
      setPlayers(result.data);
    }).catch(error => {
      console.error("Failed to fetch summary:", error);
    });
  }, []);

  if (!players) {
    return <div className='loading'><Spinner waiting dark={true} /></div>;
  }

  return (
    <div className="summary-container" style={props.style}>
      {players.map((p, pi) => (
        <div key={pi} className="summary-player">
          <div className="summary-content">
            {p.entries.map((entry, i) => (
              <div key={i} className="summary-entry">
                {entry.by && <div className="summary-by">{entry.by}</div>}
                {entry.type === 'drawing'
                  ? <img src={entry.value} alt="drawing" className="summary-image" />
                  : <div className="summary-word">{entry.value}</div>}
              </div>
            ))}
          </div>
          {pi < players.length - 1 && <div className="summary-separator" />}
        </div>
      ))}
    </div>
  );
}

export default Summary;
