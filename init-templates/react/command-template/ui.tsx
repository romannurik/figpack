import { createIframeMessenger } from 'figma-messenger';
import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom';
import { Button, Input, Label, Title } from 'react-figma-plugin-ds';
import './ui.scss';

const messenger = createIframeMessenger<Cmd1IframeToMain, Cmd1MainToIframe>();

function App() {
  let [value, setValue] = useState('');

  useEffect(() => {
    messenger.on('init', ({ initialValue }) => setValue(initialValue));
  }, []);

  return <>
    <Title weight="bold">Command 1</Title>
    <Label>Enter a value:</Label>
    <Input placeholder="" defaultValue={value} onChange={val => setValue(val)} />
    <Label>
      <span>Current value: <span className="purple">{value}</span></span>
    </Label>
    <div className="buttons">
      <Button onClick={() => messenger.send('save', { result: value })}>Save</Button>
      <Button onClick={() => messenger.send('cancel')} isSecondary>Cancel</Button>
    </div>
  </>;
}

ReactDOM.render(<App />, document.querySelector('.root'));
