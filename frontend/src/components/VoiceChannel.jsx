import React, { useState, useEffect, useRef } from 'react';

function VoiceChannel({ channelName, channelId, currentUser }) {
    const [isConnected, setIsConnected] = useState(false);
    const [participants, setParticipants] = useState([]);
    const [isMuted, setIsMuted] = useState(false);
    const [isDeafened, setIsDeafened] = useState(false);
    const [isSpeaking, setIsSpeaking] = useState(false);
    
    const wsRef = useRef(null);
    const peerConnectionsRef = useRef({});
    const localStreamRef = useRef(null);
    const audioContextRef = useRef(null);
    const analyserRef = useRef(null);
    const dataArrayRef = useRef(null);

    // Подключение к голосовому каналу
    const connectToChannel = async () => {
        try {
            // Подключаемся к WebSocket
            const ws = new WebSocket(`wss://hohchat.onrender.com?userId=${currentUser.id}`);
            wsRef.current = ws;

            ws.onopen = () => {
                console.log('✅ Подключен к голосовому серверу');
                
                // Отправляем запрос на вход в канал
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

            // Получаем доступ к микрофону
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true
                }
            });
            localStreamRef.current = stream;

            // Настраиваем аудиоанализатор (для индикатора говорения)
            const audioContext = new AudioContext();
            audioContextRef.current = audioContext;
            const source = audioContext.createMediaStreamSource(stream);
            const analyser = audioContext.createAnalyser();
            analyser.fftSize = 256;
            source.connect(analyser);
            analyserRef.current = analyser;
            dataArrayRef.current = new Uint8Array(analyser.frequencyBinCount);

            // Отслеживаем говорение
            detectSpeaking();

            setIsConnected(true);
            console.log('✅ Подключен к голосовому каналу');

        } catch (error) {
            console.error('❌ Ошибка подключения:', error);
            alert('Не удалось получить доступ к микрофону');
        }
    };

    // Отслеживание говорения
    const detectSpeaking = () => {
        if (!analyserRef.current) return;

        const analyser = analyserRef.current;
        const dataArray = dataArrayRef.current;

        setInterval(() => {
            analyser.getByteFrequencyData(dataArray);
            const sum = dataArray.reduce((a, b) => a + b, 0);
            const average = sum / dataArray.length;
            
            // Если громкость выше порога
            const speaking = average > 30;
            if (speaking !== isSpeaking) {
                setIsSpeaking(speaking);
                // Отправляем статус говорения
                if (wsRef.current) {
                    wsRef.current.send(JSON.stringify({
                        type: 'speaking_status',
                        userId: currentUser.id,
                        isSpeaking: speaking
                    }));
                }
            }
        }, 100);
    };

    // Обработка голосовых сигналов
    const handleVoiceSignal = async (data) => {
        switch (data.type) {
            case 'user_joined':
                setParticipants(prev => [...prev, {
                    id: data.userId,
                    username: data.username,
                    isSpeaking: false
                }]);
                // Создаем PeerConnection для нового пользователя
                createPeerConnection(data.userId);
                break;

            case 'user_left':
                setParticipants(prev => prev.filter(p => p.id !== data.userId));
                if (peerConnectionsRef.current[data.userId]) {
                    peerConnectionsRef.current[data.userId].close();
                    delete peerConnectionsRef.current[data.userId];
                }
                break;

            case 'offer':
                await handleOffer(data);
                break;

            case 'answer':
                await handleAnswer(data);
                break;

            case 'candidate':
                await handleCandidate(data);
                break;

            case 'speaking_status':
                setParticipants(prev => 
                    prev.map(p => 
                        p.id === data.userId 
                            ? { ...p, isSpeaking: data.isSpeaking }
                            : p
                    )
                );
                break;

            default:
                console.log('📨 Неизвестный сигнал:', data.type);
        }
    };

    // Создание PeerConnection
    const createPeerConnection = (userId) => {
        const configuration = {
            iceServers: [
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:stun1.l.google.com:19302' }
            ]
        };

        const pc = new RTCPeerConnection(configuration);
        peerConnectionsRef.current[userId] = pc;

        // Добавляем локальный аудиопоток
        if (localStreamRef.current) {
            localStreamRef.current.getTracks().forEach(track => {
                pc.addTrack(track, localStreamRef.current);
            });
        }

        // Обработка входящих аудиопотоков
        pc.ontrack = (event) => {
            const audio = new Audio();
            audio.srcObject = event.streams[0];
            audio.play();
            // Добавляем звук в аудиоконтекст (для микширования)
            const source = audioContextRef.current.createMediaStreamSource(event.streams[0]);
            source.connect(audioContextRef.current.destination);
        };

        // ICE кандидаты
        pc.onicecandidate = (event) => {
            if (event.candidate) {
                wsRef.current.send(JSON.stringify({
                    type: 'candidate',
                    targetUserId: userId,
                    userId: currentUser.id,
                    candidate: event.candidate
                }));
            }
        };

        // Создаем offer
        pc.createOffer()
            .then(offer => pc.setLocalDescription(offer))
            .then(() => {
                wsRef.current.send(JSON.stringify({
                    type: 'offer',
                    targetUserId: userId,
                    userId: currentUser.id,
                    offer: pc.localDescription
                }));
            })
            .catch(console.error);
    };

    // Обработка offer
    const handleOffer = async (data) => {
        const pc = new RTCPeerConnection({
            iceServers: [
                { urls: 'stun:stun.l.google.com:19302' }
            ]
        });

        if (localStreamRef.current) {
            localStreamRef.current.getTracks().forEach(track => {
                pc.addTrack(track, localStreamRef.current);
            });
        }

        pc.ontrack = (event) => {
            const audio = new Audio();
            audio.srcObject = event.streams[0];
            audio.play();
        };

        pc.onicecandidate = (event) => {
            if (event.candidate) {
                wsRef.current.send(JSON.stringify({
                    type: 'candidate',
                    targetUserId: data.userId,
                    userId: currentUser.id,
                    candidate: event.candidate
                }));
            }
        };

        await pc.setRemoteDescription(new RTCSessionDescription(data.offer));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        wsRef.current.send(JSON.stringify({
            type: 'answer',
            targetUserId: data.userId,
            userId: currentUser.id,
            answer: pc.localDescription
        }));

        peerConnectionsRef.current[data.userId] = pc;
    };

    // Обработка answer
    const handleAnswer = async (data) => {
        const pc = peerConnectionsRef.current[data.userId];
        if (pc) {
            await pc.setRemoteDescription(new RTCSessionDescription(data.answer));
        }
    };

    // Обработка candidate
    const handleCandidate = async (data) => {
        const pc = peerConnectionsRef.current[data.userId];
        if (pc && data.candidate) {
            await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
        }
    };

    // Выход из канала
    const leaveChannel = () => {
        // Закрываем все PeerConnections
        Object.values(peerConnectionsRef.current).forEach(pc => pc.close());
        peerConnectionsRef.current = {};

        // Останавливаем локальный поток
        if (localStreamRef.current) {
            localStreamRef.current.getTracks().forEach(track => track.stop());
        }

        // Закрываем WebSocket
        if (wsRef.current) {
            wsRef.current.send(JSON.stringify({
                type: 'leave_voice_channel',
                channelId: channelId,
                userId: currentUser.id
            }));
            wsRef.current.close();
        }

        setIsConnected(false);
        setParticipants([]);
        setIsMuted(false);
        setIsDeafened(false);
    };

    // Отключить/включить микрофон
    const toggleMute = () => {
        if (localStreamRef.current) {
            localStreamRef.current.getAudioTracks().forEach(track => {
                track.enabled = !track.enabled;
            });
            setIsMuted(!isMuted);
        }
    };

    // Отключить/включить звук (глушение)
    const toggleDeafen = () => {
        setIsDeafened(!isDeafened);
        // Здесь можно отключить все аудиопотоки
    };

    return (
        <div className="bg-gray-800 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                    <span className="text-xl">🔊</span>
                    <h3 className="text-white font-semibold">{channelName}</h3>
                    {isConnected && (
                        <span className="text-xs text-green-400 flex items-center gap-1">
                            <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                            Подключен
                        </span>
                    )}
                </div>
                
                {!isConnected ? (
                    <button
                        onClick={connectToChannel}
                        className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition text-sm"
                    >
                        Подключиться
                    </button>
                ) : (
                    <button
                        onClick={leaveChannel}
                        className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition text-sm"
                    >
                        Выйти
                    </button>
                )}
            </div>

            {/* Участники */}
            {isConnected && (
                <div className="space-y-1">
                    {participants.map(user => (
                        <div key={user.id} className="flex items-center gap-2 text-sm text-gray-300">
                            <span className={`w-2 h-2 rounded-full ${user.isSpeaking ? 'bg-green-400 animate-pulse' : 'bg-gray-500'}`}></span>
                            <span>{user.username}</span>
                            {user.id === currentUser?.id && <span className="text-xs text-gray-500">(вы)</span>}
                        </div>
                    ))}
                    {participants.length === 0 && (
                        <div className="text-sm text-gray-500">В канале никого нет</div>
                    )}
                </div>
            )}

            {/* Управление */}
            {isConnected && (
                <div className="flex gap-2 mt-3">
                    <button
                        onClick={toggleMute}
                        className={`p-2 rounded-lg transition ${isMuted ? 'bg-red-600' : 'bg-gray-700'} hover:bg-gray-600`}
                    >
                        {isMuted ? '🔇' : '🎤'}
                    </button>
                    <button
                        onClick={toggleDeafen}
                        className={`p-2 rounded-lg transition ${isDeafened ? 'bg-red-600' : 'bg-gray-700'} hover:bg-gray-600`}
                    >
                        {isDeafened ? '🔕' : '🔊'}
                    </button>
                </div>
            )}
        </div>
    );
}

export default VoiceChannel;
