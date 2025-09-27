import React, { useEffect, useState, useRef } from 'react';
import './App.css';
import { initializeApp } from "firebase/app";
import { getDatabase, ref, onValue, set } from "firebase/database";
import Peer from 'peerjs';

// -------------------- CONFIG --------------------
const firebaseConfig = {
  apiKey: "AIzaSyC-5glYkkh9TQVt4Rh0cJA9LU68SvJqNSg",
  authDomain: "momo-mumbai.firebaseapp.com",
  databaseURL: "https://momo-mumbai-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "momo-mumbai",
  storageBucket: "momo-mumbai.appspot.com",
  messagingSenderId: "480537909895",
  appId: "1:480537909895:web:1a6806e44787074fd3b622"
};

const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

const ROOM_ID = 'vadapav-momo-night';
const NICKNAMES = ['ud0_0','CompetitiveExpert973'];

const emojis = ['❤️','😂','🥟','🍔','🌧️','🏙️','🎶','✨'];
const SURPRISES = [
  'Vadapav + Momo = Best Combo ❤️',
  'Fireworks! From Mumbai rains to Dubai skies ✨',
  'Meme: Long-distance snack debate 😂',
  'Which is spicier? Vadapav or Momo? 🌶️'
];

export default function App() {
  const [nickname, setNickname] = useState('');
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [clickCount, setClickCount] = useState(0);
  const [surprises, setSurprises] = useState([]);
  const [emojiRain, setEmojiRain] = useState([]);
  const chatRefDiv = useRef();
  const [indiaTime, setIndiaTime] = useState('');
  const [dubaiTime, setDubaiTime] = useState('');
  const [peerId, setPeerId] = useState('');
  const [partnerPeerId, setPartnerPeerId] = useState('');
  const localStreamRef = useRef(null);
  const callRef = useRef(null);
  const peerRef = useRef(null);

  // Firebase listener
  useEffect(() => {
    const chatRefFirebase = ref(database, `rooms/${ROOM_ID}/chat`);
    onValue(chatRefFirebase, snapshot => {
      const data = snapshot.val();
      if (data && data.message) {
        const msg = data.message;
        setMessages(prev => prev.length && prev[prev.length-1].id===msg.id?prev:[...prev,msg]);
        chatRefDiv.current.scrollTop = chatRefDiv.current.scrollHeight;
      }
    });
  }, []);

  // Clocks
  useEffect(() => {
    const timer = setInterval(()=>{
      const india = new Date().toLocaleTimeString('en-US',{timeZone:'Asia/Kolkata'});
      const dubai = new Date().toLocaleTimeString('en-US',{timeZone:'Asia/Dubai'});
      setIndiaTime(india);
      setDubaiTime(dubai);
    },1000);
    return ()=>clearInterval(timer);
  },[]);

  // PeerJS
  useEffect(() => {
    const peer = new Peer();
    peerRef.current = peer;
    peer.on('open', id => setPeerId(id));
    peer.on('call', async call => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio:true });
        localStreamRef.current = stream;
        call.answer(stream);
        call.on('stream', remoteStream => {
          const audioEl = document.getElementById('remoteAudio');
          if(audioEl) audioEl.srcObject = remoteStream;
        });
        callRef.current = call;
      } catch(e){
        console.warn('Mic access denied', e);
      }
    });
  }, []);

  const startCall = async () => {
    if(!partnerPeerId) return alert('Enter partner Peer ID');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio:true });
      localStreamRef.current = stream;
      const call = peerRef.current.call(partnerPeerId, stream);
      call.on('stream', remoteStream => {
        const audioEl = document.getElementById('remoteAudio');
        if(audioEl) audioEl.srcObject = remoteStream;
      });
      callRef.current = call;
    } catch(e){
      alert('Mic access required');
    }
  };

  // Send chat message
  const sendMessage = (msgText)=>{
    if(!msgText.trim()) return;
    const msgObj = {id:`${Date.now()}-${Math.random()}`, from:nickname, text:msgText, ts:Date.now()};
    set(ref(database, `rooms/${ROOM_ID}/chat`), {message:msgObj});
    setText('');
  };

  // Emoji rain
  const handleEmojiClick = (emoji)=>{
    setText(prev=>prev+emoji);
    setEmojiRain(prev=>[...prev,emoji]);
    setTimeout(()=>setEmojiRain(prev=>prev.slice(1)),3000);
  };

  // Surprises
  const handleClickSurprise = ()=>{
    const next = clickCount % SURPRISES.length;
    setSurprises(prev=>[...prev,SURPRISES[next]]);
    setClickCount(prev=>prev+1);
  };

  if(!nickname){
    return (
      <div className='nickname-select'>
        <h2>Select your nickname</h2>
        {NICKNAMES.map(nick=><button key={nick} onClick={()=>setNickname(nick)}>{nick}</button>)}
      </div>
    )
  }

  return (
    <div className='app-container'>
      <audio id='remoteAudio' autoPlay />
      <div className='chat-header'>
        <div><strong>{NICKNAMES[0]}</strong> 🌧️ x <strong>{NICKNAMES[1]}</strong> 🏙️</div>
        <div className='text-sm text-gray-600'>India: {indiaTime} | Dubai: {dubaiTime}</div>
      </div>

      <div ref={chatRefDiv} className='chat-window'>
        {messages.map(m=>(
          <div key={m.id} className={`chat-message ${m.from===nickname?'self':'partner'}`}>{m.text}</div>
        ))}
      </div>

      <div className='chat-input'>
        <input value={text} onChange={e=>setText(e.target.value)} placeholder='Say something...' />
        <button onClick={()=>sendMessage(text)}>Send</button>
        <button onClick={()=>handleEmojiClick(emojis[Math.floor(Math.random()*emojis.length)])}>😊</button>
      </div>

      <div className='text-center my-2'>
        <button onClick={handleClickSurprise} className='surprise-btn'>Click Surprise!</button>
      </div>

      <div className='flex justify-around mt-2'>
        <iframe width='48%' height='200' src='https://www.youtube.com/embed/2Vv-BfVoq4g?enablejsapi=1' frameBorder='0' allowFullScreen></iframe>
        <iframe width='48%' height='200' src='' frameBorder='0' allowFullScreen></iframe>
      </div>

      <div className='text-center flex flex-col gap-1'>
        {surprises.map((s,i)=><div key={i} className='surprise'>{s}</div>)}
      </div>

      <div className='flex justify-center gap-2 p-2'>
        <input value={partnerPeerId} onChange={e=>setPartnerPeerId(e.target.value)} placeholder='Partner Peer ID' />
        <button onClick={startCall}>Start Voice</button>
        <div className='text-xs ml-2'>Your Peer ID: {peerId}</div>
      </div>

      {emojiRain.map((e,i)=><div key={i} style={{position:'absolute',top:Math.random()*window.innerHeight,left:Math.random()*window.innerWidth,fontSize:'2rem',pointerEvents:'none'}}>{e}</div>)}
    </div>
  );
}
