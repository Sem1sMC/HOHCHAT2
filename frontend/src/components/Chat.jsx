import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import MessageList from './MessageList';
import MessageInput from './MessageInput';
import OnlineUsers from './OnlineUsers';

const API_URL = 'https://hohchat.onrender.com/api';

function Chat() {
    const { user, logout } = useAuth();
    const [messages, setMessages] = useState([]);
    const [loading, setLoading] = useState(true);
    const [lastTimestamp, setLastTimestamp] = useState(null);
    const [onlineUsers, setOnlineUsers] = useState([]);
    const [showScrollButton, setShowScrollButton] = useState(false);
    const [isAtBottom, setIsAtBottom] = useState(true);
    
    const messagesEndRef = useRef(null);
    const messagesContainerRef = useRef(null);

    // Загрузка сообщений
    const loadMessages = async () => {
        try {
            console.log('📋 Загрузка сообщений...');
            const response = await axios.get(`${API_URL}/messages`, {
                params: { limit: 100 }
            });
            const data = response.data;
            console.log(`✅ Загружено ${data.length} сообщений`);
            setMessages(data);
            if (data.length > 0) {
                setLastTimestamp(data[data.length - 1].created_at);
            }
            setLoading(false);
            setTimeout(scrollToBottom, 100);
        } catch (error) {
            console.error('❌ Ошибка загрузки сообщений:', error);
            setLoading(false);
        }
    };

    // Проверка новых сообщений
    const checkNewMessages = async () => {
        if (!lastTimestamp) return;
        
        try {
            const response = await axios.get(`${API_URL}/messages/since/${lastTimestamp}`);
            const newMessages = response.data;
            
            if (newMessages.length > 0) {
                console.log(`📨 Получено ${newMessages.length} новых сообщений`);
                setMessages(prev => [...prev, ...newMessages]);
                setLastTimestamp(newMessages[newMessages.length - 1].created_at);
                
                if (isAtBottom) {
                    setTimeout(scrollToBottom, 100);
                }
            }
        } catch (error) {
            console.error('❌ Ошибка проверки новых сообщений:', error);
        }
    };

    // Прокрутка вниз
    const scrollToBottom = () => {
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
        }
    };

    // Обработка скролла
    const handleScroll = () => {
        if (!messagesContainerRef.current) return;
        
        const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
        const bottom = scrollHeight - scrollTop - clientHeight;
        
        setIsAtBottom(bottom < 50);
        setShowScrollButton(bottom > 200);
    };

    // Отправка сообщения (ИСПРАВЛЕННАЯ ВЕРСИЯ)
    const sendMessage = async (text, media = null) => {
        try {
            console.log('📤 Отправка сообщения...');
            console.log('👤 Пользователь:', user);
            console.log('📝 Текст:', text);
            console.log('🖼️ Медиа:', media);

            // ✅ ПРОВЕРКА: есть ли пользователь
            if (!user) {
                alert('❌ Ошибка: пользователь не авторизован');
                return;
            }

            let mediaUrl = null;
            let mediaType = null;
            let fileName = null;
            let fileSize = null;

            if (media) {
                console.log('📤 Загрузка файла...');
                const formData = new FormData();
                formData.append('file', media);

                const uploadResponse = await axios.post(`${API_URL}/upload`, formData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });

                mediaUrl = uploadResponse.data.url;
                mediaType = uploadResponse.data.mediaType;
                fileName = uploadResponse.data.fileName;
                fileSize = uploadResponse.data.fileSize;
                console.log('✅ Файл загружен:', fileName);
            }

            // ✅ ГАРАНТИРУЕМ, что username есть
            const finalUsername = user.username || user.email?.split('@')[0] || 'anonymous';
            const finalUserId = user.id;

            if (!finalUserId) {
                alert('❌ Ошибка: ID пользователя не найден');
                return;
            }

            const messageData = {
                user_id: finalUserId,
                username: finalUsername,
                text: text || '',
                media_url: mediaUrl,
                media_type: mediaType,
                file_name: fileName,
                file_size: fileSize
            };

            console.log('📦 Отправляемые данные:', messageData);

            const response = await axios.post(`${API_URL}/messages`, messageData);
            console.log('✅ Успешно отправлено:', response.data);
            
            await loadMessages();
            
            // Прокручиваем вниз после отправки
            setTimeout(scrollToBottom, 100);
        } catch (error) {
            console.error('❌ Ошибка отправки:', error);
            console.error('❌ Ответ сервера:', error.response?.data);
            console.error('❌ Статус:', error.response?.status);
            alert(`Не удалось отправить сообщение: ${error.response?.data?.error || error.message}`);
        }
    };

    // Загрузка онлайн пользователей
    const loadOnlineUsers = async () => {
        try {
            const response = await axios.get(`${API_URL}/users/online`);
            setOnlineUsers(response.data);
        } catch (error) {
            console.error('❌ Ошибка загрузки онлайн пользователей:', error);
        }
    };

    // Инициализация
    useEffect(() => {
        console.log('🔄 Инициализация чата...');
        console.log('👤 Текущий пользователь:', user);
        loadMessages();
        loadOnlineUsers();
        
        const updateStatus = setInterval(() => {
            if (user) {
                axios.put(`${API_URL}/user/status`, {
                    user_id: user.id,
                    status: 'online'
                }).catch(console.error);
            }
        }, 30000);

        return () => clearInterval(updateStatus);
    }, []);

    // Polling для новых сообщений
    useEffect(() => {
        if (!lastTimestamp) return;
        
        const messageInterval = setInterval(checkNewMessages, 2000);
        const userInterval = setInterval(loadOnlineUsers, 5000);
        
        return () => {
            clearInterval(messageInterval);
            clearInterval(userInterval);
        };
    }, [lastTimestamp]);

    const handleLogout = async () => {
        await logout();
        window.location.href = '/login';
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-gray-500">Загрузка сообщений...</div>
            </div>
        );
    }

    return (
        <div className="h-screen flex flex-col bg-gray-50">
            {/* Шапка */}
            <header className="bg-white shadow-sm border-b border-gray-200 px-4 py-3 flex-shrink-0">
                <div className="max-w-6xl mx-auto flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        <span className="text-2xl">💬</span>
                        <h1 className="text-lg sm:text-xl font-semibold text-gray-800">Общий чат</h1>
                    </div>
                    <div className="flex items-center gap-2 sm:gap-4">
                        <span className="text-xs sm:text-sm text-gray-600">👤 {user?.username || user?.email || 'Пользователь'}</span>
                        <button
                            onClick={handleLogout}
                            className="text-xs sm:text-sm text-red-500 hover:text-red-700 transition"
                        >
                            Выйти
                        </button>
                    </div>
                </div>
            </header>

            {/* Основная часть */}
            <div className="flex-1 flex flex-col md:flex-row overflow-hidden max-w-6xl w-full mx-auto">
                {/* Сообщения */}
                <div className="flex-1 flex flex-col overflow-hidden relative">
                    <div 
                        ref={messagesContainerRef}
                        onScroll={handleScroll}
                        className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-2"
                    >
                        <MessageList messages={messages} currentUser={user?.username} />
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Кнопка прокрутки вниз */}
                    {showScrollButton && (
                        <button
                            onClick={scrollToBottom}
                            className="absolute bottom-20 left-1/2 transform -translate-x-1/2 bg-blue-600 text-white rounded-full p-2 shadow-lg hover:bg-blue-700 transition-all duration-200 z-10"
                            style={{
                                width: '44px',
                                height: '44px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                            </svg>
                        </button>
                    )}

                    {/* Поле ввода */}
                    <div className="flex-shrink-0 p-3 sm:p-4 bg-white border-t border-gray-200">
                        <MessageInput onSend={sendMessage} />
                    </div>
                </div>

                {/* Онлайн пользователи - скрываем на мобильных */}
                <div className="hidden md:block md:w-64 bg-white border-l border-gray-200 p-4 overflow-y-auto">
                    <OnlineUsers users={onlineUsers} currentUser={user} />
                </div>
            </div>
        </div>
    );
}

export default Chat;
