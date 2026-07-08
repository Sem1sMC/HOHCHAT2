import React, { useState } from 'react';
import Call from './Call';

function OnlineUsers({ users, currentUser }) {
    const [callState, setCallState] = useState(null);

    const startCall = (user, isVideo = false) => {
        setCallState({
            caller: currentUser?.username || 'Вы',
            callee: user.username,
            userId: user.id,
            isVideo: isVideo
        });
    };

    const endCall = () => {
        setCallState(null);
    };

    return (
        <>
            <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                    <span className="w-2 h-2 bg-green-500 rounded-full inline-block"></span>
                    Онлайн ({users.length})
                </h3>
                <div className="space-y-2">
                    {users.map((user) => (
                        <div key={user.id} className="flex items-center justify-between gap-2 text-sm">
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                                <span className="w-2 h-2 bg-green-500 rounded-full flex-shrink-0"></span>
                                <span className="text-gray-700 truncate">
                                    {user.id === currentUser?.id ? (
                                        <span className="font-semibold text-blue-600">
                                            {user.username} (вы)
                                        </span>
                                    ) : (
                                        user.username
                                    )}
                                </span>
                            </div>
                            
                            {/* Кнопки звонка (только не для себя) */}
                            {user.id !== currentUser?.id && (
                                <div className="flex gap-1 flex-shrink-0">
                                    <button
                                        onClick={() => startCall(user, false)}
                                        className="p-1.5 text-sm hover:bg-green-50 rounded-lg transition"
                                        title="Голосовой звонок"
                                    >
                                        🎤
                                    </button>
                                    <button
                                        onClick={() => startCall(user, true)}
                                        className="p-1.5 text-sm hover:bg-blue-50 rounded-lg transition"
                                        title="Видеозвонок"
                                    >
                                        📹
                                    </button>
                                </div>
                            )}
                        </div>
                    ))}
                    {users.length === 0 && (
                        <div className="text-sm text-gray-400">Нет пользователей онлайн</div>
                    )}
                </div>
            </div>

            {/* Компонент звонка */}
            {callState && (
                <Call
                    caller={callState.caller}
                    callee={callState.callee}
                    userId={callState.userId}
                    isVideo={callState.isVideo}
                    onEndCall={endCall}
                />
            )}
        </>
    );
}

export default OnlineUsers;
