import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, useNavigate, useParams } from 'react-router-dom';
import './App.css';
import Home from './Home/Home';
import Room from './Room/Room';
import Draw from './Draw/Draw';
import Guess from './Guess/Guess';
import Summary from './Summary/Summary';
import { Spinner } from './MyLib';
import { StoreProvider, useStore } from './store';

function Header(props) {
  return <header className="App-header">
    <div>ChainDraw</div>
  </header>;
}

function Redirecting(props) {
  const code = useParams().code || "";
  const store = useStore();
  const navigate = useNavigate();
  useEffect(() => {
    try {
      if (code) {
        store.setCode(code);
        navigate('/join');
        return;
      }
    } catch (error) {
      console.error("Failed to join game: ", error);
    }
    navigate('/');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return <div className='loading'><Spinner waiting dark={true} /></div>;
}

function App() {
  const [visibility, setVisibility] = useState(true);

  const navigate = (dest, navigate) => {
    setVisibility(false);
    setTimeout(() => {
      navigate(dest);
      setTimeout(() => setVisibility(true), 30);
    }, 500);
  };
  const pageStyle = {
    opacity: visibility ? 1 : 0,
    transition: 'opacity 0.5s'
  };

  return (
    <div className="App">
      <StoreProvider>
        <BrowserRouter>
          <Header navigate={navigate} />
          <Routes>
            <Route path="/" element={
              <Home style={pageStyle} navigate={navigate} join={false} />
            } />
            <Route path="/join" element={
              <Home style={pageStyle} navigate={navigate} join={true} />
            } />
            <Route path="/room" element={
              <Room style={pageStyle} navigate={navigate} />
            } />
            <Route path="/join/:code" element={
              <Redirecting style={pageStyle} navigate={navigate} />
            } />
            <Route path="/draw" element={
              <Draw style={pageStyle} navigate={navigate} />
            } />
            <Route path="/guess" element={
              <Guess style={pageStyle} navigate={navigate} />
            } />
            <Route path="/summary" element={
              <Summary style={pageStyle} navigate={navigate} />
            } />
          </Routes>
        </BrowserRouter>
      </StoreProvider>
    </div>
  );
}

export default App;
