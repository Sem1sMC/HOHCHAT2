import React from 'react';

function OnlineUsers({ users, currentUser }) {
    return (
        <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                <span className="w-2 h-2 bg-green-500 rounded-full inline-block"></span>
                Онлайн ({users.length})
            </h3>
            <div className="space-y-2">
                {users.map((user) => (
                    <div key={user.id} className="flex items-center gap-2 text-sm">
                        <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                        <span className="text-gray-700">
                            {user.id === currentUser?.id ? (
                                <span className="font-semibold text-blue-600">
                                    {user.username} (вы)
                                </span>
                            ) : (
                                user.username
                            )}
                        </span>
                    </div>
                ))}
                {users.length === 0 && (
                    <div className="text-sm text-gray-400">Нет пользователей онлайн</div>
                )}
            </div>
        </div>
    );
}

export default OnlineUsers;