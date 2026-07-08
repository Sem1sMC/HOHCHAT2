import React, { useState, useRef, useEffect } from 'react';

function MessageInput({ onSend }) {
    const [text, setText] = useState('');
    const [uploading, setUploading] = useState(false);
    const inputRef = useRef(null);
    const fileInputRef = useRef(null);

    useEffect(() => {
        inputRef.current?.focus();
    }, []);

    const handleSubmit = (e) => {
        e.preventDefault();
        if (text.trim()) {
            onSend(text);
            setText('');
            inputRef.current?.focus();
        }
    };

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (file.size > 50 * 1024 * 1024) {
            alert('Файл слишком большой. Максимальный размер 50MB');
            return;
        }

        setUploading(true);
        await onSend('', file);
        setUploading(false);
        fileInputRef.current.value = '';
    };

    const triggerFileUpload = (accept) => {
        fileInputRef.current.accept = accept;
        fileInputRef.current.click();
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSubmit(e);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="flex flex-col gap-2">
            <div className="flex gap-1 sm:gap-2 items-center">
                {/* Кнопки для мобильных устройств */}
                <div className="flex gap-0.5 sm:gap-1 flex-shrink-0">
                    <button
                        type="button"
                        onClick={() => triggerFileUpload('image/*')}
                        className="p-1.5 sm:p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition text-base sm:text-lg"
                        title="Фото"
                    >
                        🖼️
                    </button>
                    <button
                        type="button"
                        onClick={() => triggerFileUpload('video/*')}
                        className="p-1.5 sm:p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition text-base sm:text-lg"
                        title="Видео"
                    >
                        🎥
                    </button>
                    <button
                        type="button"
                        onClick={() => triggerFileUpload('audio/*')}
                        className="p-1.5 sm:p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition text-base sm:text-lg"
                        title="Аудио"
                    >
                        🎵
                    </button>
                    <button
                        type="button"
                        onClick={() => triggerFileUpload('image/gif')}
                        className="p-1.5 sm:p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition text-xs sm:text-sm font-bold"
                        title="GIF"
                    >
                        GIF
                    </button>
                </div>

                <input
                    ref={fileInputRef}
                    type="file"
                    onChange={handleFileUpload}
                    className="hidden"
                />

                <input
                    ref={inputRef}
                    type="text"
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={uploading ? 'Загрузка файла...' : 'Напишите сообщение...'}
                    disabled={uploading}
                    className="flex-1 px-3 sm:px-4 py-1.5 sm:py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 min-w-0"
                />

                <button
                    type="submit"
                    disabled={!text.trim() || uploading}
                    className="px-4 sm:px-6 py-1.5 sm:py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed font-medium text-sm sm:text-base flex-shrink-0"
                >
                    ➤
                </button>
            </div>
            {uploading && (
                <div className="text-xs sm:text-sm text-blue-600 animate-pulse">
                    ⏳ Загрузка файла...
                </div>
            )}
        </form>
    );
}

export default MessageInput;