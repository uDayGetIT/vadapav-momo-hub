import React, { useEffect, useState, useRef } from 'react';
import './App.css';
import { initializeApp } from "firebase/app";
import { getDatabase, ref, onValue, set, remove } from "firebase/database";
import Peer from 'peerjs';

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
const EMOJIS = ['❤️','😂','🥟','🍔','🌧️','🏙️','🎶','✨'];
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
  const [emojiRain, setEmojiRain] = useState([]);
  const [youtubeURL, setYoutubeURL] = useState('');
  const [indiaTime, setIndiaTime] = useState('');
  const [dubaiTime, setDubaiTime] = useState('');
  const [micActive, setMicActive] = useState(false);
  const [deleteRequest, setDeleteRequest] = useState([]);
  const chatRefDiv = useRef();
  const localStreamRef = useRef(null);
  const peerRef = useRef(null);
  const callRef = useRef(null);
  const playerRef = useRef(null);
  const ignoreNext = useRef(false);
  const surpriseCount = useRef(0);

  // Load Firebase data
  useEffect(()=>{
    const chatRefFirebase = ref(database, `rooms/${ROOM_ID}/chat`);
    onValue(chatRefFirebase, snapshot=>{
      const data = snapshot.val();
      if(data && data.message){
        const msg = data.message;
        setMessages(prev=>prev.length && prev[prev.length-1].id===msg.id?prev:[...prev,msg]);
        chatRefDiv.current.scrollTop = chatRefDiv.current.scrollHeight;
      }
    });

    const youtubeRef = ref(database, `rooms/${ROOM_ID}/youtube`);
    onValue(youtubeRef, snapshot=>{
      const data = snapshot.val();
      if(data && data.url){
        setYoutubeURL(data.url);
        if(playerRef.current){
          playerRef.current.loadVideoById(extractVideoID(data.url));
        }
      }
    });

    const emojiRef = ref(database, `rooms/${ROOM_ID}/emoji`);
    onValue(emojiRef, snapshot=>{
      const data = snapshot.val();
      if(data && data.emoji){
        // Blast emoji everywhere
        const emojiArray = [];
        for(let i=0;i<50;i++){
          emojiArray.push({
            e:data.emoji,
            left: Math.random()*100,
            rotate: Math.random()*360
          });
        }
        setEmojiRain(emojiArray);
        setTimeout(()=>setEmojiRain([]),3000);
      }
    });

    const ytActionRef = ref(database, `rooms/${ROOM_ID}/youtubeAction`);
    onValue(ytActionRef, snapshot=>{
      const data = snapshot.val();
      if(data && playerRef.current){
        if(ignoreNext.current){ ignoreNext.current=false; return; }
        switch(data.action){
          case 'play':
            playerRef.current.seekTo(data.time||0,true);
            playerRef.current.playVideo();
            break;
          case 'pause':
            playerRef.current.pauseVideo();
            break;
          case 'seek':
            playerRef.current.seekTo(data.time||0,true);
            break;
        }
      }
    });

    const deleteRef = ref(database, `rooms/${ROOM_ID}/deleteRequest`);
    onValue(deleteRef, snapshot=>{
      const data = snapshot.val();
      setDeleteRequest(data ? Object.values(data) : []);
      if(data && Object.values(data).filter(v=>v==='YES').length===2){
        remove(ref(database, `rooms/${ROOM_ID}/chat`));
        remove(ref(database, `rooms/${ROOM_ID}/deleteRequest`));
      }
    });
  },[]);

  // Clock
  useEffect(()=>{
    const timer = setInterval(()=>{
      const india = new Date().toLocaleTimeString('en-US',{timeZone:'Asia/Kolkata'});
      const dubai = new Date().toLocaleTimeString('en-US',{timeZone:'Asia/Dubai'});
      setIndiaTime(india);
      setDubaiTime(dubai);
    },1000);
    return ()=>clearInterval(timer);
  },[]);

  // PeerJS setup
  useEffect(()=>{
    const peer = new Peer();
    peerRef.current = peer;
    peer.on('call', async call=>{
      try{
        const stream = await navigator.mediaDevices.getUserMedia({audio:true});
        localStreamRef.current = stream;
        call.answer(stream);
        call.on('stream', remoteStream=>{
          const audioEl = document.getElementById('remoteAudio');
          if(audioEl) audioEl.srcObject = remoteStream;
        });
        callRef.current = call;
      }catch(e){ console.warn('Mic denied',e);}
    });
  },[]);

  // YouTube API
  useEffect(()=>{
    const tag = document.createElement('script');
    tag.src = "https://www.youtube.com/iframe_api";
    document.body.appendChild(tag);
    window.onYouTubeIframeAPIReady = () => {
      playerRef.current = new window.YT.Player('yt-player', {
        height: '250',
        width: '100%',
        videoId: extractVideoID(youtubeURL),
        playerVars:{controls:1},
        events:{'onStateChange':onPlayerStateChange}
      });
    };
  },[]);

  const extractVideoID = url=>{
    const reg = /[?&]v=([^&#]+)/;
    const match = url.match(reg);
    return match ? match[1] : url;
  };

  const onPlayerStateChange = event=>{
    if(!playerRef.current) return;
    const state = event.data;
    const currentTime = playerRef.current.getCurrentTime();
    ignoreNext.current=true;
    if(state===1){
      set(ref(database, `rooms/${ROOM_ID}/youtubeAction`), {action:'play', time:currentTime, ts:Date.now()});
    } else if(state===2){
      set(ref(database, `rooms/${ROOM_ID}/youtubeAction`), {action:'pause', time:currentTime, ts:Date.now()});
    }
  };

  const sendMessage = msgText=>{
    if(!msgText.trim()) return;
    const msgObj = {id:`${Date.now()}-${Math.random()}`, from:nickname, text:msgText, ts:Date.now()};
    set(ref(database, `rooms/${ROOM_ID}/chat`), {message:msgObj});
    setText('');
  };

  const sendEmoji = emoji=>{
    set(ref(database, `rooms/${ROOM_ID}/emoji`), {emoji});
  };

  const handleSurprise = ()=>{
    const next = surpriseCount.current % SURPRISES.length;
    const surpriseMsg = {id:`surp-${Date.now()}`, from:'🎉Surprise', text:SURPRISES[next], ts:Date.now()};
    set(ref(database, `rooms/${ROOM_ID}/chat`), {message:surpriseMsg});
    surpriseCount.current++;
    setTimeout(()=>setMessages(prev=>prev.filter(m=>m.id!==surpriseMsg.id)),3000);
  };

  const updateYoutubeURL = url=>{
    set(ref(database, `rooms/${ROOM_ID}/youtube`), {url});
  };

  const handleMicDown = async ()=>{
    try{
      const stream = await navigator.mediaDevices.getUserMedia({audio:true});
      localStreamRef.current = stream;
      const call = peerRef.current.call('broadcast', stream);
      callRef.current = call;
      setMicActive(true);
    }catch(e){ alert('Mic access required'); }
  };

  const handleMicUp = ()=>{
    if(localStreamRef.current){
      localStreamRef.current.getTracks().forEach(t=>t.stop());
      setMicActive(false);
    }
  };

  const requestDelete = ()=>{
    set(ref(database, `rooms/${ROOM_ID}/deleteRequest/${nickname}`),'YES');
  };

  const handleEnterKey = e=>{
    if(e.key==='Enter') sendMessage(text);
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
      <div className='header'>
        <div><strong>{NICKNAMES[0]}</strong> 🌧️ x <strong>{NICKNAMES[1]}</strong> 🏙️</div>
        <div className='text-sm text-gray-600'>India: {indiaTime} | Dubai: {dubaiTime}</div>
      </div>

      <div className='main-content'>
        <div className='video-section'>
          <div id='yt-player' style={{width:'100%',height:'250px',background:'#000'}}></div>
          <div className='youtube-sync'>
            <input type="text" placeholder="Paste YouTube URL" value={youtubeURL} onChange={e=>setYoutubeURL(e.target.value)} />
            <button onClick={()=>updateYoutubeURL(youtubeURL)}>Load Video</button>
          </div>
          <button onClick={handleSurprise} className='surprise-btn'>Surprise Me!</button>
          <button onClick={requestDelete} className='delete-btn'>Delete All Chat</button>
        </div>

        <div className='chat-container'>
          <div className='chat-window' ref={chatRefDiv}>
            {messages.map(m=>(
              <div key={m.id} className={`chat-message ${m.from===nickname?'self':'partner'}`}>
                <strong>{m.from}:</strong> {m.text}
              </div>
            ))}
          </div>

          <div className='chat-input'>
            <input value={text} onChange={e=>setText(e.target.value)} onKeyDown={handleEnterKey} placeholder='Say something...' />
            <button onClick={()=>sendMessage(text)}>Send</button>
            <select onChange={e=>sendEmoji(e.target.value)} defaultValue="">
              <option value="" disabled>Emoji 🌟</option>
              {EMOJIS.map(e=><option key={e} value={e}>{e}</option>)}
            </select>
            <button className={`mic-btn ${micActive?'active':''}`} onMouseDown={handleMicDown} onMouseUp={handleMicUp}>🎤 Hold to Talk</button>
          </div>
        </div>
      </div>

      {emojiRain.map((e,i)=><div key={i} className='emoji-rain' style={{left:`${e.left}%`, transform:`rotate(${e.rotate}deg)`}}>{e.e}</div>)}
    </div>
  );
}
