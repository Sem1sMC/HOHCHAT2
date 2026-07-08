import React, { useState } from 'react';
import VoiceChannel from './VoiceChannel';

function VoiceChannels({ currentUser }) {
    const [channels] = useState([
        { id: 'general', name: '💬 Общий голосовой' },
        { id: 'gaming', name: '🎮 Игровой канал' },
        { id: 'music', name: '🎵 Музыкальный канал' }
    ]);

    return (
        <div className="bg-gray-900 p-4 rounded-xl">
            <h2 className="text-white font-semibold text-sm mb-3 flex items-center gap-2">
                🔊 Голосовые каналы
            </h2>
            <div className="space-y-2">
                {channels.map(channel => (
                    <VoiceChannel
                        key={channel.id}
                        channelId={channel.id}
                        channelName={channel.name}
                        currentUser={currentUser}
                    />
                ))}
            </div>
        </div>
    );
}

export default VoiceChannels;
