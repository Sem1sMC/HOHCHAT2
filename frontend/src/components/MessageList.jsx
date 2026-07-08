import React from 'react';

function MessageList({ messages, currentUser }) {
    if (messages.length === 0) {
        return (
            <div className="text-center text-gray-400 py-8 text-sm sm:text-base">
                Нет сообщений. Напишите что-нибудь!
            </div>
        );
    }

    const renderMedia = (msg) => {
        if (!msg.media_url) return null;

        switch (msg.media_type) {
            case 'image':
            case 'gif':
                return (
                    <img 
                        src={msg.media_url} 
                        alt={msg.file_name || 'Изображение'}
                        className="max-w-full max-h-64 sm:max-h-96 rounded-lg mt-1"
                        loading="lazy"
                    />
                );
            case 'video':
                return (
                    <video 
                        controls 
                        className="max-w-full max-h-64 sm:max-h-96 rounded-lg mt-1"
                        preload="metadata"
                    >
                        <source src={msg.media_url} />
                        Ваш браузер не поддерживает видео
                    </video>
                );
            case 'audio':
                return (
                    <audio 
                        controls 
                        className="w-full mt-1"
                    >
                        <source src={msg.media_url} />
                        Ваш браузер не поддерживает аудио
                    </audio>
                );
            default:
                return null;
        }
    };

    return (
        <>
            {messages.map((msg) => {
                const isOwn = msg.username === currentUser;
                
                return (
                    <div
                        key={msg.id}
                        className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
                    >
                        <div
                            className={`max-w-[85%] sm:max-w-[70%] px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg ${
                                isOwn
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-white text-gray-800 shadow-sm border border-gray-200'
                            }`}
                        >
                            {!isOwn && (
                                <div className="text-xs font-semibold text-blue-600 mb-0.5 sm:mb-1">
                                    {msg.username}
                                </div>
                            )}
                            {msg.text && (
                                <div className="break-words text-sm sm:text-base">{msg.text}</div>
                            )}
                            {renderMedia(msg)}
                            {msg.file_name && (
                                <div className="text-xs opacity-75 mt-1">
                                    📎 {msg.file_name}
                                    {msg.file_size && ` (${(msg.file_size / 1024).toFixed(1)} KB)`}
                                </div>
                            )}
                            <div
                                className={`text-xs mt-0.5 sm:mt-1 ${
                                    isOwn ? 'text-blue-200' : 'text-gray-400'
                                }`}
                            >
                                {new Date(msg.created_at).toLocaleTimeString('ru-RU', {
                                    hour: '2-digit',
                                    minute: '2-digit'
                                })}
                            </div>
                        </div>
                    </div>
                );
            })}
        </>
    );
}

export default MessageList;