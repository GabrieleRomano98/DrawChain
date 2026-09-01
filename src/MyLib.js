import { useEffect, useState } from 'react';

function Spinner(props) {
  const [visible, setVisible] = useState(props.waiting);
  useEffect(() => {
    if (!props.waiting) {
      setTimeout(() => setVisible(false), 300);
      return;
    } else {
      setVisible(true);
    }
  }, [props.waiting]);
  const style = {
    opacity: props.waiting ? 1 : 0,
    zIndex: visible ? 1 : -1,
    ...props.style
  };
  const classname = "loader " + (props.dark ? "loader-dark" : "");
  return <span className={classname} style={style}></span>;
}

function Button(props) {
  const buttonStyle = {
    background: props.disabled ? '#abababff' : props.blue ? "#00BAFF" : "#56FFA3",
    color: props.waiting ? "transparent" : (props.dark || props.disabled ? 'white' : 'black'),
    marginBottom: '10px',
    ...props.style
  };
  const classname = "my-button " + (props.className ?? "");
  return <div className='loading'>
    <Spinner waiting={props.waiting} dark={props.dark} />
    <div style={buttonStyle} className={classname}
      onClick={() => !props.disabled && props.onClick()}>
      {props.text}</div>
  </div>;
}

function Alert(props) {
  const style = props.style ?? {};
  const defaultStyle = {
    ...style,
    zIndex: 10,
    backgroundColor: props.success ? "#56FFA3" : "#ff8472",
    visibility: props.show ? "visible" : "hidden"
  };
  return <div className='alert'
    style={defaultStyle}>
    {props.text}
  </div>;
}

export { Button, Spinner, Alert };
