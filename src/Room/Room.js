import { useEffect, useState } from 'react';
import { TbCancel } from "react-icons/tb";
import { Button, Spinner, Alert } from '../MyLib';
import api from '../api';
import './Room.css';
import { useNavigate } from 'react-router-dom';


function DeleteButton(props) {
  const [deleting, setDeleting] = useState(false);
  const deletePlayer = async () => {
    setDeleting(true);
    await props.deletePlayer();
  };
  return (
    <div className='delete loading' onClick={deletePlayer}>
      <Spinner waiting={deleting} />
      <TbCancel className='delete-icon' style={{ opacity: deleting ? 0 : 1 }} />
    </div>
  );
}

function Room(props) {
  const [isHost, setIsHost] = useState(false);
  const [host, setHost] = useState();
  const [players, setPlayers] = useState([]);
  const [starting, setStarting] = useState(false);
  const [code, setCode] = useState("");
  const navigate = useNavigate();
  const [showAlert, setShowAlert] = useState(false);
  useEffect(() => {
    api.getRoomInfo().then(result => {
      const data = result.data;
      setCode(data.code);
      setHost(data.host);
      setIsHost(data.isHost);
      setPlayers(data.players);
    });
    const eventSource = api.setEventSource((data) => {
      console.log("Received event:", data);
      if (data.type === 'game_started') {
        console.log('Game started! Navigating to draw...');
        props.navigate('/draw', navigate);
      }
      else if (data.type === 'player_joined') {
        addPlayer(data.data.playerName);
      }
    });
    return () => {
      eventSource.close();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const addPlayer = (name) => {
    setPlayers(v => {
      const newPlayer = { id: v.length, name: name };
      return [...v, newPlayer];
    });
  };
  const deletePlayer = async i => {
    await api.deletePlayer(i);
    setPlayers(v => v.filter(p => p.id !== i));
  }
  const copyLink = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url.substring(0, url.length - 4) + "join/" + code);
    setShowAlert(true);
    setTimeout(() => setShowAlert(false), 2000);
  }
  const startGame = () => {
    setStarting(true);
    api.startGame().then(() => {
      props.navigate('/draw', navigate);
    }).catch(error => {
      console.error("Failed to start game:", error);
      setStarting(false);
    });
  }
  return (
    <div>
      <Alert text="Link copied" show={showAlert} success />
      <div className='loading'>
        <div className='host'>PLAYERS</div>
        <Spinner waiting={!host} />
      </div>
      <div className='room'>
        <div className='player' style={{color: "#008f9f", justifyContent: "center"}}>{host}</div>
        {players.map((player, i) =>
          <div key={i} className='player'>
            {isHost &&<DeleteButton i={player.id} deletePlayer={() => deletePlayer(player.id)} />}
            {player.name}
          </div>
        )}
      </div>
      <Button text="Copy link" onClick={copyLink} blue />
      {isHost && <Button text="Start game" onClick={startGame} waiting={starting} disabled={!players.length} />}
    </div>
  );
}

export default Room;
