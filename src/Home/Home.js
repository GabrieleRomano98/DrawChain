import { Button, Alert } from '../MyLib';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import { useStore } from '../store';

import './Home.css';

function Home(props) {
  const store = useStore();
  const [name, setName] = useState(store.name);
  const [showAlert, setShowAlert] = useState(false);
  const [waiting, setWaiting] = useState(false);

  const navigate = useNavigate();
  const handleStart = async () => {
    setWaiting(true);
    try {
      if (props.join) {
        await api.joinGame(store.code, name);
      } else {
        await api.createGame(name);
      }
      store.setName(name);
      props.navigate('/room', navigate);
    } catch (error) {
      console.error("Failed to join game:", error);
      setWaiting(false);
      setShowAlert(true);
      setTimeout(() => setShowAlert(false), 3000);
    }
  };
  const disabled = name === "";
  return <div style={props.style}>
    <Alert text="Communication error" color='#E4572E' show={showAlert} dark />
    <div className='home'>
      <div className='home-input'>
        <div>Name</div>
        <input type="text" className='input-code'
          value={name} onChange={e => setName(e.target.value)}
          placeholder="Your name in game" />
      </div>
      <Button className='home-button' text={props.join ? "Join" : "Host"}
        disabled={disabled} blue onClick={handleStart} waiting={waiting} />

    </div>
  </div>;
}

export default Home;
