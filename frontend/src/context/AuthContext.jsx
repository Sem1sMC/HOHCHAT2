import React, { createContext, useState, useContext, useEffect } from 'react';
import axios from 'axios';

const API_URL = 'http://localhost:5000/api';

const AuthContext = createContext();

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const storedUser = localStorage.getItem('chatUser');
        if (storedUser) {
            setUser(JSON.parse(storedUser));
        }
        setLoading(false);
    }, []);

    const login = async (email, password) => {
        try {
            const response = await axios.post(`${API_URL}/auth/login`, {
                email,
                password
            });
            
            const userData = response.data.user;
            setUser(userData);
            localStorage.setItem('chatUser', JSON.stringify(userData));
            localStorage.setItem('accessToken', response.data.session.access_token);
            
            return { success: true };
        } catch (error) {
            return { success: false, error: error.response?.data?.error || 'Login failed' };
        }
    };

    const register = async (email, password, username) => {
        try {
            const response = await axios.post(`${API_URL}/auth/register`, {
                email,
                password,
                username
            });
            
            return { success: true, user: response.data.user };
        } catch (error) {
            return { success: false, error: error.response?.data?.error || 'Registration failed' };
        }
    };

    const logout = async () => {
        if (user) {
            try {
                await axios.post(`${API_URL}/auth/logout`, { user_id: user.id });
            } catch (error) {
                console.error('Logout error:', error);
            }
        }
        
        setUser(null);
        localStorage.removeItem('chatUser');
        localStorage.removeItem('accessToken');
    };

    const value = {
        user,
        loading,
        login,
        register,
        logout
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}