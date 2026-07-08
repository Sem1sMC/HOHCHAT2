import React, { useState, useRef, useEffect } from 'react';

function Call({ caller, callee, userId, isVideo, onEndCall }) {
    const [isConnected, setIsConnected] = useState(false);
    const [callDuration, setCallDuration] = useState(0);
    const [isMuted, setIsMuted] = useState(false);
    const [isVideoEnabled, setIsVideoEnabled] = useState(isVideo);
    const [isCalling, setIsCalling] = useState(true);
    const [error, setError] = useState('');
    
    const localVideoRef = useRef(null);
    const remoteVideoRef = useRef(null);
    const peerConnectionRef = useRef(null);
    const timerRef = useRef(null);
    const wsRef = useRef(null);

    // Подключение к WebSocket
    useEffect(() => {
        const user = JSON.parse(localStorage.getItem('chatUser'));
        if (!user) {
            setError('Пользователь не авторизован');
            return;
        }

        // Подключаемся к WebSocket
        const ws = new WebSocket(`wss://hohchat.onrender.com?userId=${user.id}`);
        wsRef.current = ws;

        ws.onopen = () => {
            console.log('✅ WebSocket подключен для звонка');
            startCall();
        };

        ws.onmessage = (event) => {
            const data = JSON.parse(event.data);
            handleSignaling(data);
        };

        ws.onerror = (error) => {
            console.error('❌ WebSocket ошибка:', error);
            setError('Ошибка соединения');
        };

        return () => {
            if (ws.readyState === WebSocket.OPEN) {
                ws.close();
            }
            endCall();
        };
    }, []);

    // Начало звонка
    const startCall = async () => {
        try {
            // Получаем медиапоток
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: true,
                video: isVideoEnabled
            });

            if (localVideoRef.current) {
                localVideoRef.current.srcObject = stream;
            }

            // Создаем PeerConnection
            const configuration = {
                iceServers: [
                    { urls: 'stun:stun.l.google.com:19302' },
                    { urls: 'stun:stun1.l.google.com:19302' }
                ]
            };

            const pc = new RTCPeerConnection(configuration);
            peerConnectionRef.current = pc;

            // Добавляем треки
            stream.getTracks().forEach(track => {
                pc.addTrack(track, stream);
            });

            // Обработка входящих треков
            pc.ontrack = (event) => {
                if (remoteVideoRef.current) {
                    remoteVideoRef.current.srcObject = event.streams[0];
                }
            };

            // Обработка ICE кандидатов
            pc.onicecandidate = (event) => {
                if (event.candidate) {
                    sendSignal('candidate', event.candidate);
                }
            };

            // Создаем и отправляем offer
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            sendSignal('offer', offer);

            setIsCalling(false);
            startTimer();

        } catch (error) {
            console.error('❌ Ошибка звонка:', error);
            setError('Не удалось получить доступ к микрофону/камере');
            onEndCall();
        }
    };

    // Отправка сигнала через WebSocket
    const sendSignal = (type, data) => {
        const user = JSON.parse(localStorage.getItem('chatUser'));
        if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({
                type: type,
                from: user.id,
                fromUsername: user.username,
                targetUserId: userId,
                data: data
            }));
        }
    };

    // Обработка входящих сигналов
    const handleSignaling = async (data) => {
        if (!peerConnectionRef.current) return;

        const pc = peerConnectionRef.current;

        try {
            switch (data.type) {
                case 'offer':
                    await pc.setRemoteDescription(new RTCSessionDescription(data.data));
                    const answer = await pc.createAnswer();
                    await pc.setLocalDescription(answer);
                    sendSignal('answer', answer);
                    setIsConnected(true);
                    break;

                case 'answer':
                    await pc.setRemoteDescription(new RTCSessionDescription(data.data));
                    setIsConnected(true);
                    break;

                case 'candidate':
                    if (data.data) {
                        await pc.addIceCandidate(new RTCIceCandidate(data.data));
                    }
                    break;

                case 'end':
                    endCall();
                    break;

                default:
                    console.log('📨 Неизвестный сигнал:', data.type);
            }
        } catch (error) {
            console.error('❌ Ошибка обработки сигнала:', error);
        }
    };

    // Таймер звонка
    const startTimer = () => {
        timerRef.current = setInterval(() => {
            setCallDuration(prev => prev + 1);
        }, 1000);
    };

    // Завершение звонка
    const endCall = () => {
        // Отправляем сигнал завершения
        sendSignal('end', {});

        if (peerConnectionRef.current) {
            peerConnectionRef.current.close();
            peerConnectionRef.current = null;
        }

        if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
        }

        // Останавливаем медиа
        if (localVideoRef.current?.srcObject) {
            localVideoRef.current.srcObject.getTracks().forEach(track => track.stop());
        }

        onEndCall();
    };

    // Управление звуком
    const toggleMute = () => {
        const stream = localVideoRef.current?.srcObject;
        if (stream) {
            stream.getAudioTracks().forEach(track => {
                track.enabled = !track.enabled;
            });
            setIsMuted(!isMuted);
        }
    };

    // Управление видео
    const toggleVideo = () => {
        const stream = localVideoRef.current?.srcObject;
        if (stream) {
            stream.getVideoTracks().forEach(track => {
                track.enabled = !track.enabled;
            });
            setIsVideoEnabled(!isVideoEnabled);
        }
    };

    // Форматирование времени
    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    if (error) {
        return (
            <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50">
                <div className="bg-white rounded-2xl p-8 max-w-sm text-center">
                    <div className="text-4xl mb-4">❌</div>
                    <h3 className="text-lg font-semibold mb-2">Ошибка звонка</h3>
                    <p className="text-gray-600">{error}</p>
                    <button
                        onClick={onEndCall}
                        className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                        Закрыть
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 bg-black bg-opacity-90 flex flex-col items-center justify-center z-50">
            <div className="relative w-full max-w-4xl h-full max-h-[600px] flex flex-col">
                {/* Видео собеседника */}
                <video
                    ref={remoteVideoRef}
                    autoPlay
                    playsInline
                    className={`flex-1 w-full bg-gray-900 rounded-2xl object-cover ${!isVideoEnabled ? 'hidden' : ''}`}
                />
                
                {!isVideoEnabled && (
                    <div className="flex-1 w-full bg-gray-900 rounded-2xl flex items-center justify-center">
                        <div className="text-white text-center">
                            <div className="text-6xl mb-4">🎤</div>
                            <div className="text-xl">{callee}</div>
                            <div className="text-sm opacity-75">Аудиозвонок</div>
                        </div>
                    </div>
                )}

                {/* Видео камера (маленькое окно) */}
                {isVideoEnabled && (
                    <video
                        ref={localVideoRef}
                        autoPlay
                        playsInline
                        muted
                        className="absolute bottom-28 right-4 w-32 h-40 bg-gray-800 rounded-xl object-cover border-2 border-white shadow-lg"
                    />
                )}

                {/* Информация о звонке */}
                <div className="absolute top-4 left-1/2 transform -translate-x-1/2 text-white text-center">
                    <div className="text-sm opacity-75">
                        {isConnected ? 'В разговоре' : isCalling ? 'Вызов...' : 'Подключение...'}
                    </div>
                    <div className="text-lg font-semibold">
                        {isConnected ? formatTime(callDuration) : callee}
                    </div>
                </div>

                {/* Кнопки управления */}
                <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-4">
                    <button
                        onClick={toggleMute}
                        className={`p-4 rounded-full transition ${
                            isMuted ? 'bg-red-500' : 'bg-gray-700'
                        } hover:bg-gray-600`}
                    >
                        {isMuted ? '🔇' : '🎤'}
                    </button>

                    {isVideo && (
                        <button
                            onClick={toggleVideo}
                            className={`p-4 rounded-full transition ${
                                !isVideoEnabled ? 'bg-red-500' : 'bg-gray-700'
                            } hover:bg-gray-600`}
                        >
                            {isVideoEnabled ? '📹' : '🚫📹'}
                        </button>
                    )}

                    <button
                        onClick={endCall}
                        className="p-4 bg-red-500 rounded-full hover:bg-red-600 transition"
                    >
                        📞
                    </button>
                </div>
            </div>
        </div>
    );
}

export default Call;
