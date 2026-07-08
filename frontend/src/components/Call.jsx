import React, { useState, useRef, useEffect } from 'react';

function Call({ caller, callee, onEndCall }) {
    const [isCalling, setIsCalling] = useState(false);
    const [isConnected, setIsConnected] = useState(false);
    const [callDuration, setCallDuration] = useState(0);
    const [isMuted, setIsMuted] = useState(false);
    const [isVideoEnabled, setIsVideoEnabled] = useState(true);
    
    const localVideoRef = useRef(null);
    const remoteVideoRef = useRef(null);
    const peerConnectionRef = useRef(null);
    const timerRef = useRef(null);

    // Инициализация звонка
    useEffect(() => {
        if (isCalling) {
            startCall();
        }
        return () => {
            endCall();
        };
    }, [isCalling]);

    const startCall = async () => {
        try {
            // Получаем локальный поток
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: true,
                video: isVideoEnabled
            });

            if (localVideoRef.current) {
                localVideoRef.current.srcObject = stream;
            }

            // Создаем WebRTC соединение
            const configuration = {
                iceServers: [
                    { urls: 'stun:stun.l.google.com:19302' },
                    { urls: 'stun:stun1.l.google.com:19302' }
                ]
            };

            const peerConnection = new RTCPeerConnection(configuration);
            peerConnectionRef.current = peerConnection;

            // Добавляем треки
            stream.getTracks().forEach(track => {
                peerConnection.addTrack(track, stream);
            });

            // Обработка входящих треков
            peerConnection.ontrack = (event) => {
                if (remoteVideoRef.current) {
                    remoteVideoRef.current.srcObject = event.streams[0];
                }
            };

            // Создаем offer
            const offer = await peerConnection.createOffer();
            await peerConnection.setLocalDescription(offer);

            // Отправляем offer на сервер (через WebSocket или Signaling)
            // Здесь будет логика отправки сигнала

            setIsConnected(true);
            startTimer();

        } catch (error) {
            console.error('❌ Ошибка звонка:', error);
            alert('Не удалось начать звонок');
            onEndCall();
        }
    };

    const startTimer = () => {
        timerRef.current = setInterval(() => {
            setCallDuration(prev => prev + 1);
        }, 1000);
    };

    const endCall = () => {
        if (peerConnectionRef.current) {
            peerConnectionRef.current.close();
        }
        if (timerRef.current) {
            clearInterval(timerRef.current);
        }
        onEndCall();
    };

    const toggleMute = () => {
        const stream = localVideoRef.current?.srcObject;
        if (stream) {
            stream.getAudioTracks().forEach(track => {
                track.enabled = !track.enabled;
            });
            setIsMuted(!isMuted);
        }
    };

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

    return (
        <div className="fixed inset-0 bg-black bg-opacity-90 flex flex-col items-center justify-center z-50">
            <div className="relative w-full max-w-4xl h-full max-h-[600px] flex flex-col">
                {/* Видео собеседника */}
                <video
                    ref={remoteVideoRef}
                    autoPlay
                    playsInline
                    className="flex-1 w-full bg-gray-900 rounded-2xl object-cover"
                />
                
                {/* Видео камера (маленькое окно) */}
                <video
                    ref={localVideoRef}
                    autoPlay
                    playsInline
                    muted
                    className="absolute bottom-28 right-4 w-32 h-40 bg-gray-800 rounded-xl object-cover border-2 border-white shadow-lg"
                />

                {/* Информация о звонке */}
                <div className="absolute top-4 left-1/2 transform -translate-x-1/2 text-white text-center">
                    <div className="text-sm opacity-75">Звонок с {caller}</div>
                    <div className="text-lg font-semibold">{formatTime(callDuration)}</div>
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

                    <button
                        onClick={toggleVideo}
                        className={`p-4 rounded-full transition ${
                            !isVideoEnabled ? 'bg-red-500' : 'bg-gray-700'
                        } hover:bg-gray-600`}
                    >
                        {isVideoEnabled ? '📹' : '🚫📹'}
                    </button>

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
