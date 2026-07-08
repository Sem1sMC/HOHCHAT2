import React, { useState, useEffect, useRef } from 'react';

function VoiceChannel({ channelName, channelId, currentUser }) {
    const [isConnected, setIsConnected] = useState(false);
    const [participants, setParticipants] = useState([]);
    const [isMuted, setIsMuted] = useState(false);
    const [isDeafened, setIsDeafened] = useState(false);
    const [speakingUsers, setSpeakingUsers] = useState({});
    
    const wsRef = useRef(null);
    const localStreamRef = useRef(null);

    const connectToChannel = async () => {
        try {
            if (!currentUser) {
                alert('Сначала войдите в аккаунт');
                return;
            }

            const ws = new WebSocket(`wss://hohchat.onrender.com?userId=${currentUser.id}`);
            wsRef.current = ws;

            ws.onopen = () => {
                console.log('✅ Подключен к голосовому серверу');
                ws.send(JSON.stringify({
                    type: 'join_voice_channel',
                    channelId: channelId,
                    userId: currentUser.id,
                    username: currentUser.username
                }));
            };

            ws.onmessage = (event) => {
                const data = JSON.parse(event.data);
                handleVoiceSignal(data);
            };

            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true
                }
            });
            localStreamRef.current = stream;

            setIsConnected(true);

        } catch (error) {
            console.error('❌ Ошибка подключения:', error);
            alert('Не удалось получить доступ к микрофону');
        }
    };

    const handleVoiceSignal = (data) => {
        switch (data.type) {
            case 'user_joined':
                setParticipants(prev => [...prev, {
                    id: data.userId,
                    username: data.username || 'Пользователь'
                }]);
                break;

            case 'user_left':
                setParticipants(prev => prev.filter(p => p.id !== data.userId));
                break;

            case 'speaking_status':
                setSpeakingUsers(prev => ({
                    ...prev,
                    [data.userId]: data.isSpeaking
                }));
                break;

            default:
                console.log('📨 Неизвестный сигнал:', data.type);
        }
    };

    const leaveChannel = () => {
        if (wsRef.current) {
            wsRef.current.send(JSON.stringify({
                type: 'leave_voice_channel',
                channelId: channelId,
                userId: currentUser?.id
            }));
            wsRef.current.close();
        }

        if (localStreamRef.current) {
            localStreamRef.current.getTracks().forEach(track => track.stop());
        }

        setIsConnected(false);
        setParticipants([]);
        setSpeakingUsers({});
    };

    const toggleMute = () => {
        if (localStreamRef.current) {
            localStreamRef.current.getAudioTracks().forEach(track => {
                track.enabled = !track.enabled;
            });
            setIsMuted(!isMuted);
        }
    };

    const toggleDeafen = () => {
        setIsDeafened(!isDeafened);
    };

    const getInitials = (name) => {
        return name ? name.charAt(0).toUpperCase() : '?';
    };

    return (
        <div className={`voice-channel ${isConnected ? 'connected' : ''}`}>
            <div className="voice-channel-name">
                <span className="icon">🔊</span>
                <span className="channel-title">{channelName}</span>
                {isConnected && (
                    <span className="status-badge">Подключен</span>
                )}
                <div className="voice-channel-actions">
                    {!isConnected ? (
                        <button className="btn-join" onClick={connectToChannel}>
                            Подключиться
                        </button>
                    ) : (
                        <button className="btn-leave" onClick={leaveChannel}>
                            Выйти
                        </button>
                    )}
                </div>
            </div>

            {isConnected && (
                <>
                    <div className="voice-participants">
                        {participants.map(user => (
                            <div key={user.id} className="voice-participant">
                                <div className="avatar">{getInitials(user.username)}</div>
                                <span className="username">{user.username}</span>
                                <span className={`status-dot ${speakingUsers[user.id] ? 'speaking' : 'idle'}`}></span>
                            </div>
                        ))}
                        {participants.length === 0 && (
                            <div className="voice-empty">В канале никого нет</div>
                        )}
                    </div>

                    <div className="voice-controls">
                        <button 
                            onClick={toggleMute}
                            className={isMuted ? 'muted' : ''}
                            title={isMuted ? 'Включить микрофон' : 'Отключить микрофон'}
                        >
                            {isMuted ? '🔇' : '🎤'}
                        </button>
                        <button 
                            onClick={toggleDeafen}
                            className={isDeafened ? 'muted' : ''}
                            title={isDeafened ? 'Включить звук' : 'Отключить звук'}
                        >
                            {isDeafened ? '🔕' : '🔊'}
                        </button>
                    </div>
                </>
            )}
        </div>
    );
}

export default VoiceChannel;
