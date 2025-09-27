import React, { useState, useEffect, useRef } from 'react';
import Peer from 'peerjs';

export default function App() {
  const [peer, setPeer] = useState(null);
  const [conn, setConn] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [username, setUsername] = useState(`User_${Math.floor(Math.random()*1000)}`);
  const [videoUrl, setVideoUrl] = useState('');
  const [currentVideoUrl, setCurrentVideoUrl] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmations, setDeleteConfirmations] = useState({});
  const [flashMessage, setFlashMessage] = useState(null);
  const [emojiRain, setEmojiRain] = useState([]);

  useEffect(() => {
    const p = new Peer();
    setPeer(p);

    p.on('open', id => {
      console.log("Peer connected:", id);
    });

    p.on('connection', c => {
      setConn(c);
      c.on('data', handleData);
    });
  }, []);

  const handleData = (data) => {
    if(data.type === 'chat'){
      setMessages(m=>[...m,{user:data.user,msg:data.msg}]);
    }
    if(data.type === 'flash'){
      triggerFlash(data.msg);
    }
    if(data.type === 'emoji'){
      blastEmoji(data.emoji);
    }
    if(data.type === 'video'){
      setCurrentVideoUrl(data.url);
    }
    if(data.type === 'deleteReq'){
      setShowDeleteModal(true);
    }
    if(data.type === 'deleteConfirm'){
      setDeleteConfirmations(prev => {
        const updated = {...prev,[data.user]:true};
        if(Object.keys(updated).length >= 2){
          setMessages([]); // clear chat when both confirmed
          setShowDeleteModal(false);
          return {};
        }
        return updated;
      });
    }
  };

  const sendMessage = (msg) => {
    if(!msg.trim()) return;
    const payload = {type:'chat',user:username,msg};
    setMessages(m=>[...m,{user:username,msg}]);
    conn && conn.send(payload);
    setText('');
  };

  const handleEnterKey = (e) => {
    if(e.key === 'Enter') sendMessage(text);
  };

  const triggerFlash = (msg) => {
    setFlashMessage(msg);
    setTimeout(()=>setFlashMessage(null),3000);
  };

  const blastEmoji = (emoji) => {
    let drops = [];
    for(let i=0;i<50;i++){
      drops.push({
        e:emoji,
        left:Math.random()*100,
        top:-20,
        rotate:Math.random()*360
      });
    }
    setEmojiRain(drops);
    setTimeout(()=>setEmojiRain([]),3000);
  };

  const requestDelete = () => {
    setShowDeleteModal(true);
    conn && conn.send({type:'deleteReq'});
  };

  const confirmDelete = () => {
    conn && conn.send({type:'deleteConfirm',user:username});
    setDeleteConfirmations(prev=>({...prev,[username]:true}));
  };

  const cancelDelete = () => {
    setShowDeleteModal(false);
    setDeleteConfirmations({});
  };

  const loadVideo = () => {
    if(!videoUrl.trim()) return;
    setCurrentVideoUrl(videoUrl);
    conn && conn.send({type:'video',url:videoUrl});
  };

  return (
    <div className='app'>
      {/* Chat UI */}
      <div className="chat-container">
        <div className="chat-header">
          <h2>Chat</h2>
          <button onClick={requestDelete}>Delete All</button>
        </div>
        <div className="chat-box">
          {messages.map((m,i)=>(
            <div key={i} className={`chat-msg ${m.user===username?'me':'other'}`}>
              <div className="chat-user">{m.user}</div>
              <div className="chat-text">{m.msg}</div>
            </div>
          ))}
        </div>
        <div className="chat-input">
          <input 
            type="text" 
            value={text} 
            onChange={e=>setText(e.target.value)} 
            onKeyDown={handleEnterKey} 
            placeholder="Type message..." 
          />
          <button onClick={()=>sendMessage(text)}>Send</button>
          <button onClick={()=>{triggerFlash("Surprise!"); conn && conn.send({type:'flash',msg:"Surprise!"});}}>Surprise Me</button>
          <select onChange={e=>{blastEmoji(e.target.value); conn && conn.send({type:'emoji',emoji:e.target.value})}}>
            <option value="">Emoji</option>
            {["😂","😍","🔥","💖","🎉","🌸","🍕"].map(e=><option key={e} value={e}>{e}</option>)}
          </select>
        </div>
      </div>

      {/* Video Player */}
      <div className="video-section">
        <input type="text" value={videoUrl} onChange={e=>setVideoUrl(e.target.value)} placeholder="Enter YouTube URL" />
        <button onClick={loadVideo}>Load Video</button>
        {currentVideoUrl && (
          <div className="video-frame">
            <iframe 
              width="100%" 
              height="315" 
              src={currentVideoUrl.replace("watch?v=","embed/")} 
              frameBorder="0" 
              allow="autoplay; encrypted-media" 
              allowFullScreen
              title="YouTube Video"
            ></iframe>
          </div>
        )}
      </div>

      {/* Flash message */}
      {flashMessage && <div className="flash-msg">{flashMessage}</div>}

      {/* Emoji rain */}
      {emojiRain.map((e,i)=>(
        <div key={i} className="emoji-rain" style={{left:`${e.left}%`,top:`${e.top}px`,transform:`rotate(${e.rotate}deg)`}}>{e.e}</div>
      ))}

      {/* Delete modal */}
      {showDeleteModal && (
        <div className="modal">
          <div className="modal-box">
            <p>Do both of you want to delete all chat?</p>
            <button onClick={confirmDelete}>YES</button>
            <button onClick={cancelDelete}>NO</button>
          </div>
        </div>
      )}
    </div>
  )
}
