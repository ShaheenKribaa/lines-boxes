import React, { useState, useEffect } from 'react';
import { socket } from '../socket';
import { useGameStore } from '../store';
import { SocketEvent } from '../../../shared/types';
import './FriendSystem.css'; // We'll create this later

export function FriendSystem() {
    const {
        session,
        friends,
        friendRequests,
        searchResults,
        room
    } = useGameStore();

    const [isOpen, setIsOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<'friends' | 'requests' | 'search'>('friends');
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(false);

    // Reset loading when results change
    useEffect(() => {
        setLoading(false);
    }, [searchResults]);

    // Initial data fetch
    useEffect(() => {
        if (session && isOpen) {
            socket.emit(SocketEvent.GET_FRIENDS);
            socket.emit(SocketEvent.GET_FRIEND_REQUESTS);
        }
    }, [session, isOpen]);

    // Handle search
    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        if (!searchQuery.trim()) return;
        setLoading(true);
        socket.emit(SocketEvent.SEARCH_PLAYERS, searchQuery);
    };

    // Listeners are global in App.tsx, so we just update store there.
    // However, we might want to listen to local search results here or use store.
    // We already put searchResults in store.

    const sendRequest = (userId: string) => {
        socket.emit(SocketEvent.SEND_FRIEND_REQUEST, userId);
    };

    const acceptRequest = (requestId: string) => {
        socket.emit(SocketEvent.ACCEPT_FRIEND_REQUEST, requestId);
    };

    const declineRequest = (requestId: string) => {
        socket.emit(SocketEvent.DECLINE_FRIEND_REQUEST, requestId);
    };

    const inviteFriend = (friendId: string) => {
        if (!room) return;
        socket.emit(SocketEvent.INVITE_TO_ROOM, { friendId, roomCode: room.code });
        // Optional: Show toast "Invitation sent"
    };

    if (!session) return null; // Only show if logged in

    return (
        <>
            {/* Floating Toggle Button */}
            <button
                className={`friend-system-toggle ${friendRequests.length > 0 ? 'has-notifications' : ''}`}
                onClick={() => setIsOpen(!isOpen)}
            >
                👥
                {friendRequests.length > 0 && <span className="notification-badge">{friendRequests.length}</span>}
            </button>

            {/* Side Panel */}
            {isOpen && (
                <div className="friend-system-panel">
                    <div className="friend-system-header">
                        <h3>Social</h3>
                        <button className="close-btn" onClick={() => setIsOpen(false)}>×</button>
                    </div>

                    <div className="friend-system-tabs">
                        <button
                            className={activeTab === 'friends' ? 'active' : ''}
                            onClick={() => setActiveTab('friends')}
                        >
                            Friends
                        </button>
                        <button
                            className={activeTab === 'requests' ? 'active' : ''}
                            onClick={() => setActiveTab('requests')}
                        >
                            Requests
                            {friendRequests.length > 0 && <span className="tab-badge">{friendRequests.length}</span>}
                        </button>
                        <button
                            className={activeTab === 'search' ? 'active' : ''}
                            onClick={() => setActiveTab('search')}
                        >
                            Search
                        </button>
                    </div>

                    <div className="friend-system-content">
                        {/* FRIENDS TAB */}
                        {activeTab === 'friends' && (
                            <div className="friends-list">
                                {friends.length === 0 ? (
                                    <div className="empty-state">No friends yet. Search to add some!</div>
                                ) : (
                                    friends.map(friend => (
                                        <div key={friend.id} className="friend-item">
                                            <div className="friend-info">
                                                <div className={`status-dot ${friend.is_online ? 'online' : 'offline'}`} />
                                                <span className="friend-name">{friend.display_name}</span>
                                            </div>
                                            {room && room.hostId === socket.id && friend.is_online && (
                                                <button
                                                    className="invite-btn"
                                                    onClick={() => inviteFriend(friend.id)}
                                                >
                                                    Invite
                                                </button>
                                            )}
                                        </div>
                                    ))
                                )}
                            </div>
                        )}

                        {/* REQUESTS TAB */}
                        {activeTab === 'requests' && (
                            <div className="requests-list">
                                {friendRequests.length === 0 ? (
                                    <div className="empty-state">No pending requests</div>
                                ) : (
                                    friendRequests.map(req => (
                                        <div key={req.id} className="request-item">
                                            <div className="request-info">
                                                <span className="request-name">{req.from_user.display_name}</span>
                                            </div>
                                            <div className="request-actions">
                                                <button className="accept-btn" onClick={() => acceptRequest(req.id)}>✓</button>
                                                <button className="decline-btn" onClick={() => declineRequest(req.id)}>✗</button>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        )}

                        {/* SEARCH TAB */}
                        {activeTab === 'search' && (
                            <div className="search-tab">
                                <form onSubmit={handleSearch} className="search-form">
                                    <input
                                        type="text"
                                        placeholder="Search username..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                    />
                                    <button type="submit" disabled={loading}>
                                        {loading ? '...' : '🔍'}
                                    </button>
                                </form>
                                <div className="search-results">
                                    {searchResults.map(user => {
                                        const isFriend = friends.some(f => f.id === user.id);
                                        const isSelf = user.id === session.user?.id;
                                        // Also check if request already sent? Store doesn't have "sent requests" easily accessible yet,
                                        // but we can just let backend handle error or add state later.

                                        return (
                                            <div key={user.id} className="search-item">
                                                <span>{user.display_name}</span>
                                                {!isFriend && !isSelf && (
                                                    <button onClick={() => sendRequest(user.id)} className="add-friend-btn">
                                                        Add
                                                    </button>
                                                )}
                                                {isFriend && <span className="is-friend-badge">Friend</span>}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </>
    );
}
